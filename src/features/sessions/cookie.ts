import { IS_DEV } from "@etc/const.ts";
import { generateToken } from "@etc/crypto.ts";
import { Context } from "@etc/types.ts";
import { deleteCookie, getCookies, setCookie } from "@std/http";

const SESSION_COOKIE = "session";

const COOKIE_ATTRIBUTES = {
  path: "/",
  secure: !IS_DEV,
  httpOnly: true,
};

export function setSessionCookie(
  res: Response,
  duration: number,
  value: string = generateToken(),
) {
  setCookie(res.headers, {
    name: SESSION_COOKIE,
    value,
    sameSite: "Lax",
    maxAge: duration / 1000,
    ...COOKIE_ATTRIBUTES,
  });

  return value;
}

export function getSessionCookie(c: Context) {
  return getCookies(c.req.headers)[SESSION_COOKIE];
}

export function deleteSessionCookie(res: Response) {
  deleteCookie(res.headers, SESSION_COOKIE, COOKIE_ATTRIBUTES);
}
