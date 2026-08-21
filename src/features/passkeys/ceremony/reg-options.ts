import { addSessionChange } from "@/features/sessions/helpers.ts";
import { Context } from "@/shared/types.ts";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import {
  WEBAUTHN_RP_ID,
  WEBAUTHN_RP_NAME,
  WEBAUTHN_TIMEOUT_MS,
  WEBAUTHN_USER_VERIFICATION,
} from "../const.ts";

export async function respondRegOptions(c: Context, username: string) {
  const regOptions = await generateRegistrationOptions({
    rpID: WEBAUTHN_RP_ID,
    rpName: WEBAUTHN_RP_NAME,
    timeout: WEBAUTHN_TIMEOUT_MS,
    userName: username,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: WEBAUTHN_USER_VERIFICATION,
    },
  });

  const res = Response.json(regOptions);

  addSessionChange(c, {
    passkeyRegOptions: {
      value: regOptions,
      expiresAt: Date.now() + WEBAUTHN_TIMEOUT_MS,
    },
  });

  return res;
}
