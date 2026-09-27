# Bluetooth Guide

## Requirements

- Chrome or Edge (desktop or Android), HTTPS or `localhost`.
- A Bluetooth adapter (built-in or USB dongle).
- Pairing happens through the OS/browser — BTEfy never bypasses it.

## Nordic UART (default)

Most ESP32 BLE-UART firmwares expose the Nordic UART Service:

| Role    | UUID                                   |
| ------- | -------------------------------------- |
| Service | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` |
| Write   | `6E400002-B5A3-F393-E0A9-E50E24DCCA9E` |
| Notify  | `6E400003-B5A3-F393-E0A9-E50E24DCCA9E` |

UUID matching is case-insensitive. Built-in profiles: Nordic UART, ESP32 BLE
UART, HM-10 (`FFE0`/`FFE1`).

## Drop-in debug driver (recommended)

Instead of writing BLE code yourself, install the bundled Arduino library
from `driver/BTEfyDebug.zip` (Arduino IDE: Sketch -> Include Library ->
Add .ZIP Library). It follows the standard library layout
(`library.properties` + `src/`), so angle-bracket includes work like any
other driver:

```cpp
#include <BTEfyDebug.h>

void setup() {
  BTEfy.begin("MyRobot");        // BLE name shown in the webpage picker
}

void loop() {
  BTEfy.println("hello");        // -> BTEfy terminal
  BTEfy.log("WIFI", "connected");// -> [WIFI] connected
  BTEfy.metric("TEMP", 25.4);    // -> TEMP=25.40, auto-plotted as telemetry
}
```

Requires the `NimBLE-Arduino` library (`NimBLEDevice` API), version 2.0.0
or newer. The driver answers `PING` / `STATUS` /
`VERSION` automatically, chunks long lines to the BLE payload size, and by
default mirrors everything to USB Serial too — so the same firmware is
debuggable over Bluetooth (webpage) and USB (Serial Monitor / Web Serial)
simultaneously. Try File -> Examples -> BTEfyDebug -> Basic after installing.

## Custom profiles

Devices → connect BLE with different UUIDs by saving a connection profile
with custom service/write/notify UUIDs no code changes needed. If auto
detection fails, the characteristic resolver falls back to property-based
detection (any writable + any notifiable characteristic).

## Writes & MTU

BLE payloads are small. BTEfy chunks all writes (default 20 bytes, never
truncated) and prefers write-without-response where the characteristic
supports it.

## BLE modules for boards without Bluetooth (HM-10 and clones)

Arduino Uno, most STM32 boards, and the Pico (non-W) have no BLE — attach a
BLE UART module and BTEfy talks to it directly over Web Bluetooth, no PC-side
drivers needed:

```
MCU UART -> HM-10 -> BLE GATT -> Web Bluetooth -> BTEfy
```

### Wiring

HM-10 is a 3.3 V device: VCC 3.3 V (Arduino 3V3 pin works), GND, TXD -> board
RX, RXD -> board TX through a divider on 5 V Arduinos (same as HC-05 above).

### Setup

1. Firmware: plain `Serial` prints at the module's baud rate (default 9600).
   The module relays every UART byte as a BLE notification automatically.
2. BTEfy: Devices -> Select BLE Device -> pick the module (e.g. `HMSoft`).
   The built-in **HM-10 / CC2541** profile (`FFE0` / `FFE1`) matches these
   modules; typing in the terminal writes back through the same characteristic.
3. Optional AT config over the same UART (`AT`, `AT+NAME?`, `AT+BAUD?`
   send with no line ending, module replies `OK`). Only needed to rename the
   device or change baud; defaults work out of the box.

### HM-10 vs HC-05

|             | HM-10 (BLE)                | HC-05 (Classic)            |
| ----------- | -------------------------- | -------------------------- |
| Webpage     | Web Bluetooth, direct      | Web Serial via OS COM port |
| Pairing     | None (BLE just connects)   | OS-level pairing + PIN     |
| Range/power | Lower power, shorter range | Longer range, more power   |
| Arduino lib | None needed                | None needed                |

Rule of thumb: HM-10 for the smoothest BTEfy experience (no OS pairing, no
COM-port hunting); HC-05 for range or if you already own one.

## Limitations

- `requestDevice()` requires a user click, BTEfy cannot background-scan.
- Web Bluetooth does **not** support Bluetooth Classic SPP. HC-05 modules
  must go through the OS virtual COM port + Web Serial (see `serial.md`).
- One app cannot force a GATT MTU; throughput is adapter/firmware dependent.
