import { setFlash } from "@features/flash/helpers.ts";
import {
  deletePasskey,
  listPasskeysByUserId,
  tombstonePasskey,
} from "@features/passkeys/kv.ts";
import { getNoAcceptedCredentialsSignals } from "@features/passkeys/webauthn-signals.ts";
import { deleteSessionCookie } from "@features/sessions/cookie.ts";
import { deleteSession, listSessionsByUserId } from "@features/sessions/kv.ts";
import { deleteUser } from "@features/users/kv.ts";
import { Context, isAuthenticatedContext } from "@shared/context.ts";
import { requestAcceptsHtml } from "@shared/header.ts";
import { kv } from "@shared/kv.ts";
import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";
import { respondRedirect } from "@shared/responses/redirect.ts";
import { respondUnauthorized } from "@shared/responses/unauthorized.tsx";

export async function handleAccountDelete(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  if (!isAuthenticatedContext(c)) {
    return respondUnauthorized(c);
  }

  const { user } = c;
  const atomic = kv.atomic();

  const sessions = await listSessionsByUserId(user.id);
  for (const session of sessions) {
    deleteSession(session, atomic);
  }

  const passkeys = await listPasskeysByUserId(user.id);
  for (const passkey of passkeys) {
    deletePasskey(passkey, atomic);
    tombstonePasskey(passkey, atomic);
  }

  deleteUser(user, atomic);

  await atomic.commit();

  // Native form posts get the redirect; the fetch-driven form gets the
  // signals so it can tell the credential manager to drop the passkeys.
  const res = requestAcceptsHtml(c)
    ? respondRedirect("/")
    : Response.json({ signals: getNoAcceptedCredentialsSignals(passkeys) });

  deleteSessionCookie(res);
  setFlash(res, "AccountDeleted");

  return res;
}
