import { setFlash } from "@features/flash/helpers.ts";
import { verifiyAuthResponseJson } from "@features/passkeys/ceremony/auth-verify.ts";
import { Context, isAuthenticatedContext } from "@shared/context.ts";
import { respondBadRequest } from "@shared/responses/bad-request.ts";
import { respondForbidden } from "@shared/responses/forbidden.tsx";
import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";
import { createSession, destroySession } from "../../helpers.ts";

export async function handleLogInFinish(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  const authResponseJson = await c.req.json();

  if (!authResponseJson) {
    return respondBadRequest("AuthResponseJsonMissing");
  }

  const res = new Response();

  const verification = await verifiyAuthResponseJson(c, res, authResponseJson);

  if (!verification.ok) {
    return respondForbidden(c, verification.reason);
  }

  const isReauthenticating = isAuthenticatedContext(c);

  if (isReauthenticating && c.session.userId !== verification.userId) {
    setFlash(res, "PasskeyAccountMismatch");
    return res;
  }

  if (!await createSession(c, res, verification.userId)) {
    return respondForbidden(c);
  }

  if (isReauthenticating) {
    await destroySession(c.session);
    setFlash(res, "Reauthenticated");
  }

  return res;
}
