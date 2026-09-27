/*
 * BTEfyDebug -> Basic
 *
 * Requires: BTEfyDebug library installed
 * (Sketch -> Include Library -> Add .ZIP Library)
 * plus the NimBLE-Arduino library.
 *
 * Open the BTEfy webpage -> Devices -> Select BLE Device -> pick "MyRobot".
 */

#include <BTEfyDebug.h>

void setup() {
  Serial.begin(115200);
  BTEfy.begin("MyRobot", "1.0.0");
}

void loop() {
  static unsigned long last = 0;
  if (millis() - last >= 500) {
    last = millis();
    BTEfy.log("MAIN", "loop running");
    BTEfy.metric("RPM", 1400 + random(-50, 50), 0);
    BTEfy.metric("TEMP", 25.0 + 2.0 * sin(millis() / 10000.0), 1);
  }
}
