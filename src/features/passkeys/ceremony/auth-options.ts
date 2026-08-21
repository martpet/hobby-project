import { addSessionChange } from "@/features/sessions/helpers.ts";
import { Context } from "@/shared/types.ts";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import {
  WEBAUTHN_RP_ID,
  WEBAUTHN_TIMEOUT_MS,
  WEBAUTHN_USER_VERIFICATION,
} from "../const.ts";

export async function respondAuthOptions(c: Context) {
  const authOptions = await generateAuthenticationOptions({
    rpID: WEBAUTHN_RP_ID,
    userVerification: WEBAUTHN_USER_VERIFICATION,
    timeout: WEBAUTHN_TIMEOUT_MS,
  });

  const res = Response.json(authOptions);

  addSessionChange(c, {
    passkeyAuthOptions: {
      value: authOptions,
      expiresAt: Date.now() + WEBAUTHN_TIMEOUT_MS,
    },
  });

  return res;
}
