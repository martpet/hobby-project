import { setFlashCookie } from "./cookie.ts";
import { FlashKey } from "./types.ts";

export function setFlash(res: Response, key: FlashKey) {
  setFlashCookie(res, key);
}
