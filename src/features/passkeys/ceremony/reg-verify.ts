import { Context } from "@etc/types.ts";
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

export async function verifyRegResponseJson(
  c: Context,
  res: Response,
  regResponseJson: RegistrationResponseJSON,
): Promise<RegVerificationResult> {
  const cookie = getPasskeyRegCookie(c);

  let regOptions;

  if (cookie) {
    regOptions = (await getPasskeyRegOptions(cookie)).value;
    deletePasskeyRegCookie(res);
  }

  if (regOptions) {
    await deletePasskeyRegOptions(regOptions);
  }

  if (!regOptions || regOptions.expiresAt < Date.now()) {
    console.log("PasskeyRegExpired");
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
    console.log(error);
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
