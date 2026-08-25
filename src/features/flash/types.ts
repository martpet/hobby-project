import { FLASH } from "./const.ts";

export type FlashType = "success" | "info" | "warning" | "error";

export type FlashKey = keyof typeof FLASH;

export interface FlashMessage {
  type: FlashType;
  msg: string;
}
