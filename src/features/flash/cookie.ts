import { IS_DEV } from "@shared/const.ts";
import { Context } from "@shared/context.ts";
import { deleteCookie, getCookies, setCookie } from "@std/http";
import { FlashKey } from "./types.ts";

const FLASH_COOKIE = "flash";

const COOKIE_ATTRIBUTES = {
  path: "/",
  secure: !IS_DEV,
  httpOnly: true,
};

export function setFlashCookie(
  res: Response,
  value: FlashKey,
) {
  setCookie(res.headers, {
    name: FLASH_COOKIE,
    value,
    sameSite: "Strict",
    ...COOKIE_ATTRIBUTES,
  });
}

export function getFlashCookie(c: Context) {
  return getCookies(c.req.headers)[FLASH_COOKIE] as FlashKey | undefined;
}

export function deleteFlashCookie(res: Response) {
  deleteCookie(res.headers, FLASH_COOKIE, COOKIE_ATTRIBUTES);
}
