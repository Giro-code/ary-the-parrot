// Sketch original de Ari (copiado del usuario el 2026-11-13, antes de cargar ari_control).
// Pines: 9 = ala derecha, 10 = ala izquierda, 11 = pico ("tercer servo").
// Copia binaria leida de la placa: flash-backup-20261113.hex (restaurar con avrdude -U flash:w:...:i).
#include <Servo.h>

Servo myservo;    // Ala derecha
Servo myservo1;   // Ala izquierda
Servo myservo2;   // Tercer servo

// Posiciones de las alas
int pos = 30;
int direccion = 1;

// Posiciones del tercer servo
int pos2 = 30;
int direccion2 = 1;

// Control de tiempo
unsigned long tiempoInicio = 0;
unsigned long tiempoAnteriorAlas = 0;
unsigned long tiempoAnteriorServo3 = 0;

bool alasActivas = false;

void setup() {
  myservo.attach(9);
  myservo1.attach(10);
  myservo2.attach(11);

  // Posiciones iniciales
  myservo.write(50);
  myservo1.write(40);
  myservo2.write(30);

  tiempoInicio = millis();
}

void loop() {

  unsigned long tiempoActual = millis();

  // TERCER SERVO: movimiento constante
  if (tiempoActual - tiempoAnteriorServo3 >= 15) {
    tiempoAnteriorServo3 = tiempoActual;

    pos2 += direccion2;

    if (pos2 >= 60) {
      direccion2 = -1;
    }

    if (pos2 <= 30) {
      direccion2 = 1;
    }

    myservo2.write(pos2);
  }

  // ESPERAR 3 SEGUNDOS
  if (!alasActivas && tiempoActual - tiempoInicio >= 3000) {
    alasActivas = true;
    tiempoInicio = tiempoActual;
  }

  // ALETEO DURANTE 10 SEGUNDOS
  if (alasActivas) {

    if (tiempoActual - tiempoInicio < 10000) {

      if (tiempoActual - tiempoAnteriorAlas >= 15) {
        tiempoAnteriorAlas = tiempoActual;

        pos += direccion;

        if (pos >= 60) {
          direccion = -1;
        }

        if (pos <= 30) {
          direccion = 1;
        }

        myservo.write(pos);
        myservo1.write(90 - pos);
      }

    } else {
      alasActivas = false;
    }
  }
}
