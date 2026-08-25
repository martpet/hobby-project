import { isAuthenticatedContext } from "@etc/context.ts";
import { kv } from "@etc/kv.ts";
import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { respondRedirect } from "@etc/responses/redirect.ts";
import { respondUnauthorized } from "@etc/responses/unauthorized.tsx";
import { Context } from "@etc/types.ts";
import { setFlash } from "@features/flash/helpers.ts";
import {
  deletePasskey,
  listPasskeysByUserId,
  tombstonePasskey,
} from "@features/passkeys/kv.ts";
import { deleteSessionCookie } from "@features/sessions/cookie.ts";
import { deleteSession, listSessionsByUserId } from "@features/sessions/kv.ts";
import { deleteUser } from "@features/users/kv.ts";

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

  const res = respondRedirect("/");

  deleteSessionCookie(res);
  setFlash(res, "AccountDeleted");

  return res;
}
