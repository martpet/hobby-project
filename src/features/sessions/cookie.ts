import { IS_DEV } from "@shared/const.ts";
import { Context } from "@shared/context.ts";
import { SECOND } from "@std/datetime";
import { deleteCookie, getCookies, setCookie } from "@std/http";

const SESSION_COOKIE = "session";

const COOKIE_ATTRIBUTES = {
  path: "/",
  secure: !IS_DEV,
  httpOnly: true,
};

export function setSessionCookie(
  headers: Headers,
  duration: number,
  value: string,
) {
  setCookie(headers, {
    name: SESSION_COOKIE,
    value,
    sameSite: "Lax",
    maxAge: duration / SECOND,
    ...COOKIE_ATTRIBUTES,
  });

  return value;
}

export function getSessionCookie(c: Context) {
  return getCookies(c.req.headers)[SESSION_COOKIE];
}

export function deleteSessionCookie(headers: Headers) {
  deleteCookie(headers, SESSION_COOKIE, COOKIE_ATTRIBUTES);
}
