# BTEfy driver for MicroPython

`btefy.py` is the Arduino `BTEfyDebug` driver ported to MicroPython's
`bluetooth` module. It advertises the Nordic UART Service the webpage
connects to, answers `PING`, `STATUS` and `VERSION` on its own, and splits
long lines into 20-byte notifications.

Requires MicroPython 1.20.0.

## Install

Flash MicroPython to the board, then copy the driver and one example:

```bash
mpremote cp btefy.py :btefy.py
mpremote cp basic.py :main.py
```

`main.py` runs at boot. Open BTEfy in the browser, go to Devices, and pick
the device from the BLE picker.

## Examples

- `basic.py` : the Arduino `Basic` sketch: tagged log lines plus `RPM` and
  `TEMP` telemetry every 500 ms.
- `json-telemetry.py` : JSON Lines output, console mirroring off.

## API

The API mirrors the Arduino driver, in Python naming:

| Arduino                              | MicroPython                          |
| ------------------------------------ | ------------------------------------ |
| `BTEfy.begin(name, version)`         | `BTEfy.begin(name, version)`         |
| `BTEfy.println(x)`                   | `BTEfy.println(x)`                   |
| `BTEfy.print(x)`                     | `BTEfy.print(x)`                     |
| `BTEfy.log(tag, msg)`                | `BTEfy.log(tag, msg)`                |
| `BTEfy.logf(tag, fmt, ...)`          | `BTEfy.log(tag, "rpm=%d" % rpm)`     |
| `BTEfy.metric(key, value, decimals)` | `BTEfy.metric(key, value, decimals)` |
| `BTEfy.connected()`                  | `BTEfy.connected()`                  |
| `BTEfy.mirrorSerial(on)`             | `BTEfy.mirror_serial(on)`            |

`logf` has no equivalent: Python formats the string before passing it in.

## Notes

- Advertising stops while a client is connected and resumes on disconnect,
  so only one browser sees the device at a time.
- `mirror_serial()` prints every line to the console as well; pass `False`
  to silence it.
- `random.randrange()` and `random.randint()` need an optional MicroPython
  build option, so `basic.py` uses `getrandbits()` instead.

## Self-check

`test_btefy.py` runs the protocol logic against stubs. No board required:

```bash
python test_btefy.py
```
