import { verifyRegResponse } from "@/features/passkeys/ceremony/reg-verify.ts";
import { setPasskey } from "@/features/passkeys/kv.ts";
import { signInUser } from "@/features/sessions/helpers.ts";
import { setUser, USER_BY_USERNAME } from "@/features/users/kv.ts";
import { kv } from "@/shared/kv.ts";
import { respondBadRequest } from "@/shared/response/bad-request.ts";
import { respondConflict } from "@/shared/response/conflict.ts";
import { respondForbidden } from "@/shared/response/forbidden.tsx";
import { respondMethodNotAllowed } from "@/shared/response/method-not-allowed.tsx";
import { Context } from "@/shared/types.ts";

export async function handleSignupFinish(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  const reqJson = await c.req.json();

  if (!reqJson.regResponse) {
    return respondBadRequest("RegResponseMissing");
  }

  const res = new Response();

  const verification = await verifyRegResponse(c, reqJson.regResponse);

  if (!verification.ok) {
    return respondForbidden(c);
  }

  const { username, passkey } = verification;
  const atomic = kv.atomic();
  const userId = setUser({ username }, atomic);
  setPasskey({ ...passkey, userId }, atomic);
  atomic.check({ key: [USER_BY_USERNAME, username], versionstamp: null });

  const commit = await atomic.commit();

  if (!commit.ok) {
    return respondConflict("UsernameTaken");
  }

  signInUser(c, userId);

  return res;
}
