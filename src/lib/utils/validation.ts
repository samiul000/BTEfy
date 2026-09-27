import { z } from "zod";
import { isValidUuid } from "@/lib/utils/bytes";

const uuidSchema = z
  .string()
  .refine((v) => isValidUuid(v), { message: "Invalid UUID format" });

/** BLE UART profile validation */
export const bleProfileSchema = z.object({
  name: z.string().min(1, "Profile name is required").max(100),
  serviceUuid: uuidSchema,
  writeCharacteristicUuid: uuidSchema,
  notifyCharacteristicUuid: uuidSchema,
  writeMode: z
    .enum(["write", "writeWithoutResponse"])
    .default("writeWithoutResponse"),
  chunkSize: z.number().int().min(1).max(512).default(20),
});

export type BleProfileInput = z.infer<typeof bleProfileSchema>;

/** Serial configuration validation */
export const serialConfigSchema = z.object({
  baudRate: z.number().int().positive("Baud rate must be a positive integer"),
  dataBits: z
    .union([z.literal(5), z.literal(6), z.literal(7), z.literal(8)])
    .default(8),
  stopBits: z.union([z.literal(1), z.literal(2)]).default(1),
  parity: z.enum(["none", "even", "odd"]).default("none"),
  bufferSize: z.number().int().positive().optional(),
  flowControl: z.enum(["none", "hardware"]).default("none"),
});

export type SerialConfigInput = z.infer<typeof serialConfigSchema>;

/** Command preset validation */
export const commandPresetSchema = z.object({
  label: z.string().min(1, "Label is required").max(50),
  command: z.string().min(1, "Command is required").max(500),
  lineEnding: z.enum(["none", "lf", "cr", "crlf"]).default("lf"),
  profileId: z.string().nullable().default(null),
});

export type CommandPresetInput = z.infer<typeof commandPresetSchema>;

/** Connection profile validation */
export const connectionProfileSchema = z.object({
  name: z.string().min(1, "Profile name is required").max(100),
  transport: z.enum(["ble", "serial", "mock"]),
  lineEnding: z.enum(["none", "lf", "cr", "crlf"]).default("lf"),
  parser: z.enum(["auto", "key-value", "json"]).default("auto"),
});

export type ConnectionProfileInput = z.infer<typeof connectionProfileSchema>;
