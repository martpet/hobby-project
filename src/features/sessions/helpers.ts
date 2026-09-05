import { setFlash } from "@features/flash/helpers.ts";
import { getUserById } from "@features/users/kv.ts";
import { cacheNoStoreOnCookieChange } from "@shared/cache-control.ts";
import { AuthenticatedContext, Context } from "@shared/context.ts";
import { generateToken } from "@shared/crypto.ts";
import { kv } from "@shared/kv.ts";
import { decodeTime } from "@std/ulid";
import {
  SENSITIVE_ACTION_MAX_AUTH_AGE,
  SESSION_ABSOLUTE_TIMEOUT,
  SESSION_EXPIRY_WARNING_THRESHOLD,
  SESSION_IDLE_TIMEOUT,
} from "./const.ts";
import { deleteSessionCookie, setSessionCookie } from "./cookie.ts";
import {
  deleteSession,
  deleteSessionLastActiveIndex,
  setSession,
} from "./kv.ts";
import { Session } from "./types.ts";

// The session id is a ULID minted whenever a passkey ceremony completes
// (login or reauth), so decoding it gives the time of last authentication.
export function getSessionAuthTime(session: Session) {
  return decodeTime(session.id);
}

export function getSessionAbsoluteExpiresAt(session: Session) {
  return getSessionAuthTime(session) + SESSION_ABSOLUTE_TIMEOUT;
}

export function isSessionExpiringSoon(session: Session) {
  return getSessionAbsoluteExpiresAt(session) - Date.now() <=
    SESSION_EXPIRY_WARNING_THRESHOLD;
}

export function isReauthRequiredForSensitiveAction(session: Session) {
  return Date.now() - getSessionAuthTime(session) >
    SENSITIVE_ACTION_MAX_AUTH_AGE;
}

export async function createSession(c: Context, res: Response, userId: string) {
  const userEntry = await getUserById(userId);

  if (!userEntry.value) {
    return false;
  }

  const now = Date.now();
  const atomic = kv.atomic();
  const cookie = generateToken();

  atomic.check(userEntry);

  setSession({
    cookie,
    userId,
    expiresAt: now + SESSION_IDLE_TIMEOUT,
    lastActive: now,
    browser: c.ua.browser.name,
    os: c.ua.os.name,
    ip: c.ip,
  }, atomic);

  const result = await atomic.commit();

  if (!result.ok) {
    return false;
  }

  setSessionCookie(res, SESSION_IDLE_TIMEOUT, cookie);

  return true;
}

export async function extendCurrentSession(
  c: AuthenticatedContext,
  res: Response,
  sessionEntry: Deno.KvEntry<Session>,
) {
  const session = sessionEntry.value;
  const now = Date.now();

  const absoluteExpiresAt = getSessionAbsoluteExpiresAt(session);

  const duration = Math.min(
    SESSION_IDLE_TIMEOUT,
    absoluteExpiresAt - now,
  );

  if (duration <= 0) {
    await destroySessionIfUnchanged(sessionEntry);
    deleteSessionCookie(res);
    setFlash(res, "SessionExpired");
    cacheNoStoreOnCookieChange(c, res);
    return;
  }

  const updatedSession = {
    ...session,
    expiresAt: now + duration,
    lastActive: now,
    ip: c.ip,
  };

  const atomic = kv.atomic();

  atomic.check(sessionEntry);
  deleteSessionLastActiveIndex(session, atomic);
  setSession(updatedSession, atomic);

  const result = await atomic.commit();

  if (!result.ok) {
    return;
  }

  setSessionCookie(
    res,
    duration,
    updatedSession.cookie,
  );
}

export async function destroySession(session: Session) {
  const atomic = kv.atomic();

  deleteSession(session, atomic);

  const result = await atomic.commit();

  return result.ok;
}

export async function destroySessionIfUnchanged(
  entry: Deno.KvEntry<Session>,
) {
  const atomic = kv.atomic();

  atomic.check(entry);
  deleteSession(entry.value, atomic);

  const result = await atomic.commit();

  return result.ok;
}
