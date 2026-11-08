// Reference for Arduino Uno + Servo library. NOT TESTED ON REAL HARDWARE.
// Supply servos from an appropriately rated external supply, with common ground.
#include <Servo.h>

Servo servos[4];
const byte PINS[4] = {9, 10, 5, 6}; // head pan, head tilt, beak, wings
const int LOW_LIMIT[4] = {65, 75, 80, 70};
const int HIGH_LIMIT[4] = {115, 105, 105, 110};
const int REST[4] = {90, 90, 80, 90};
int position[4] = {90, 90, 80, 90};
int target[4] = {90, 90, 80, 90};
const byte PIR_PIN = 7; // external pull-down as required by the selected PIR
const unsigned long WATCHDOG_MS = 3000;
bool attached = false, dropping = false, presence = false, rawPresence = false;
unsigned long lastMessage = 0, lastStep = 0, gestureStarted = 0, presenceChanged = 0;
String state = "idle", gesture = "rest";
char input[48];
byte inputLength = 0;

void restTargets() {
  for (byte i = 0; i < 4; i++) target[i] = REST[i];
}

void attachServos() {
  if (attached) return;
  for (byte i = 0; i < 4; i++) {
    servos[i].write(constrain(position[i], LOW_LIMIT[i], HIGH_LIMIT[i]));
    servos[i].attach(PINS[i]);
  }
  attached = true;
}

bool validState(const String &name) {
  return name == "idle" || name == "welcome" || name == "listening" ||
    name == "thinking" || name == "speaking" || name == "handoff_qr" ||
    name == "offline" || name == "error" || name == "maintenance";
}

bool allowed(const String &name) {
  if (name == "stop") return state == "error" || state == "maintenance";
  if (name == "rest") return state != "error";
  return (name == "wave" && state == "welcome") ||
    (name == "attentive" && state == "listening") ||
    (name == "ponder" && state == "thinking") ||
    (name == "talk" && state == "speaking") ||
    (name == "point" && state == "handoff_qr");
}

String gestureForState() {
  if (state == "welcome") return "wave";
  if (state == "listening") return "attentive";
  if (state == "thinking") return "ponder";
  if (state == "speaking") return "talk";
  if (state == "handoff_qr") return "point";
  if (state == "error") return "stop";
  return "rest";
}

void command(const String &line) {
  String next;
  if (line.startsWith("STATE ")) {
    next = line.substring(6);
    if (!validState(next)) { Serial.println("ERR command"); return; }
  } else if (line.startsWith("GESTURE ")) {
    next = line.substring(8);
    if (!allowed(next)) { Serial.println("ERR command"); return; }
  } else if (line != "PING") {
    Serial.println("ERR command"); return;
  }
  // ACK precedes any target update. Host latches error if it does not receive this ACK.
  Serial.print("ACK "); Serial.println(line);
  lastMessage = millis();
  if (line == "PING") return;
  attachServos();
  if (line.startsWith("STATE ")) {
    if (state == next) return; // repeated states do not restart a gesture
    state = next;
    gesture = gestureForState();
  } else gesture = next;
  gestureStarted = millis();
  restTargets();
}

void updateTargets(unsigned long now) {
  restTargets();
  if (gesture == "wave" && now - gestureStarted < 1400) target[3] = ((now / 280) % 2) ? 108 : 75;
  if (gesture == "attentive") target[1] = 82;
  if (gesture == "ponder") target[0] = 105;
  if (gesture == "talk") target[2] = ((now / 180) % 2) ? 98 : 82;
  if (gesture == "point") { target[0] = 108; target[3] = 103; }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  // No motion at startup. First valid STATE command establishes the ACK handshake.
  lastMessage = millis();
}

void loop() {
  unsigned long now = millis();
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\n') {
      if (!dropping && inputLength) { input[inputLength] = 0; command(String(input)); }
      inputLength = 0; dropping = false;
    } else if (ch != '\r' && !dropping) {
      if (inputLength < sizeof(input) - 1) input[inputLength++] = ch;
      else { dropping = true; inputLength = 0; }
    }
  }
  if (now - lastMessage > WATCHDOG_MS) { state = "idle"; gesture = "rest"; }
  updateTargets(now);
  if (attached && now - lastStep >= 20) {
    lastStep = now;
    bool settled = true;
    for (byte i = 0; i < 4; i++) {
      int safeTarget = constrain(target[i], LOW_LIMIT[i], HIGH_LIMIT[i]);
      int difference = safeTarget - position[i];
      position[i] += constrain(difference, -2, 2);
      servos[i].write(constrain(position[i], LOW_LIMIT[i], HIGH_LIMIT[i]));
      if (position[i] != REST[i]) settled = false;
    }
    if (now - lastMessage > WATCHDOG_MS + 1000 && settled) {
      for (byte i = 0; i < 4; i++) servos[i].detach();
      attached = false;
    }
  }
  bool sample = digitalRead(PIR_PIN) == HIGH;
  if (sample != rawPresence) { rawPresence = sample; presenceChanged = now; }
  if (rawPresence != presence && now - presenceChanged >= 250) {
    presence = rawPresence;
    Serial.print("SENSOR presence "); Serial.println(presence ? "1" : "0");
  }
}
