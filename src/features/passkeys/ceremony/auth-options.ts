import { generateAuthenticationOptions } from "@simplewebauthn/server";
import {
  WEBAUTHN_RP_ID,
  WEBAUTHN_TIMEOUT,
  WEBAUTHN_USER_VERIFICATION,
} from "../const.ts";
import { setPasskeyAuthCookie } from "../cookie.ts";
import { setPasskeyAuthOptions } from "../kv.ts";

export async function respondAuthOptions() {
  const authOptions = await generateAuthenticationOptions({
    rpID: WEBAUTHN_RP_ID,
    userVerification: WEBAUTHN_USER_VERIFICATION,
    timeout: WEBAUTHN_TIMEOUT,
  });

  const res = Response.json(authOptions);

  const cookie = setPasskeyAuthCookie(res);

  await setPasskeyAuthOptions({
    cookie,
    value: authOptions,
    expiresAt: Date.now() + WEBAUTHN_TIMEOUT,
  });

  return res;
}
