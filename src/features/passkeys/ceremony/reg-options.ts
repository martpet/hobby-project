import { cacheNoStore } from "@shared/cache-control.ts";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import {
  WEBAUTHN_RP_ID,
  WEBAUTHN_RP_NAME,
  WEBAUTHN_TIMEOUT,
  WEBAUTHN_USER_VERIFICATION,
} from "../const.ts";
import { setPasskeyRegCookie } from "../cookie.ts";
import { setPasskeyRegOptions } from "../kv.ts";

export async function respondRegOptions(username: string) {
  const regOptions = await generateRegistrationOptions({
    rpID: WEBAUTHN_RP_ID,
    rpName: WEBAUTHN_RP_NAME,
    timeout: WEBAUTHN_TIMEOUT,
    userName: username,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: WEBAUTHN_USER_VERIFICATION,
    },
  });

  const res = Response.json(regOptions);

  cacheNoStore(res);

  const cookie = setPasskeyRegCookie(res);

  await setPasskeyRegOptions({
    cookie,
    value: regOptions,
    expiresAt: Date.now() + WEBAUTHN_TIMEOUT,
  });

  return res;
}
