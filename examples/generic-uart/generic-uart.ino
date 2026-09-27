/*
 * BTEfy reference firmware:generic UART (any Arduino/STM32/RP2040).
 *
 * Sends KEY=VALUE telemetry over USB Serial at 115200 baud.
 * Connect from BTEfy via Devices -> Web Serial -> Select Serial Device.
 * Also works unchanged through an HC-05 virtual COM port
 * (set the HC-05 to 115200, or change Serial baud to 9600).
 *
 * Commands:
 *   PING     -> PONG
 *   STATUS   -> STATUS=OK,UPTIME=<seconds>
 *   VERSION  -> VERSION=1.0.0-uart
 */

void setup() {
  Serial.begin(115200);
  while (!Serial) { /* wait for USB CDC on native-USB boards */ }
  Serial.println("# BTEfy generic UART ready");
}

void handleCommand(String cmd) {
  cmd.trim();
  if (cmd == "PING") {
    Serial.println("PONG");
  } else if (cmd == "STATUS") {
    Serial.print("STATUS=OK,UPTIME=");
    Serial.println(millis() / 1000);
  } else if (cmd == "VERSION") {
    Serial.println("VERSION=1.0.0-uart");
  } else if (cmd.length() > 0) {
    Serial.print("ECHO:");
    Serial.println(cmd);
  }
}

void loop() {
  static unsigned long last = 0;

  while (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    handleCommand(cmd);
  }

  if (millis() - last >= 1000) {
    last = millis();
    // Demo values; replace with real sensor reads (analogRead etc.)
    float temp = 25.0f + 2.0f * sin(millis() / 10000.0f);
    float volt = 5.0f;
    float curr = 0.4f;
    Serial.print("TEMP=");
    Serial.print(temp, 1);
    Serial.print(",VOLT=");
    Serial.print(volt, 2);
    Serial.print(",CURR=");
    Serial.println(curr, 2);
  }
}
