import { kv } from "@/shared/kv.ts";
import { SESSION_DURATION_MS } from "./const.ts";
import { LoginSession, Session } from "./types.ts";

export const SESSION_BY_ID = "session_by_id";
export const SESSION_BY_USER_ID = "session_by_user_id";

export function setSession(
  data: Omit<Session, "expiresAt">,
  atomic: Deno.AtomicOperation,
) {
  const expireIn = SESSION_DURATION_MS;

  const session: Session = {
    ...data,
    expiresAt: Date.now() + expireIn,
  };

  const keys = [
    [SESSION_BY_ID, session.id],
  ];

  if (session.data.login) {
    keys.push([SESSION_BY_USER_ID, session.data.login.userId, session.id]);
  }

  for (const key of keys) {
    atomic.set(key, session, { expireIn });
  }
}

export function deleteSession(session: Session, atomic: Deno.AtomicOperation) {
  atomic.delete([SESSION_BY_ID, session.id]);

  if (session.data.login) {
    atomic.delete([SESSION_BY_USER_ID, session.data.login.userId, session.id]);
  }
}

export async function getSessionById(id: Session["id"]) {
  const entry = await kv.get<Session>([SESSION_BY_ID, id]);
  return entry.value;
}

export function listSessionsByUserId(
  userId: LoginSession["data"]["login"]["userId"],
) {
  const iter = kv.list<LoginSession>({ prefix: [SESSION_BY_USER_ID, userId] });
  return Array.fromAsync(iter, (entry) => entry.value);
}
