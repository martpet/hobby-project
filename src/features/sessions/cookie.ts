import { IS_DEV } from "@/shared/const.ts";
import { deleteCookie, setCookie } from "@std/http";
import { SESSION_DURATION_MS } from "./const.ts";

export const SESSION_COOKIE = "session";

const attributes = {
  path: "/",
  secure: !IS_DEV, // for Safari (can't set secure cookie on http://localhost)
  httpOnly: true,
};

export function setSessionCookie(res: Response) {
  const sessionId = crypto.randomUUID();

  setCookie(res.headers, {
    name: SESSION_COOKIE,
    value: sessionId,
    sameSite: "Lax",
    maxAge: SESSION_DURATION_MS / 1000,
    ...attributes,
  });

  return sessionId;
}

export function deleteSessionCookie(res: Response) {
  deleteCookie(res.headers, SESSION_COOKIE, attributes);
}
