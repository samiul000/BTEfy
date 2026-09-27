# BTEfy Architecture

BTEfy is a browser-based MCU communication console. The browser is the
hardware endpoint; the hosted app only delivers the UI.

```
Static hosting (HTTPS)
  │
  ▼
Browser
  React UI (app/, components/)
    ↓
  Zustand stores (lib/state/)
    ↓
  Services (lib/services/)
    │  connection-manager · telemetry-manager
    │  session-manager · logging-manager
    ↓
  TransportManager (lib/transports/)
    ↓ ┌──────────┬──────────────┐
      │          │              │
  Web BLE   Web Serial       Mock
      │          │              │
    ESP32   Arduino/STM32/   simulator
            RP2040/HC-05
```

## Layers

- **UI** never touches `navigator.bluetooth` / `navigator.serial` directly.
  All hardware access goes through `connectionManager` (services layer).
- **State**: four small Zustand stores (connection, terminal, telemetry,
  settings) no giant global store.
- **Services**: singletons bridging transports → stores → IndexedDB.
- **Transports**: `BaseTransport` event fan-out (`onData`/`onStateChange`);
  `TransportManager` owns reconnect with exponential backoff.
- **Pipeline**: raw chunks → `LineFramer` → terminal store + `TelemetryEngine`
  - session logging. Stats flush to React at 100 ms cadence, never per byte.

## Data & privacy

Device → Browser → IndexedDB. No telemetry leaves the machine; exports are
local `Blob` downloads. There is no backend, no auth, no cloud sync in v1.

## Performance

Bounded everywhere: terminal `maxLines`, telemetry ring buffers, framer queue
caps, logging queue caps, IndexedDB session retention. High-rate streams
degrade by dropping UI frames (counted in Diagnostics), never by growing
memory.
