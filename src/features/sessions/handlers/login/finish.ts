import { respondBadRequest } from "@etc/responses/bad-request.ts";
import { respondForbidden } from "@etc/responses/forbidden.tsx";
import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { Context } from "@etc/types.ts";
import { verifiyAuthResponseJson } from "@features/passkeys/ceremony/auth-verify.ts";
import { createSession } from "../../helpers.ts";

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

  await createSession(c, res, verification.userId);

  return res;
}
