/*
 * BLE GATT inspection + UART characteristic discovery.
 * Powers the generic BLE debugger (§45) and manual characteristic
 * selection when automatic UART detection fails.
 */

import { normalizeUuid } from "./profiles";
import type {
  BluetoothDeviceLike,
  BluetoothRemoteGATTCharacteristicLike,
  BluetoothRemoteGATTServiceLike,
} from "./scanner";

/* Inspectable characteristic summary for the service browser UI */
export interface CharacteristicSummary {
  uuid: string;
  canRead: boolean;
  canWrite: boolean;
  canWriteWithoutResponse: boolean;
  canNotify: boolean;
  canIndicate: boolean;
}

/* Inspectable service summary for the service browser UI */
export interface ServiceSummary {
  uuid: string;
  name: string | null;
  characteristics: CharacteristicSummary[];
}

/* Known service names (subset); unknown services are still displayed */
const KNOWN_SERVICES: Record<string, string> = {
  "00001800-0000-1000-8000-00805f9b34fb": "Generic Access",
  "00001801-0000-1000-8000-00805f9b34fb": "Generic Attribute",
  "0000180a-0000-1000-8000-00805f9b34fb": "Device Information",
  "0000180f-0000-1000-8000-00805f9b34fb": "Battery Service",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e": "Nordic UART Service",
  "0000ffe0-0000-1000-8000-00805f9b34fb": "HM-10 UART Service",
};

export function knownServiceName(uuid: string): string | null {
  return KNOWN_SERVICES[normalizeUuid(uuid)] ?? null;
}

function summarizeCharacteristic(
  c: BluetoothRemoteGATTCharacteristicLike,
): CharacteristicSummary {
  return {
    uuid: c.uuid,
    canRead: c.properties.read === true,
    canWrite: c.properties.write === true,
    canWriteWithoutResponse: c.properties.writeWithoutResponse === true,
    canNotify: c.properties.notify === true,
    canIndicate: c.properties.indicate === true,
  };
}

/* List all services + characteristics of a connected device */
export async function inspectDeviceServices(
  device: BluetoothDeviceLike,
): Promise<ServiceSummary[]> {
  if (!device.gatt?.connected) {
    throw new Error("Device GATT server is not connected.");
  }
  const services: BluetoothRemoteGATTServiceLike[] =
    await device.gatt.getPrimaryServices();
  const result: ServiceSummary[] = [];
  for (const service of services) {
    const chars = await service.getCharacteristics();
    result.push({
      uuid: service.uuid,
      name: knownServiceName(service.uuid),
      characteristics: chars.map(summarizeCharacteristic),
    });
  }
  return result;
}

/* Resolved UART characteristic pair */
export interface UartCharacteristics {
  write: BluetoothRemoteGATTCharacteristicLike;
  notify: BluetoothRemoteGATTCharacteristicLike;
}

/*
 * Find UART characteristics for a profile.
 * Falls back to property-based auto-detection when the profile UUIDs
 * are absent (generic BLE UART support, §15).
 */
export async function resolveUartCharacteristics(
  device: BluetoothDeviceLike,
  serviceUuid: string,
  writeUuid: string,
  notifyUuid: string,
): Promise<UartCharacteristics> {
  if (!device.gatt?.connected) {
    throw new Error("Device GATT server is not connected.");
  }

  const service = await device.gatt.getPrimaryService(serviceUuid);
  const chars = await service.getCharacteristics();
  const byUuid = new Map(chars.map((c) => [normalizeUuid(c.uuid), c]));

  let write = byUuid.get(normalizeUuid(writeUuid));
  let notify = byUuid.get(normalizeUuid(notifyUuid));

  // Fallback: auto-detect by properties
  if (!write) {
    write =
      chars.find((c) => c.properties.write === true) ??
      chars.find((c) => c.properties.writeWithoutResponse === true);
  }
  if (!notify) {
    notify =
      chars.find((c) => c.properties.notify === true) ??
      chars.find((c) => c.properties.indicate === true);
  }

  if (!write || !notify) {
    throw new Error(
      "UART characteristics were not found. Select them manually in the BLE debugger.",
    );
  }
  return { write, notify };
}
