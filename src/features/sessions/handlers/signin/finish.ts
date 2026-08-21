import { verifiyAuthResponse } from "@/features/passkeys/ceremony/auth-verify.ts";
import { respondBadRequest } from "@/shared/response/bad-request.ts";
import { respondForbidden } from "@/shared/response/forbidden.tsx";
import { respondMethodNotAllowed } from "@/shared/response/method-not-allowed.tsx";
import { Context } from "@/shared/types.ts";
import { signInUser } from "../../helpers.ts";

export async function handleSigninFinish(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  const reqJson = await c.req.json();

  if (!reqJson.authResponse) {
    return respondBadRequest("AuthResponseMissing");
  }

  const res = new Response();

  const verification = await verifiyAuthResponse(c, reqJson.authResponse);

  if (!verification.ok) {
    return respondForbidden(c, verification.reason);
  }

  signInUser(c, verification.userId);

  return res;
}
