# Serial Guide

## Requirements

- Chrome or Edge on desktop, HTTPS or `localhost`.
- USB CDC devices (ESP32, Arduino, STM32, RP2040) or UART adapters
  (CP210x, CH340, FTDI) with drivers installed.

## Connecting

Devices → Select Serial Device. The browser shows a port picker — BTEfy can
only list ports you previously granted (browser security model). Configure
baud rate, data/stop bits, parity, and flow control in Settings → Serial
before connecting.

Common baud rates: 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600.

## HC-05 / Bluetooth Classic

Web Bluetooth cannot talk SPP. Instead:

```
MCU UART -> HC-05 -> Bluetooth Classic -> OS virtual COM port
  -> Web Serial -> BTEfy
```

Pair the HC-05 in Windows Bluetooth settings first, note the outgoing COM
port, then select it via Web Serial (default HC-05 profile: 9600 baud, CRLF).

### Wiring (Arduino Uno / STM32 / Pico)

| HC-05 pin | Arduino Uno                                        | STM32 / Pico (3.3 V)         |
| --------- | -------------------------------------------------- | ---------------------------- |
| VCC       | 5V                                                 | 3.3V (or 5V if board has 5V) |
| GND       | GND                                                | GND                          |
| TXD       | Pin 0 (RX) _or_ SoftwareSerial RX                  | UART RX pin                  |
| RXD       | Via divider* to Pin 1 (TX) *or\* SoftwareSerial TX | UART TX pin                  |

\*HC-05 RX is 3.3 V logic: from a 5 V Arduino TX, use a divider (1k + 2k to
GND). 3.3 V boards (STM32, Pico) connect directly.

### Setup

1. Power the module, if it blinks fast (not paired).
2. Pair in Windows Bluetooth settings (PIN usually `1234` or `0000`).
3. Find the **outgoing** COM port: Device Manager -> Ports, or
   Bluetooth settings -> More options -> COM ports.
4. Firmware: plain `Serial` prints at the module's baud rate (default 9600).
   Avoid pins 0/1 on Uno if USB is also connected, use SoftwareSerial.
5. BTEfy: Devices -> Web Serial -> select the COM port, 9600 baud, CRLF
   (the built-in "HC-05 UART" profile has this preset).

### Baud mismatch (most common failure)

The module's UART baud must equal your `Serial.begin(...)` baud. Change the
module side once via AT mode (hold the KEY button at power-up, then
`AT+UART=115200,0,0` at 38400 baud), or just use 9600 on both sides.

## Line endings

TX line ending (None / LF / CR / CRLF) is transport-independent: set it in
Settings → Serial and it applies to BLE, Serial, and Mock alike.
