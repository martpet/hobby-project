import { generateRegistrationOptions } from "@simplewebauthn/server";
import {
  WEBAUTHN_RP_ID,
  WEBAUTHN_RP_NAME,
  WEBAUTHN_TIMEOUT,
  WEBAUTHN_USER_VERIFICATION,
} from "../const.ts";
import { setPasskeyRegCookie } from "../cookie.ts";
import { setPasskeyRegOptions } from "../kv.ts";

export async function createRegOptions(headers: Headers, username: string) {
  const regOptions = await generateRegistrationOptions({
    rpID: WEBAUTHN_RP_ID,
    rpName: WEBAUTHN_RP_NAME,
    timeout: WEBAUTHN_TIMEOUT,
    userName: username,
    // No attestation: we don't care which authenticator model made the key,
    // and asking would trigger an extra consent prompt in some browsers.
    attestationType: "none",
    authenticatorSelection: {
      // Required (not preferred) so the credential is discoverable and login
      // never needs a username first.
      residentKey: "required",
      userVerification: WEBAUTHN_USER_VERIFICATION,
    },
  });

  await setPasskeyRegOptions({
    cookie: setPasskeyRegCookie(headers),
    value: regOptions,
    expiresAt: Date.now() + WEBAUTHN_TIMEOUT,
  });

  return regOptions;
}
