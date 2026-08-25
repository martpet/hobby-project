import { isAuthenticatedContext } from "@etc/context.ts";
import { Middleware } from "@etc/types.ts";
import { setFlash } from "@features/flash/helpers.ts";
import { getUserById } from "@features/users/kv.ts";
import { decodeTime } from "@std/ulid";
import {
  SESSION_ABSOLUTE_TIMEOUT,
  SESSION_ACTIVITY_INTERVAL,
} from "./const.ts";
import { deleteSessionCookie, getSessionCookie } from "./cookie.ts";
import { destroySessionIfUnchanged, extendCurrentSession } from "./helpers.ts";
import { getSessionByCookie } from "./kv.ts";

const SKIP = [
  "/assets/",
  "^/webhook/",
  "^/favicon.ico$",
  "^/apple-touch-icon",
];

export const sessionMid: Middleware = (next) => async (c) => {
  if (SKIP.some((rule) => c.url.pathname.match(rule))) {
    return next(c);
  }

  const cookie = getSessionCookie(c);

  if (!cookie) {
    return next(c);
  }

  const sessionEntry = await getSessionByCookie(cookie);
  const session = sessionEntry.value;

  if (!session) {
    const res = await next(c);
    deleteSessionCookie(res);
    return res;
  }

  const now = Date.now();
  const absoluteExpiresAt = decodeTime(session.id) + SESSION_ABSOLUTE_TIMEOUT;

  if (
    session.expiresAt <= now ||
    absoluteExpiresAt <= now
  ) {
    const destroyed = await destroySessionIfUnchanged(sessionEntry);

    const res = await next(c);

    if (destroyed) {
      deleteSessionCookie(res);
      setFlash(res, "SessionExpired");
    }

    return res;
  }

  const user = (await getUserById(session.userId)).value;

  if (!user) {
    const destroyed = await destroySessionIfUnchanged(sessionEntry);

    const res = await next(c);

    if (destroyed) {
      deleteSessionCookie(res);
    }

    return res;
  }

  c.session = session;
  c.user = user;

  const res = await next(c);

  const shouldExtendSession = isAuthenticatedContext(c) &&
    Date.now() - session.lastActive >= SESSION_ACTIVITY_INTERVAL;

  if (shouldExtendSession) {
    await extendCurrentSession(c, res, sessionEntry);
  }

  return res;
};
