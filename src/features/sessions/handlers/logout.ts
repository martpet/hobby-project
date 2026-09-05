import { setFlash } from "@features/flash/helpers.ts";
import { deleteSessionCookie } from "@features/sessions/cookie.ts";
import { Context, isAuthenticatedContext } from "@shared/context.ts";
import { respondForbidden } from "@shared/responses/forbidden.tsx";
import { redirectBack } from "@shared/responses/redirect-back.ts";
import { respondRedirect } from "@shared/responses/redirect.ts";
import { respondUnauthorized } from "@shared/responses/unauthorized.tsx";
import { destroySession } from "../helpers.ts";
import { getSessionById } from "../kv.ts";

export async function handleLogOut(c: Context) {
  if (!isAuthenticatedContext(c)) {
    return respondUnauthorized(c);
  }

  const formData = await c.req.formData();
  const sessionId = formData.get("sessionId");

  // With a `sessionId` this revokes one of the user's *other* sessions from
  // the sessions table and stays on the page; without, it is a plain logout.
  if (typeof sessionId === "string") {
    const session = (await getSessionById(sessionId)).value;

    const res = redirectBack(c);

    // Already gone (expired, or revoked from another tab): nothing to report.
    if (!session) {
      return res;
    }

    if (session.userId !== c.user.id) {
      return respondForbidden(c);
    }

    await destroySession(session);
    setFlash(res.headers, "SessionRevoked");

    return res;
  }

  const res = respondRedirect("/");

  await destroySession(c.session);
  deleteSessionCookie(res.headers);
  setFlash(res.headers, "LoggedOut");

  return res;
}
