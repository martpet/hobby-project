import { setFlash } from "@features/flash/helpers.ts";
import { isReauthRequiredForSensitiveAction } from "@features/sessions/helpers.ts";
import { respondReauthRequired } from "@features/sessions/responses/reauth-required.ts";
import { Context, isAuthenticatedContext } from "@shared/context.ts";
import { requestAcceptsHtml } from "@shared/header/negotiation.ts";
import { kv } from "@shared/kv.ts";
import { respondConflict } from "@shared/responses/conflict.ts";
import { respondNotFound } from "@shared/responses/not-found.tsx";
import { redirectBack } from "@shared/responses/redirect-back.ts";
import { respondUnauthorized } from "@shared/responses/unauthorized.tsx";
import { deletePasskey, getPasskeyById, listPasskeysByUserId } from "../kv.ts";
import { getUnknownCredentialSignal } from "../signals.ts";

export async function handlePasskeyDelete(c: Context) {
  if (!isAuthenticatedContext(c)) {
    return respondUnauthorized(c);
  }

  // Deleting a passkey destroys a credential, so require a recent passkey
  // ceremony. A native (no-JS) post past the auth-age limit gets the 403
  // page; the fetch-driven form handles REAUTH_REQUIRED transparently.
  if (isReauthRequiredForSensitiveAction(c.session)) {
    return respondReauthRequired(c);
  }

  const passkey = (await getPasskeyById(c.params.passkeyId!)).value;

  // Same 404 whether the id is unknown or another user's: don't leak which
  // passkey ids exist.
  if (!passkey || passkey.userId !== c.user.id) {
    return respondNotFound(c);
  }

  // The last passkey is the only way into the account, so deleting it would
  // lock the user out; deleting the account is the way to do that.
  if ((await listPasskeysByUserId(c.user.id)).length <= 1) {
    if (requestAcceptsHtml(c)) {
      const res = redirectBack(c);
      setFlash(res.headers, "PASSKEY_LAST_ONE");
      return res;
    }

    return respondConflict({
      detail: "You can't delete your last passkey — delete the account instead",
    });
  }

  const atomic = kv.atomic();

  deletePasskey(passkey, atomic);

  await atomic.commit();

  // No tombstone: it is keyed by the account's WebAuthn user handle and
  // exists only for account deletion; a stale login with this key gets
  // "passkey no longer valid" instead, which is the truth here.
  if (requestAcceptsHtml(c)) {
    const res = redirectBack(c);
    setFlash(res.headers, "PASSKEY_DELETED");
    return res;
  }

  // The fetch-driven form sends the signal (so the credential manager drops
  // the passkey right away) and reloads, which is when the flash shows.
  const headers = new Headers();
  setFlash(headers, "PASSKEY_DELETED");

  return Response.json(
    { signal: getUnknownCredentialSignal(passkey.credId) },
    { headers },
  );
}
