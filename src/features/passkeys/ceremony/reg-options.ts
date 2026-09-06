import {
  generateRegistrationOptions,
  PublicKeyCredentialDescriptorJSON,
} from "@simplewebauthn/server";
import { decodeBase64Url } from "@std/encoding";
import {
  WEBAUTHN_RP_ID,
  WEBAUTHN_RP_NAME,
  WEBAUTHN_TIMEOUT,
  WEBAUTHN_USER_VERIFICATION,
} from "../const.ts";
import { setPasskeyRegCookie } from "../cookie.ts";
import { setPasskeyRegOptions } from "../kv.ts";

interface RegOptionsParams {
  username: string;
  // Adding a passkey to an existing account reuses its WebAuthn user handle,
  // so credential managers keep one entry for the account (and the signals
  // keyed on the handle keep working); signup omits it and gets a fresh one.
  webauthnUserId?: string;
  // The user's existing credentials: an authenticator holding one of them
  // refuses to register, which is how "one passkey per authenticator" is
  // enforced.
  excludeCredentials?: PublicKeyCredentialDescriptorJSON[];
}

export async function createRegOptions(
  headers: Headers,
  { username, webauthnUserId, excludeCredentials }: RegOptionsParams,
) {
  const regOptions = await generateRegistrationOptions({
    rpID: WEBAUTHN_RP_ID,
    rpName: WEBAUTHN_RP_NAME,
    timeout: WEBAUTHN_TIMEOUT,
    userName: username,
    userID: webauthnUserId ? decodeBase64Url(webauthnUserId) : undefined,
    excludeCredentials,
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
