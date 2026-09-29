"""
BTEfy -> JSON Lines telemetry (MicroPython)

Every numeric field in the object is plotted on its own chart.

    mpremote cp btefy.py :btefy.py
    mpremote cp json-telemetry.py :main.py
"""

import math
import time

from btefy import BTEfy


def main():
    BTEfy.begin("Robot", "1.0.0")
    BTEfy.mirror_serial(False)

    start = time.ticks_ms()
    last = time.ticks_ms()

    while True:
        elapsed = time.ticks_diff(time.ticks_ms(), start)
        if time.ticks_diff(time.ticks_ms(), last) >= 200:
            last = time.ticks_ms()
            BTEfy.println(
                '{"temp": %.1f, "voltage": %.2f}'
                % (
                    25.0 + 2.0 * math.sin(elapsed / 8000.0),
                    11.8 + 0.1 * math.sin(elapsed / 3000.0),
                )
            )
        time.sleep_ms(10)


main()
