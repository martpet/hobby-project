import { setFlash } from "@features/flash/helpers.ts";
import { verifiyAuthResponseJson } from "@features/passkeys/ceremony/auth-verify.ts";
import { getAllAcceptedCredentialsSignal } from "@features/passkeys/signals.ts";
import { Context, isAuthenticatedContext } from "@shared/context.ts";
import { respondBadRequest } from "@shared/responses/bad-request.ts";
import { respondForbidden } from "@shared/responses/forbidden.tsx";
import { createSession, destroySession } from "../../helpers.ts";

export async function handleLogInFinish(c: Context) {
  const authResponseJson = await c.req.json();

  if (!authResponseJson) {
    return respondBadRequest("AuthResponseJsonMissing");
  }

  const headers = new Headers();

  const verification = await verifiyAuthResponseJson(
    c,
    headers,
    authResponseJson,
  );

  if (!verification.ok) {
    const { reason, signal } = verification;
    return respondForbidden(c, {
      reason,
      data: { signal },
      init: { headers },
    });
  }

  const { passkey } = verification;

  // Same endpoint serves login and reauth; the only difference is whether a
  // session already exists. Reauth swaps the old session for a new one, which
  // is what resets the absolute timeout and the sensitive-action auth age.
  const isReauthenticating = isAuthenticatedContext(c);

  if (isReauthenticating && c.session.userId !== passkey.userId) {
    return respondForbidden(c, {
      reason: "PasskeyAccountMismatch",
      init: { headers },
    });
  }

  if (!await createSession(c, headers, passkey.userId)) {
    return respondForbidden(c, { init: { headers } });
  }

  // Create before destroy, so a failure above leaves the user logged in with
  // the old session rather than with none.
  if (isReauthenticating) {
    await destroySession(c.session);
    setFlash(headers, "Reauthenticated");
  }

  const signal = await getAllAcceptedCredentialsSignal(passkey);

  return Response.json({ signal }, { headers });
}
