import { verifyRegResponseJson } from "@features/passkeys/ceremony/reg-verify.ts";
import { setPasskey } from "@features/passkeys/kv.ts";
import { createSession } from "@features/sessions/helpers.ts";
import { setUser, USERS_BY_USERNAME } from "@features/users/kv.ts";
import { Context } from "@shared/context.ts";
import { kv } from "@shared/kv.ts";
import { respondBadRequest } from "@shared/responses/bad-request.ts";
import { respondConflict } from "@shared/responses/conflict.ts";
import { respondForbidden } from "@shared/responses/forbidden.tsx";

export async function handleSignupFinish(c: Context) {
  const regResponseJson = await c.req.json();

  if (!regResponseJson) {
    return respondBadRequest("RegResponseJsonMissing");
  }

  const headers = new Headers();

  const verification = await verifyRegResponseJson(c, headers, regResponseJson);

  if (!verification.ok) {
    return respondForbidden(c, { init: { headers } });
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
    return respondConflict("UsernameTaken", { init: { headers } });
  }

  if (!await createSession(c, headers, user.id)) {
    return respondForbidden(c, { init: { headers } });
  }

  return new Response(null, { headers });
}
