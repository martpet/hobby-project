import { setFlash } from "@features/flash/helpers.ts";
import { Context, isAuthenticatedContext } from "@shared/context.ts";
import { kv } from "@shared/kv.ts";
import { respondBadRequest } from "@shared/responses/bad-request.ts";
import { respondConflict } from "@shared/responses/conflict.ts";
import { respondForbidden } from "@shared/responses/forbidden.tsx";
import { respondUnauthorized } from "@shared/responses/unauthorized.tsx";
import { verifyRegResponseJson } from "../../ceremony/reg-verify.ts";
import { uniquePasskeyName } from "../../helpers.ts";
import {
  getPasskeyByCredId,
  listPasskeysByUserId,
  PASSKEYS_BY_USER_ID_AND_NAME,
  setPasskey,
} from "../../kv.ts";

export async function handlePasskeyAddFinish(c: Context) {
  if (!isAuthenticatedContext(c)) {
    return respondUnauthorized(c);
  }

  const regResponseJson = await c.req.json();

  if (!regResponseJson) {
    return respondBadRequest({
      detail: "The registration response is missing or invalid",
    });
  }

  const headers = new Headers();

  const verification = await verifyRegResponseJson(c, headers, regResponseJson);

  if (!verification.ok) {
    return respondForbidden(c, { headers });
  }

  const { passkey } = verification;

  // Second line of defence for one-passkey-per-authenticator: a credential
  // that slipped past `excludeCredentials` (e.g. cloned) is rejected here.
  if ((await getPasskeyByCredId(passkey.credId)).value) {
    return respondConflict({
      detail: "This passkey is already registered",
      headers,
    });
  }

  // `existing` can be stale by commit time (e.g. two authenticators of the
  // same make added at once), so the name `uniquePasskeyName` picks isn't
  // guaranteed free; `versionstamp: null` catches that race and a retry
  // re-reads `existing` so the retry's pick (base name or credId-suffixed
  // fallback) accounts for whatever just got committed.
  let commit;

  do {
    const existing = await listPasskeysByUserId(c.user.id);
    const name = uniquePasskeyName(existing, passkey.aaguid, passkey.credId);
    const atomic = kv.atomic();

    atomic.check({
      key: [PASSKEYS_BY_USER_ID_AND_NAME, c.user.id, name],
      versionstamp: null,
    });

    setPasskey({ ...passkey, userId: c.user.id, name }, atomic);

    commit = await atomic.commit();
  } while (!commit.ok);

  // Shown after the client reloads (see passkey-actions.js).
  setFlash(headers, "PASSKEY_ADDED");

  return new Response(null, { headers });
}
