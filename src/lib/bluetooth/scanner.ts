/*
 * Web Bluetooth device scanner helpers.
 * requestDevice() MUST be called from a user gesture.
 */

interface BluetoothLike {
  requestDevice(options: {
    filters?: Array<{ services?: string[] }>;
    optionalServices?: string[];
    acceptAllDevices?: boolean;
  }): Promise<BluetoothDeviceLike>;
  getAvailability?(): Promise<boolean>;
}

export interface BluetoothDeviceLike {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: BluetoothRemoteGATTServerLike;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface BluetoothRemoteGATTServerLike {
  readonly connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServerLike>;
  disconnect(): void;
  getPrimaryServices(): Promise<BluetoothRemoteGATTServiceLike[]>;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTServiceLike>;
}

export interface BluetoothRemoteGATTServiceLike {
  readonly uuid: string;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristicLike[]>;
  getCharacteristic(
    uuid: string,
  ): Promise<BluetoothRemoteGATTCharacteristicLike>;
}

export interface BluetoothRemoteGATTCharacteristicLike {
  readonly uuid: string;
  readonly properties: {
    read?: boolean;
    write?: boolean;
    writeWithoutResponse?: boolean;
    notify?: boolean;
    indicate?: boolean;
  };
  readonly value?: DataView;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristicLike>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristicLike>;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

interface NavigatorWithBluetooth {
  bluetooth?: BluetoothLike;
}

function navigatorBluetooth(): BluetoothLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as unknown as NavigatorWithBluetooth).bluetooth;
}

/** Whether Web Bluetooth is available in this browser */
export function isWebBluetoothSupported(): boolean {
  return navigatorBluetooth() !== undefined;
}

/* Optional: check if a Bluetooth adapter is available (Chrome only) */
export async function isBluetoothAvailable(): Promise<boolean> {
  const bt = navigatorBluetooth();
  if (!bt?.getAvailability) return true; // Assume available; requestDevice will fail gracefully
  try {
    return await bt.getAvailability();
  } catch {
    return true;
  }
}

export interface BleScanOptions {
  /* Service UUIDs to filter by (e.g. Nordic UART). Empty = show all devices. */
  serviceUuids?: string[];
}

/*
 * Prompt to select a BLE device.
 * MUST be called from a user gesture (button click).
 */
export async function requestBleDevice(
  options?: BleScanOptions,
): Promise<BluetoothDeviceLike> {
  const bt = navigatorBluetooth();
  if (!bt) {
    throw new Error(
      "Web Bluetooth is not supported by this browser. Use Chrome or Edge on desktop or Android.",
    );
  }

  const serviceUuids = options?.serviceUuids?.filter(Boolean) ?? [];

  try {
    if (serviceUuids.length > 0) {
      return await bt.requestDevice({
        filters: [{ services: serviceUuids }],
        optionalServices: serviceUuids,
      });
    }
    // No filter: let the user pick any nearby device
    return await bt.requestDevice({ acceptAllDevices: true });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      throw new Error("No Bluetooth device selected.");
    }
    if (error instanceof DOMException && error.name === "SecurityError") {
      throw new Error(
        "Bluetooth permission was denied. Allow access and try again.",
      );
    }
    throw error;
  }
}
