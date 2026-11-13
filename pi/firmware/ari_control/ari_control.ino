// Ari la Cotorra - firmware de control por USB (Raspberry Pi -> Arduino UNO / Keyestudio PLUS)
//
// Mismo cableado y rango que el sketch original (pi/firmware/ari_original):
//   pin 9  = ala derecha, pin 10 = ala izquierda (espejo 90 - x), pin 11 = pico
//   rango probado 30..60 grados, velocidad 1 grado cada 15 ms.
//
// Seguridad:
//   - Al arrancar (y cada vez que se abre el puerto serie, que reinicia la placa) NO se mueve nada:
//     los servos quedan sueltos hasta recibir una orden de movimiento.
//   - PARAR suelta los servos al instante.
//   - Los gestos con duracion terminan solos y vuelven al reposo.
//   - Los estados continuos (STATE ...) vuelven al reposo si no llega ninguna linea en 3 s (watchdog).
//   - En reposo, tras 1 s quieto, se sueltan los servos (sin par ni consumo).
//
// Protocolo: 115200 baudios, una orden por linea (\n). Respuesta "ACK <orden>" o "ERR <orden>".
//   Espanol:  PARAR | REPOSO | ALETEAR [ms] | SALUDAR | PICO [ms] (solo pico) | HABLAR [ms] (pico + alas suaves + senal ocasional) | SENAL (un ala rapida) | ESCUCHAR | PENSAR | SENALAR | ALAS [min max] | ESTADO | PING
//   Puente:   PING | STATE <idle|offline|welcome|listening|thinking|speaking|handoff_qr|error|maintenance>
//             GESTURE <rest|wave|attentive|ponder|talk|point|stop>

#include <Servo.h>

const byte PIN_ALA_DER = 9, PIN_ALA_IZQ = 10, PIN_PICO = 11;
const int LO = 30, HI = 60;     // pico (rango probado)
// Alas: rango ajustable en caliente con ALAS <min> <max> (0..90 por el espejo 90 - x del ala izquierda).
int aLo = 30, aHi = 60;
const unsigned long PASO_MS = 15, WATCHDOG_MS = 3000, SOLTAR_MS = 1000;
const unsigned long DUR_DEF = 3000, DUR_MAX = 15000;

Servo alaDer, alaIzq, pico;
bool sujetos = false;

int ala = LO, pic = LO;          // posicion logica actual
int alaObj = LO, picObj = LO;    // objetivo cuando no oscila
bool alaOsc = false, picOsc = false;
int alaDir = 1, picDir = 1;
int alaTope = HI;                // limite superior del aleteo (hablar usa uno mas suave)
byte alaCada = 1, tick = 0;      // el ala avanza 1 grado cada alaCada pasos de 15 ms
// Senal: el ala derecha se separa del aleteo, se extiende rapido (3 grados/15 ms), aguanta y vuelve.
int der = LO;                    // posicion real del ala derecha
bool senalAuto = false;          // hablando: senalar de vez en cuando
bool senalFija = false;          // SENALAR: ala derecha extendida mientras dure
bool senalActiva = false;
unsigned long senalFin = 0, proximaSenal = 0;
const int SENAL_VEL = 3;
const unsigned long SENAL_AGUANTE = 700;
unsigned long hasta = 0;         // fin del gesto (0 = sin fin)
bool continuo = false;           // sujeto a watchdog
bool reposo = true;
const char *modo = "suelto";

unsigned long ultimoMsg = 0, ultimoPaso = 0, quietoDesde = 0;
char entrada[48];
byte largo = 0;
bool descartando = false;

void escribir() {
  alaDer.write(der);
  alaIzq.write(90 - ala);
  pico.write(pic);
}

void sujetar() {
  if (sujetos) return;
  alaDer.attach(PIN_ALA_DER);
  alaIzq.attach(PIN_ALA_IZQ);
  pico.attach(PIN_PICO);
  sujetos = true;
  escribir();
}

void soltar() {
  if (!sujetos) return;
  alaDer.detach(); alaIzq.detach(); pico.detach();
  sujetos = false;
}

void parar() {
  soltar();
  alaOsc = picOsc = false;
  senalAuto = senalFija = senalActiva = false;
  hasta = 0; continuo = false; reposo = true;
  modo = "suelto";
}

void irReposo() {
  alaOsc = picOsc = false;
  senalAuto = senalFija = false;   // una senal en curso termina y el ala vuelve sola
  alaObj = aLo; picObj = LO;
  hasta = 0; continuo = false; reposo = true;
  quietoDesde = 0;
  modo = "reposo";
  if (!sujetos && ala == aLo && pic == LO && der == aLo) return; // ya esta en reposo y suelto: no tocar
  sujetar();
}

void mover(const char *nombre, bool aOsc, int aObj, bool pOsc, int pObj, unsigned long dur, bool esContinuo) {
  alaOsc = aOsc; alaObj = aObj;
  alaTope = aHi; alaCada = 1;
  senalAuto = senalFija = false;
  picOsc = pOsc; picObj = pObj;
  hasta = dur ? millis() + dur : 0;
  continuo = esContinuo;
  reposo = false;
  modo = nombre;
  sujetar();
}

// Hablar: el pico abre y cierra en todo su rango y las alas aletean 30..60 a media velocidad.
void hablar(unsigned long dur, bool esContinuo) {
  mover("hablar", true, aLo, true, LO, dur, esContinuo);
  alaTope = aHi; alaCada = 2;   // rango completo de las alas a media velocidad
  senalAuto = true;
  proximaSenal = millis() + random(2500, 5000);
}

void senalar(bool fija, unsigned long dur, bool esContinuo) {
  mover("senalar", false, aLo, false, LO, dur, esContinuo);
  senalFija = fija;
  senalActiva = true;
  senalFin = millis() + (fija ? 0 : SENAL_AGUANTE);
}

unsigned long duracion(const char *arg) {
  if (!arg || !*arg) return DUR_DEF;
  long v = atol(arg);
  if (v < 200) v = 200;
  if (v > (long)DUR_MAX) v = DUR_MAX;
  return (unsigned long)v;
}

bool es(const char *a, const char *b) { return strcmp(a, b) == 0; }

bool orden(char *linea) {
  for (char *p = linea; *p; p++) if (*p >= 'a' && *p <= 'z') *p -= 32;
  char *arg = strchr(linea, ' ');
  if (arg) { *arg++ = 0; while (*arg == ' ') arg++; }

  if (es(linea, "PING")) return true;
  if (es(linea, "ESTADO")) return true;

  if (es(linea, "STATE") && arg) {
    if (es(arg, "IDLE") || es(arg, "OFFLINE") || es(arg, "MAINTENANCE")) { irReposo(); return true; }
    if (es(arg, "ERROR")) { parar(); return true; }
    if (es(arg, "WELCOME")) { mover("saludar", true, aLo, false, LO, 2000, false); return true; }
    if (es(arg, "LISTENING")) { mover("escuchar", false, aLo + (aHi - aLo) / 3, false, LO, 0, true); return true; }
    if (es(arg, "THINKING")) { mover("pensar", false, aLo, false, 40, 0, true); return true; }
    if (es(arg, "SPEAKING")) { hablar(0, true); return true; }
    if (es(arg, "HANDOFF_QR")) { senalar(true, 0, true); return true; }
    return false;
  }
  if (es(linea, "GESTURE") && arg) {
    if (es(arg, "REST")) { irReposo(); return true; }
    if (es(arg, "STOP")) { parar(); return true; }
    if (es(arg, "WAVE")) { mover("saludar", true, aLo, false, LO, 2000, false); return true; }
    if (es(arg, "ATTENTIVE")) { mover("escuchar", false, aLo + (aHi - aLo) / 3, false, LO, 0, true); return true; }
    if (es(arg, "PONDER")) { mover("pensar", false, aLo, false, 40, 0, true); return true; }
    if (es(arg, "TALK")) { hablar(0, true); return true; }
    if (es(arg, "POINT")) { senalar(true, 0, true); return true; }
    return false;
  }

  if (es(linea, "PARAR") || es(linea, "STOP")) { parar(); return true; }
  if (es(linea, "REPOSO")) { irReposo(); return true; }
  if (es(linea, "ALETEAR")) { mover("aletear", true, aLo, false, LO, duracion(arg), false); return true; }
  if (es(linea, "SALUDAR")) { mover("saludar", true, aLo, true, LO, 2500, false); return true; }
  if (es(linea, "HABLAR")) { hablar(duracion(arg), false); return true; }
  if (es(linea, "PICO")) { mover("pico", false, aLo, true, LO, duracion(arg), false); return true; }
  if (es(linea, "SENAL")) { senalar(false, 1500, false); return true; }
  if (es(linea, "ESCUCHAR")) { mover("escuchar", false, aLo + (aHi - aLo) / 3, false, LO, 0, true); return true; }
  if (es(linea, "PENSAR")) { mover("pensar", false, aLo, false, 40, 0, true); return true; }
  if (es(linea, "SENALAR")) { senalar(true, 0, true); return true; }
  if (es(linea, "ALAS")) {
    // ALAS <min> <max>: cambia el rango de las alas (no se guarda al reiniciar). Sin argumentos solo informa.
    if (arg && *arg) {
      char *fin; long lo = strtol(arg, &fin, 10), hi = strtol(fin, NULL, 10);
      if (lo < 0 || hi > 90 || hi - lo < 10) return false;
      aLo = lo; aHi = hi;
      irReposo();
    }
    Serial.print("ALAS "); Serial.print(aLo); Serial.print(" "); Serial.println(aHi);
    return true;
  }
  return false;
}

void procesar(char *linea) {
  char copia[48];
  strncpy(copia, linea, sizeof(copia)); copia[sizeof(copia) - 1] = 0;
  ultimoMsg = millis();
  bool ok = orden(linea);
  Serial.print(ok ? "ACK " : "ERR ");
  Serial.println(copia);
  if (ok && strncmp(copia, "ESTADO", 6) == 0) {
    Serial.print("ESTADO "); Serial.print(modo);
    Serial.print(" ala="); Serial.print(ala);
    Serial.print(" alaDer="); Serial.print(der);
    Serial.print(" pico="); Serial.print(pic);
    Serial.print(" servos="); Serial.println(sujetos ? "sujetos" : "sueltos");
  }
}

int pasoHacia(int actual, int objetivo) {
  if (actual < objetivo) return actual + 1;
  if (actual > objetivo) return actual - 1;
  return actual;
}

void setup() {
  // Nada se mueve aqui: los servos no se conectan hasta la primera orden de movimiento.
  Serial.begin(115200);
  randomSeed(analogRead(A0));
  ultimoMsg = millis();
  // Causa del ultimo reinicio (diagnostico de caidas de voltaje): bits PORF=1 EXTRF=2 BORF=4 WDRF=8.
  byte causa = MCUSR; MCUSR = 0;
  Serial.print("ARI LISTO reinicio="); Serial.println(causa);
}

void loop() {
  unsigned long ahora = millis();

  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      if (!descartando && largo) { entrada[largo] = 0; procesar(entrada); }
      largo = 0; descartando = false;
    } else if (c < 32 || c > 126) {
      // Byte no imprimible (ruido electrico en RX): se descarta la linea entera.
      if (c != '\r') { descartando = true; largo = 0; }
    } else if (!descartando) {
      if (largo < sizeof(entrada) - 1) entrada[largo++] = c;
      else { descartando = true; largo = 0; }
    }
  }

  if (!reposo && hasta && (long)(ahora - hasta) >= 0) irReposo();
  if (!reposo && continuo && ahora - ultimoMsg > WATCHDOG_MS) irReposo();

  if (sujetos && ahora - ultimoPaso >= PASO_MS) {
    ultimoPaso = ahora;
    tick++;
    if (alaOsc) {
      if (tick % alaCada == 0) { ala += alaDir; if (ala >= alaTope) alaDir = -1; if (ala <= aLo) alaDir = 1; }
      if (ala > alaTope) { ala = alaTope; alaDir = -1; }
    }
    else ala = pasoHacia(ala, alaObj);
    if (picOsc) { pic += picDir; if (pic >= HI) picDir = -1; if (pic <= LO) picDir = 1; }
    else pic = pasoHacia(pic, picObj);

    // Ala derecha: sigue al aleteo salvo durante una senal.
    if (senalAuto && !senalActiva && (long)(ahora - proximaSenal) >= 0) { senalActiva = true; senalFin = ahora + SENAL_AGUANTE; }
    if (senalActiva) {
      if (senalFija || (long)(ahora - senalFin) < 0) der = min(der + SENAL_VEL, aHi);  // extender y aguantar
      else {
        der = der > ala ? max(der - SENAL_VEL, ala) : ala;
        if (der == ala) { senalActiva = false; proximaSenal = ahora + random(4000, 9000); }
      }
    } else der = ala;
    der = constrain(der, aLo, aHi);
    ala = constrain(ala, aLo, aHi);
    pic = constrain(pic, LO, HI);
    escribir();

    if (reposo && ala == aLo && pic == LO && der == aLo) {
      if (!quietoDesde) quietoDesde = ahora;
      else if (ahora - quietoDesde >= SOLTAR_MS) { soltar(); modo = "reposo"; }
    }
  }
}
