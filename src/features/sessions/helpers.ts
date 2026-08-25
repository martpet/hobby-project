import { generateToken } from "@etc/crypto.ts";
import { kv } from "@etc/kv.ts";
import { AuthenticatedContext, Context } from "@etc/types.ts";
import { setFlash } from "@features/flash/helpers.ts";
import { getUserById } from "@features/users/kv.ts";
import { UserAgent } from "@std/http";
import { HEADER } from "@std/http/unstable-header";
import { decodeTime } from "@std/ulid";
import { SESSION_ABSOLUTE_TIMEOUT, SESSION_IDLE_TIMEOUT } from "./const.ts";
import { deleteSessionCookie, setSessionCookie } from "./cookie.ts";
import {
  deleteSession,
  deleteSessionLastActiveIndex,
  setSession,
} from "./kv.ts";
import { Session } from "./types.ts";

export async function createSession(c: Context, res: Response, userId: string) {
  const userEntry = await getUserById(userId);

  if (!userEntry.value) {
    return false;
  }

  const ua = new UserAgent(c.req.headers.get(HEADER.UserAgent));
  const now = Date.now();
  const atomic = kv.atomic();
  const cookie = generateToken();

  atomic.check(userEntry);

  setSession({
    cookie,
    userId,
    expiresAt: now + SESSION_IDLE_TIMEOUT,
    lastActive: now,
    browser: ua.browser.name,
    os: ua.os.name,
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

  const absoluteExpiresAt = decodeTime(session.id) + SESSION_ABSOLUTE_TIMEOUT;

  const duration = Math.min(
    SESSION_IDLE_TIMEOUT,
    absoluteExpiresAt - now,
  );

  if (duration <= 0) {
    await destroySessionIfUnchanged(sessionEntry);
    deleteSessionCookie(res);
    setFlash(res, "SessionExpired");
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
