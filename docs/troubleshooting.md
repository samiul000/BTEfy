# Troubleshooting

## Bluetooth unsupported / Serial unsupported

Use Chrome or Edge 89+ (Serial) / 56+ (Bluetooth) on desktop, served over
HTTPS or `localhost`. `http://` LAN URLs will not expose hardware APIs.
Check Settings → Browser Capabilities for live detection.

## Device not appearing (BLE)

- Ensure the device advertises and is not already connected to another app.
- BTEfy filters by UART service UUID by default; unfilterable devices need
  a custom profile or generic accept-all scan.
- Toggle the MCU's Bluetooth off/on; Chrome caches GATT aggressively
  (`chrome://bluetooth-internals` helps).

## BLE service / characteristic not found

The firmware likely uses custom UUIDs. Save a custom connection profile with
the exact service/write/notify UUIDs, or pick characteristics manually via
the resolver fallback. UUIDs are case-insensitive.

## Serial port unavailable / already in use

Close Arduino IDE Serial Monitor, PuTTY, or other apps holding the port.
On Windows, check Device Manager for the COM number and driver (CP210x /
CH340 / FTDI). Unplug/replug USB to reset a stuck CDC device.

## HC-05 not appearing

HC-05 is Bluetooth Classic: it never appears in the BLE picker. Pair it in
Windows Bluetooth settings, find its outgoing virtual COM port, and connect
through Web Serial at (usually) 9600 baud CRLF.

## Permissions

Both pickers require a user click and can be denied. If denied, reload the
page and allow access when prompted. BTEfy never scans silently.

## Device disconnects unexpectedly

USB unplug, BLE out-of-range, or firmware crash. BTEfy marks the session,
flushes the recording to IndexedDB, and if enabled retries with
exponential backoff (see connection state in the header).
