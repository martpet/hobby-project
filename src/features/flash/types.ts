import { FLASH } from "./const.ts";

export type FlashType = "success" | "info" | "warning" | "danger";

export type FlashKey = keyof typeof FLASH;

export interface FlashMessage {
  type: FlashType;
  msg: string;
}
