# Telemetry Format

BTEfy parses newline-delimited text into numeric channels automatically.

## KEY=VALUE (recommended)

```
TEMP=25.4,VOLT=11.82,CURR=1.25,RPM=1430
```

- Comma-separated pairs, whitespace-tolerant.
- Non-numeric values (`STATUS=OK`) are ignored for plotting but still shown
  in the terminal.

## KEY:VALUE

```
TEMP:25.4,VOLT:11.82
```

Same rules, colon separator.

## JSON Lines

```json
{"temp":25.4,"voltage":11.82,"current":1.25}
```

Flat numeric fields become channels (keys upper-cased). Nested objects and
non-numeric fields are ignored for plotting.

## Channel discovery

The first sighting of `TEMP=…` creates the `TEMP` channel; later samples
append to it. Discovery can be disabled in Settings → Telemetry. Units are
only shown when the protocol or a device profile provides them — BTEfy never
guesses units.

## Plotting

Channels are ring-buffered (configurable history: 250–1000+ samples),
rendered with uPlot at UI cadence. Toggle visibility per channel, pause, or
clear from the Telemetry page.
