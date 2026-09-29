"""
BTEfy debug driver for MicroPython.

MicroPython port of the Arduino BTEfyDebug library (driver/BTEfyDebug.zip).
It advertises the Nordic UART Service the BTEfy webpage filters on, answers
PING / STATUS / VERSION on its own, and chunks long lines down to the
20-byte notification payload.

    from btefy import BTEfy

    BTEfy.begin("MyRobot", "1.0.0")
    BTEfy.log("WIFI", "connected")
    BTEfy.metric("TEMP", 25.4)

Requires MicroPython 1.20.0 or newer.
"""

import bluetooth
import time
from micropython import const

_IRQ_CENTRAL_CONNECT = const(1)
_IRQ_CENTRAL_DISCONNECT = const(2)
_IRQ_GATTS_WRITE = const(3)

_FLAG_WRITE_NO_RESPONSE = const(0x0004)
_FLAG_WRITE = const(0x0008)
_FLAG_NOTIFY = const(0x0010)

_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
_RX_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
_TX_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

_CHUNK = const(20)  # notify payload before anyone negotiates a larger MTU
_GAP_MS = const(5)  # pause between chunks, same gap the Arduino driver uses
_ADV_INTERVAL_US = const(500000)


class BTEfyDebug:
    """Nordic UART peripheral speaking the BTEfy protocol."""

    def __init__(self):
        self._ble = None
        self._rx = 0
        self._tx = 0
        self._conn = None
        self._version = "1.0.0"
        self._mirror = True
        self._uptime_ms = 0
        self._adv = b""
        self._resp = b""

    def begin(self, device_name="BTEfy-ESP32", version="1.0.0"):
        """Start BLE and begin advertising. Call once, from setup()."""
        self._version = version
        self._ble = bluetooth.BLE()
        if self._ble.active():
            # Re-running from the REPL: tear down the old stack first, otherwise
            # service registration happens while the previous round is advertising.
            self._ble.active(False)
        self._ble.active(True)
        self._ble.config(gap_name=device_name)
        self._ble.irq(self._irq)

        handles = self._ble.gatts_register_services(
            (
                (
                    bluetooth.UUID(_SERVICE_UUID),
                    (
                        (
                            bluetooth.UUID(_RX_UUID),
                            _FLAG_WRITE | _FLAG_WRITE_NO_RESPONSE,
                        ),
                        (bluetooth.UUID(_TX_UUID), _FLAG_NOTIFY),
                    ),
                ),
            )
        )
        self._rx, self._tx = handles[0]
        # BTEfy sends 20-byte chunks; the larger buffer just keeps a custom
        # profile with a bigger chunkSize from being truncated at 20.
        self._ble.gatts_set_buffer(self._rx, 64)

        name = device_name.encode()
        # requestDevice() filters on advertised services, so the 128-bit UUID
        # must be here. bytes(UUID) is already byte-reversed, as it goes on air.
        self._adv = b"\x02\x01\x06" + b"\x11\x07" + bytes(
            bluetooth.UUID(_SERVICE_UUID)
        )
        local_name = bytes((len(name) + 1, 0x09)) + name
        if len(self._adv) + len(local_name) <= 31:
            self._adv += local_name
            self._resp = b""
        else:
            self._resp = local_name
        self._advertise()

    def connected(self):
        """True while the BTEfy webpage holds a connection."""
        return self._conn is not None

    def mirror_serial(self, on=True):
        """Also print everything to the console (default: on)."""
        self._mirror = bool(on)

    def println(self, msg):
        """Send one line to the terminal, newline included."""
        text = str(msg)
        if self._mirror:
            print(text)
        if self._conn is None:
            return
        data = text.encode()
        for i in range(0, len(data), _CHUNK):
            if i:
                time.sleep_ms(_GAP_MS)
            self._ble.gatts_notify(self._conn, self._tx, data[i : i + _CHUNK])
        self._ble.gatts_notify(self._conn, self._tx, b"\n")

    def print(self, msg):
        """Send a partial line with no newline (Arduino's BTEfy.print)."""
        text = str(msg)
        if self._mirror:
            print(text, end="")
        if self._conn is not None:
            self._ble.gatts_notify(self._conn, self._tx, text.encode())

    def log(self, tag, msg):
        """Tagged line: [TAG] message"""
        self.println("[%s] %s" % (tag, msg))

    def metric(self, key, value, decimals=2):
        """Telemetry line BTEfy auto-plots: TEMP=25.40"""
        self.println("%s=%s" % (key, ("%." + str(decimals) + "f") % float(value)))

    def _advertise(self):
        self._ble.gap_advertise(
            _ADV_INTERVAL_US, self._adv, resp_data=self._resp
        )

    def _irq(self, event, data):
        if event == _IRQ_CENTRAL_CONNECT:
            self._conn = data[0]
            self._uptime_ms = time.ticks_ms()
        elif event == _IRQ_CENTRAL_DISCONNECT:
            self._conn = None
            self._advertise()
        elif event == _IRQ_GATTS_WRITE and data[1] == self._rx:
            self._command(self._read_rx())

    def _read_rx(self):
        try:
            return bytes(self._ble.gatts_read(self._rx)).decode().strip()
        except ValueError:
            # Not valid UTF-8, e.g. raw HEX typed into the terminal.
            return ""

    def _command(self, cmd):
        if not cmd:
            return
        if cmd == "PING":
            self.println("PONG")
        elif cmd == "STATUS":
            up = time.ticks_diff(time.ticks_ms(), self._uptime_ms) // 1000
            self.println("STATUS=OK,UPTIME=%d" % up)
        elif cmd == "VERSION":
            self.println("VERSION=%s" % self._version)
        else:
            self.println("ECHO:" + cmd)


# Global instance, mirroring the Arduino driver's `BTEfy` object.
BTEfy = BTEfyDebug()
