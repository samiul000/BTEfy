"""
BTEfy -> Basic (MicroPython)

Copy it to main.py so the board runs it at boot:

    mpremote cp btefy.py :btefy.py
    mpremote cp basic.py :main.py

Open the BTEfy webpage -> Devices -> Select BLE Device -> pick "MyRobot".
"""

import math
import random
import time

from btefy import BTEfy


def main():
    BTEfy.begin("MyRobot", "1.0.0")
    last = time.ticks_ms()

    while True:
        if time.ticks_diff(time.ticks_ms(), last) >= 500:
            last = time.ticks_ms()
            # getrandbits rather than randrange: randrange only exists when
            # MICROPY_PY_RANDOM_EXTRA_FUNCS is enabled in the firmware.
            jitter = random.getrandbits(7) % 100 - 50
            angle = time.ticks_ms() / 10000.0
            BTEfy.log("MAIN", "loop running")
            BTEfy.metric("RPM", 1400 + jitter, 0)
            BTEfy.metric("TEMP", 25.0 + 2.0 * math.sin(angle), 1)
        time.sleep_ms(10)


main()
