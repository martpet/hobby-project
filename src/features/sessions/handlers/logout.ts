import { isAuthenticatedContext } from "@etc/context.ts";
import { respondForbidden } from "@etc/responses/forbidden.tsx";
import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { redirectBack } from "@etc/responses/redirect-back.ts";
import { respondRedirect } from "@etc/responses/redirect.ts";
import { respondUnauthorized } from "@etc/responses/unauthorized.tsx";
import { Context } from "@etc/types.ts";
import { setFlash } from "@features/flash/helpers.ts";
import { deleteSessionCookie } from "@features/sessions/cookie.ts";
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
    setFlash(res, "SessionRevoked");

    return res;
  }

  const res = respondRedirect("/");

  await destroySession(c.session);
  deleteSessionCookie(res);
  setFlash(res, "LoggedOut");

  return res;
}
