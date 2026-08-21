import { addSessionChange } from "@/features/sessions/helpers.ts";
import { Context } from "@/shared/types.ts";
import {
  RegistrationResponseJSON,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { WEBAUTHN_ORIGIN, WEBAUTHN_RP_ID } from "../const.ts";
import { Passkey } from "../types.ts";

type RegVerificationResult = {
  ok: true;
  passkey: Omit<Passkey, "id" | "userId">;
  username: string;
} | {
  ok: false;
};

export async function verifyRegResponse(
  c: Context,
  regResponse: RegistrationResponseJSON,
): Promise<RegVerificationResult> {
  const regOptions = c.session?.data.passkeyRegOptions;

  if (!regOptions) {
    console.log("SessionExpiredOrMissingRegOptions");
    return { ok: false };
  }

  addSessionChange(c, { passkeyRegOptions: undefined });

  if (Date.now() > regOptions.expiresAt) {
    console.log("RegOptionsExpired");
    return { ok: false };
  }

  let verifiedResponse;

  try {
    verifiedResponse = await verifyRegistrationResponse({
      response: regResponse,
      expectedRPID: WEBAUTHN_RP_ID,
      expectedOrigin: WEBAUTHN_ORIGIN,
      expectedChallenge: regOptions.value.challenge,
    });
  } catch (error) {
    console.log(error);
    return { ok: false };
  }

  const { verified, registrationInfo } = verifiedResponse;

  if (!verified) {
    return { ok: false };
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    registrationInfo;

  return {
    ok: true,
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
