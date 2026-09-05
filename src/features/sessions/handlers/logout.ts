import { setFlash } from "@features/flash/helpers.ts";
import { deleteSessionCookie } from "@features/sessions/cookie.ts";
import { Context, isAuthenticatedContext } from "@shared/context.ts";
import { respondForbidden } from "@shared/responses/forbidden.tsx";
import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";
import { redirectBack } from "@shared/responses/redirect-back.ts";
import { respondRedirect } from "@shared/responses/redirect.ts";
import { respondUnauthorized } from "@shared/responses/unauthorized.tsx";
import { destroySession } from "../helpers.ts";
import { getSessionById } from "../kv.ts";

export async function handleLogOut(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  if (!isAuthenticatedContext(c)) {
    return respondUnauthorized(c);
  }

  const formData = await c.req.formData();
  const sessionId = formData.get("sessionId");

  if (typeof sessionId === "string") {
    const session = (await getSessionById(sessionId)).value;

    const res = redirectBack(c);

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
