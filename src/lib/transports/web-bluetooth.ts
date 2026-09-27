import { BaseTransport } from "./base";
import type { TransportInfo, ConnectOptions } from "./types";
import { NORDIC_UART } from "@/lib/bluetooth/profiles";
import {
  isWebBluetoothSupported,
  requestBleDevice,
  type BluetoothDeviceLike,
  type BluetoothRemoteGATTCharacteristicLike,
} from "@/lib/bluetooth/scanner";
import { resolveUartCharacteristics } from "@/lib/bluetooth/characteristics";

/** Default BLE payload chunk size when MTU is unknown (conservative) */
const DEFAULT_CHUNK_SIZE = 20;

/**
 * Web Bluetooth transport with Nordic UART support and custom
 * BLE UART profiles.
 */
export class WebBluetoothTransport extends BaseTransport {
  readonly type = "ble" as const;

  private _device: BluetoothDeviceLike | null = null;
  private _writeChar: BluetoothRemoteGATTCharacteristicLike | null = null;
  private _notifyChar: BluetoothRemoteGATTCharacteristicLike | null = null;
  private _writeMode: "write" | "writeWithoutResponse" = "writeWithoutResponse";
  private _chunkSize = DEFAULT_CHUNK_SIZE;
  private _deviceName = "BLE Device";
  private _deviceId = "ble:unknown";
  private _notifyHandler: ((event: Event) => void) | null = null;
  private _disconnectHandler: (() => void) | null = null;

  async connect(options?: ConnectOptions): Promise<void> {
    if (!isWebBluetoothSupported()) {
      throw new Error(
        "Web Bluetooth is not supported by this browser. Use Chrome or Edge.",
      );
    }
    if (this.isConnected()) return;

    const serviceUuid = (
      options?.serviceUuid ?? NORDIC_UART.serviceUuid
    ).toLowerCase();
    const writeUuid = (
      options?.writeCharacteristicUuid ?? NORDIC_UART.writeCharacteristicUuid
    ).toLowerCase();
    const notifyUuid = (
      options?.notifyCharacteristicUuid ?? NORDIC_UART.notifyCharacteristicUuid
    ).toLowerCase();
    this._writeMode = options?.writeMode ?? NORDIC_UART.writeMode;
    this._chunkSize = DEFAULT_CHUNK_SIZE;

    this.setState("requesting");
    const device = await requestBleDevice({ serviceUuids: [serviceUuid] });
    this._device = device;
    this._deviceName = device.name ?? "BLE Device";
    this._deviceId = `ble:${device.id}`;

    this.setState("connecting");
    if (!device.gatt) {
      throw new Error("Selected device does not expose a GATT server.");
    }

    try {
      await device.gatt.connect();
    } catch {
      throw new Error("Unable to connect to the selected BLE device.");
    }

    try {
      const { write, notify } = await resolveUartCharacteristics(
        device,
        serviceUuid,
        writeUuid,
        notifyUuid,
      );
      this._writeChar = write;
      this._notifyChar = notify;

      this._notifyHandler = (event: Event) => {
        const target = event.target as unknown as {
          value?: DataView;
        };
        if (target.value) {
          this.emitData(
            new Uint8Array(
              target.value.buffer.slice(
                target.value.byteOffset,
                target.value.byteOffset + target.value.byteLength,
              ),
            ),
          );
        }
      };
      notify.addEventListener(
        "characteristicvaluechanged",
        this._notifyHandler,
      );
      await notify.startNotifications();
    } catch {
      try {
        device.gatt.disconnect();
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(
        "UART service was not found on this device. Try a custom profile or manual characteristic selection.",
      );
    }

    // Handle unexpected disconnects (out of range, powered off)
    this._disconnectHandler = () => {
      void this._handleUnexpectedDisconnect();
    };
    device.addEventListener("gattserverdisconnected", this._disconnectHandler);

    this.setState("connected");
  }

  async disconnect(): Promise<void> {
    this.setState("disconnecting");
    await this._cleanup();
    this.setState("disconnected");
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.isConnected() || !this._writeChar) {
      throw new Error("BLE device is not connected.");
    }

    // Chunked writes never silently truncate
    for (let offset = 0; offset < data.length; offset += this._chunkSize) {
      const chunk = data.slice(offset, offset + this._chunkSize);
      const buffer = chunk as unknown as BufferSource;
      if (this._writeMode === "writeWithoutResponse") {
        if (
          this._writeChar.properties.writeWithoutResponse === true &&
          typeof this._writeChar.writeValueWithoutResponse === "function"
        ) {
          await this._writeChar.writeValueWithoutResponse(buffer);
        } else {
          await this._writeChar.writeValue(buffer);
        }
      } else {
        await this._writeChar.writeValue(buffer);
      }
    }
  }

  getInfo(): TransportInfo {
    return {
      id: this._deviceId,
      name: this._deviceName,
      type: "ble",
      connected: this.isConnected(),
      metadata: { serviceUuids: [] },
    };
  }

  destroy(): void {
    void this._cleanup();
    super.destroy();
  }

  // --- Private ---

  private async _handleUnexpectedDisconnect(): Promise<void> {
    if (!this.isConnected()) return;
    this.setState("error");
    await this._cleanup();
    this.setState("disconnected");
  }

  private async _cleanup(): Promise<void> {
    if (
      this._notifyChar &&
      this._notifyHandler &&
      typeof this._notifyChar.stopNotifications === "function"
    ) {
      try {
        this._notifyChar.removeEventListener(
          "characteristicvaluechanged",
          this._notifyHandler,
        );
        await this._notifyChar.stopNotifications();
      } catch {
        // Already stopped
      }
    }
    this._notifyHandler = null;
    this._notifyChar = null;
    this._writeChar = null;

    if (this._device) {
      if (this._disconnectHandler) {
        try {
          this._device.removeEventListener(
            "gattserverdisconnected",
            this._disconnectHandler,
          );
        } catch {
          // Ignore
        }
        this._disconnectHandler = null;
      }
      try {
        this._device.gatt?.disconnect();
      } catch {
        // Already disconnected
      }
      this._device = null;
    }
  }
}
