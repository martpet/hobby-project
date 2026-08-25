import { kv } from "@etc/kv.ts";
import { respondBadRequest } from "@etc/responses/bad-request.ts";
import { respondConflict } from "@etc/responses/conflict.ts";
import { respondForbidden } from "@etc/responses/forbidden.tsx";
import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { Context } from "@etc/types.ts";
import { verifyRegResponseJson } from "@features/passkeys/ceremony/reg-verify.ts";
import { setPasskey } from "@features/passkeys/kv.ts";
import { createSession } from "@features/sessions/helpers.ts";
import { setUser, USERS_BY_USERNAME } from "@features/users/kv.ts";

export async function handleSignupFinish(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  const regResponseJson = await c.req.json();

  if (!regResponseJson) {
    return respondBadRequest("RegResponseJsonMissing");
  }

  const res = new Response();

  const verification = await verifyRegResponseJson(c, res, regResponseJson);

  if (!verification.ok) {
    return respondForbidden(c);
  }

  const { username, passkey } = verification;
  const atomic = kv.atomic();

  atomic.check({
    key: [USERS_BY_USERNAME, username],
    versionstamp: null,
  });

  const user = setUser({ username }, atomic);

  setPasskey({ ...passkey, userId: user.id }, atomic);

  const commit = await atomic.commit();

  if (!commit.ok) {
    return respondConflict("UsernameTaken");
  }

  await createSession(c, res, user.id);

  return res;
}
