import { getUserById } from "@/features/users/kv.ts";
import { kv } from "@/shared/kv.ts";
import { Context, Middleware } from "@/shared/types.ts";
import { getCookies } from "@std/http";
import {
  deleteSessionCookie,
  SESSION_COOKIE,
  setSessionCookie,
} from "./cookie.ts";
import { addSessionChange } from "./helpers.ts";
import { deleteSession, getSessionById, setSession } from "./kv.ts";

const SKIP_PATHS = ["/favicon.ico"];
const SKIP_PREFIXES = ["/apple-touch-icon"];
const SKIP_SEGMENTS = ["/assets/"];

export const sessionMid: Middleware = (next) => async (c) => {
  if (
    SKIP_PATHS.includes(c.url.pathname) ||
    SKIP_SEGMENTS.some((seg) => c.url.pathname.includes(seg)) ||
    SKIP_PREFIXES.some((pref) => c.url.pathname.startsWith(pref))
  ) {
    return next(c);
  }

  const sessionId = getCookies(c.req.headers)[SESSION_COOKIE];
  if (sessionId) c.session = await getSessionById(sessionId);

  c.alerts = c.session?.data.alerts;

  if (c.alerts && c.method === "GET") {
    addSessionChange(c, { alerts: undefined });
  }

  if (c.session?.data.login) {
    c.user = await getUserById(c.session.data.login.userId);
  }

  const res = await next(c);

  if (c.sessionChanges) {
    await applySessionChanges(c, res);
  }

  return res;
};

export function applySessionChanges(c: Context, res: Response) {
  const nextData = { ...c.session?.data, ...c.sessionChanges };
  const isEmpty = Object.values(nextData).every((v) => v === undefined);
  const atomic = kv.atomic();
  if (c.session) {
    deleteSession(c.session, atomic);
    deleteSessionCookie(res);
  }
  if (!isEmpty) {
    const id = setSessionCookie(res);
    setSession({ id, data: nextData }, atomic);
  }
  return atomic.commit();
}
