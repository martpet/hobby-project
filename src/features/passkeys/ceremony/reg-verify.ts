import { Context } from "@shared/context.ts";
import {
  RegistrationResponseJSON,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { WEBAUTHN_ORIGIN, WEBAUTHN_RP_ID } from "../const.ts";
import { deletePasskeyRegCookie, getPasskeyRegCookie } from "../cookie.ts";
import { deletePasskeyRegOptions, getPasskeyRegOptions } from "../kv.ts";
import { Passkey } from "../types.ts";

type RegVerificationResult = {
  ok: true;
  passkey: Omit<Passkey, "id" | "userId">;
  username: string;
} | {
  ok: false;
};

// Checks a WebAuthn attestation against the challenge issued by
// `createRegOptions`. Returns the passkey to store minus `id`/`userId`, since
// the user row doesn't exist yet — `handleSignupFinish` creates both together.
export async function verifyRegResponseJson(
  c: Context,
  headers: Headers,
  regResponseJson: RegistrationResponseJSON,
): Promise<RegVerificationResult> {
  const cookie = getPasskeyRegCookie(c);

  let regOptions;

  if (cookie) {
    regOptions = (await getPasskeyRegOptions(cookie)).value;
    deletePasskeyRegCookie(headers);
  }

  // Single-use challenge; see `verifiyAuthResponseJson`.
  if (regOptions) {
    await deletePasskeyRegOptions(regOptions);
  }

  if (!regOptions || regOptions.expiresAt < Date.now()) {
    console.debug("PasskeyRegExpired");
    return { ok: false };
  }

  let regVerification;

  try {
    regVerification = await verifyRegistrationResponse({
      response: regResponseJson,
      expectedRPID: WEBAUTHN_RP_ID,
      expectedOrigin: WEBAUTHN_ORIGIN,
      expectedChallenge: regOptions.value.challenge,
    });
  } catch (error) {
    console.warn(error);
    return { ok: false };
  }

  const { verified, registrationInfo } = regVerification;

  if (!verified) {
    return { ok: false };
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    registrationInfo;

  return {
    ok: true,
    // The username was validated and checked for collisions in
    // `handleSignupStart`; taking it from the stored options (not the request
    // body) means the client can't swap it between the two steps.
    username: regOptions.value.user.name,
    passkey: {
      credId: credential.id,
      credPublicKey: credential.publicKey,
      webauthnUserId: regOptions.value.user.id,
      counter: credential.counter,
      transports: credential.transports,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    },
  };
}
