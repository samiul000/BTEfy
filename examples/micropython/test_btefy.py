"""
Self-check for btefy.py. Run it from this folder:

    python test_btefy.py

btefy.py targets MicroPython, so the few things CPython lacks are stubbed
below. The bluetooth stub is not a free pass: its UUID stores the 128-bit
value byte-reversed, exactly like MicroPython's extmod/modbluetooth.c does,
because that reversed form is what actually goes on the air.
"""

import io
import sys
import time
import types

# --- stubs ---

_micropython = types.ModuleType("micropython")
_micropython.const = lambda value: value
sys.modules["micropython"] = _micropython

_CLOCK = [0]
_SLEEPS = []
time.ticks_ms = lambda: _CLOCK[0]
time.ticks_diff = lambda new, old: new - old
time.sleep_ms = _SLEEPS.append

bluetooth = types.ModuleType("bluetooth")


class UUID:
    def __init__(self, value):
        self.value = value

    def __bytes__(self):
        # modbluetooth.c parses the string back to front into data[], so
        # data[0] ends up holding the last octet of the UUID.
        return bytes.fromhex(self.value.replace("-", ""))[::-1]


class BLE:
    def __init__(self):
        self.handler = None
        self.name = None
        self.services = None
        self.buffer = None
        self.advertising = None
        self.writes = {}
        self.notifies = []
        self._active = False

    def active(self, value=None):
        if value is None:
            return self._active
        self._active = bool(value)
        return self._active

    def config(self, **kwargs):
        if "gap_name" in kwargs:
            self.name = kwargs["gap_name"]

    def irq(self, handler):
        self.handler = handler

    def gatts_register_services(self, services):
        self.services = services
        return [(10, 11)]  # handles in definition order: rx, tx

    def gatts_set_buffer(self, handle, length, append=False):
        self.buffer = (handle, length, append)

    def gap_advertise(self, interval, adv=None, resp_data=None):
        self.advertising = (interval, adv, resp_data)

    def gatts_read(self, handle):
        return self.writes.get(handle, b"")

    def gatts_notify(self, conn, handle, data):
        self.notifies.append((conn, handle, bytes(data)))


ble = BLE()
bluetooth.BLE = lambda: ble
bluetooth.UUID = UUID
sys.modules["bluetooth"] = bluetooth

import btefy 

RX, TX = 10, 11

# 6E400001-B5A3-F393-E0A9-E50E24DCCA9E, byte-reversed as it goes on the air.
NUS = bytes.fromhex("9ecadc240ee5a9e093f3a3b50100406e")


def sent():
    payload = [data for _, _, data in ble.notifies]
    ble.notifies = []
    return payload


def write(handle, text):
    ble.writes[handle] = text.encode()
    ble.handler(3, (7, handle))  # _IRQ_GATTS_WRITE, (conn_handle, attr_handle)


# ------ advertising ------

driver = btefy.BTEfyDebug()
driver.begin("MyRobot", "1.0.0")

interval, adv, resp = ble.advertising
assert ble.name == "MyRobot"
assert interval == 500000
assert adv[:3] == b"\x02\x01\x06", "flags"
assert adv[3:5] == b"\x11\x07", "AD type 0x07 = complete list of 128-bit UUIDs"
assert adv[5:21] == NUS, "the NUS UUID must be little-endian on the air"
assert len(adv) <= 31, "legacy advertising PDUs are capped at 31 bytes"
assert adv.endswith(b"MyRobot"), "a short name fits in the advertising PDU"
assert resp == b""
assert ble.buffer == (RX, 64, False), "RX buffer set after registration"

service = ble.services[0]
assert service[0].value == "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
rx_char, tx_char = service[1]
assert rx_char[1] == 0x0008 | 0x0004, "RX accepts write and write-without-response"
assert tx_char[1] == 0x0010, "TX notifies"

# PDU moves into the scan response instead.
other = btefy.BTEfyDebug()
other.begin("BTEfy-ESP32", "1.0.0")
_, long_adv, long_resp = ble.advertising
assert len(long_adv) <= 31, "advertising PDU still within 31 bytes"
assert long_resp.endswith(b"BTEfy-ESP32"), "long name goes in the scan response"
assert b"BTEfy-ESP32" not in long_adv

# ---- messages ----

# begin() is safe to call again, e.g. when re-running from the REPL.
driver.begin("MyRobot", "1.0.0")
assert ble.advertising == (500000, adv, resp)
assert not driver.connected()

# Before a client connects the line still mirrors to the console.
console = sys.stdout
buffer = io.StringIO()
sys.stdout = buffer
driver.log("WIFI", "connected")
sys.stdout = console
assert buffer.getvalue() == "[WIFI] connected\n", "mirrors even with no client"
assert sent() == [], "nothing is notified without a connection"

ble.handler(1, (7, 0, b"\x00"))  # _IRQ_CENTRAL_CONNECT
assert driver.connected()

driver.mirror_serial(False)
driver.log("WIFI", "connected")
assert sent() == [b"[WIFI] connected", b"\n"]

driver.metric("TEMP", 25.4)
assert sent() == [b"TEMP=25.40", b"\n"]

driver.metric("RPM", 1430, 0)
assert sent() == [b"RPM=1430", b"\n"], "%.0f drops the decimal point"

driver.print("partial")
assert sent() == [b"partial"], "print() sends no newline"

# Long lines split at 20 bytes with the same 5 ms gap the Arduino driver uses.
_SLEEPS[:] = []
driver.println("A" * 50)
assert sent() == [b"A" * 20, b"A" * 20, b"A" * 10, b"\n"]
assert _SLEEPS == [5, 5], "one gap between chunks, none before the newline"

# ---- commands -----

_CLOCK[0] = 61000  # 61 seconds after the connect that set _uptime_ms to 0

write(RX, "PING")
assert sent() == [b"PONG", b"\n"]

write(RX, "STATUS")
assert sent() == [b"STATUS=OK,UPTIME=61", b"\n"]

write(RX, "VERSION")
assert sent() == [b"VERSION=1.0.0", b"\n"]

write(RX, "  motor speed 50  ")
assert sent() == [b"ECHO:motor speed 50", b"\n"], "trimmed before matching"

write(RX, "   ")
assert sent() == [], "a blank command produces no reply"

ble.writes[99] = b"PING"
ble.handler(3, (7, 99))
assert sent() == [], "writes to other characteristics are not ours"

# ------ disconnect ------

ble.handler(2, (7, 0, b"\x00"))  # _IRQ_CENTRAL_DISCONNECT
assert not driver.connected()
assert ble.advertising == (500000, adv, resp), "advertising resumes on disconnect"

print("OK")
