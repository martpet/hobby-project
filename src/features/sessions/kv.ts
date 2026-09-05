import { kv } from "@shared/kv.ts";
import { ulid } from "@std/ulid";
import { SetOptional } from "type-fest";
import { Session } from "./types.ts";

const SESSIONS_BY_ID = "sessions_by_id";
const SESSIONS_BY_COOKIE = "sessions_by_cookie";
const SESSIONS_BY_USER_ID = "sessions_by_user_id";
const SESSIONS_BY_LAST_ACTIVE = "sessions_by_last_active";

// Deno KV has no secondary indexes, so the full session is written under
// every key it needs to be found by, and all writes go through one atomic
// operation to keep them in sync. The last two are prefix-listable: by user
// (for the sessions table) and by activity (oldest first; no reader yet,
// intended for a future cleanup job).
function getSessionKeys(session: Session): Deno.KvKey[] {
  return [
    [SESSIONS_BY_ID, session.id],
    [SESSIONS_BY_COOKIE, session.cookie],
    [SESSIONS_BY_USER_ID, session.userId, session.id],
    [SESSIONS_BY_LAST_ACTIVE, session.lastActive, session.id],
  ];
}

export function getSessionById(id: Session["id"]) {
  return kv.get<Session>([SESSIONS_BY_ID, id]);
}

export function getSessionByCookie(cookie: Session["cookie"]) {
  return kv.get<Session>([SESSIONS_BY_COOKIE, cookie]);
}

export function listSessionsByUserId(userId: Session["userId"]) {
  const iter = kv.list<Session>({ prefix: [SESSIONS_BY_USER_ID, userId] });
  return Array.fromAsync(iter, (entry) => entry.value);
}

export function setSession(
  partialSession: SetOptional<Session, "id">,
  atomic: Deno.AtomicOperation,
) {
  const session: Session = {
    ...partialSession,
    id: partialSession.id ?? ulid(),
  };

  // KV's TTL is best-effort cleanup; `sessionMid` still enforces expiry.
  const expireIn = session.expiresAt - Date.now();

  for (const key of getSessionKeys(session)) {
    atomic.set(key, session, { expireIn });
  }

  return session;
}

// Needed whenever `lastActive` changes, since it is embedded in that key
// (see `extendCurrentSession`).
export function deleteSessionLastActiveIndex(
  session: Session,
  atomic: Deno.AtomicOperation,
) {
  atomic.delete([SESSIONS_BY_LAST_ACTIVE, session.lastActive, session.id]);
}

export function deleteSession(session: Session, atomic: Deno.AtomicOperation) {
  for (const key of getSessionKeys(session)) {
    atomic.delete(key);
  }
}
