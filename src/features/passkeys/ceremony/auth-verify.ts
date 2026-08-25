import { kv } from "@etc/kv.ts";
import { Context } from "@etc/types.ts";
import { User } from "@features/users/types.ts";
import {
  AuthenticationResponseJSON,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { WEBAUTHN_ORIGIN, WEBAUTHN_RP_ID } from "../const.ts";
import { deletePasskeyAuthCookie, getPasskeyAuthCookie } from "../cookie.ts";
import {
  deletePasskeyAuthOptions,
  getPasskeyAuthOptions,
  getPasskeyByCredId,
  setPasskey,
} from "../kv.ts";

type AuthVerificationResult = {
  ok: true;
  userId: User["id"];
} | {
  ok: false;
  reason?: string;
};

export async function verifiyAuthResponseJson(
  c: Context,
  res: Response,
  authResponseJson: AuthenticationResponseJSON,
): Promise<AuthVerificationResult> {
  const cookie = getPasskeyAuthCookie(c);

  let authOptions;

  if (cookie) {
    authOptions = (await getPasskeyAuthOptions(cookie)).value;
    deletePasskeyAuthCookie(res);
  }

  if (authOptions) {
    await deletePasskeyAuthOptions(authOptions);
  }

  if (!authOptions || authOptions.expiresAt < Date.now()) {
    console.log("PasskeyAuthExpired");
    return { ok: false };
  }

  const passkey = (await getPasskeyByCredId(authResponseJson.id)).value;

  if (!passkey) {
    return { ok: false, reason: "PasskeyNotFound" };
  }

  let authVerification;

  try {
    authVerification = await verifyAuthenticationResponse({
      response: authResponseJson,
      expectedRPID: WEBAUTHN_RP_ID,
      expectedOrigin: WEBAUTHN_ORIGIN,
      expectedChallenge: authOptions.value.challenge,
      credential: {
        id: passkey.credId,
        publicKey: passkey.credPublicKey as Uint8Array<ArrayBuffer>,
        counter: passkey.counter,
        transports: passkey.transports,
      },
    });
  } catch (error) {
    console.log(error);
    return { ok: false };
  }

  const { verified, authenticationInfo } = authVerification;

  if (!verified) {
    return { ok: false };
  }

  const atomic = kv.atomic();
  setPasskey({ ...passkey, counter: authenticationInfo.newCounter }, atomic);

  await atomic.commit();

  return {
    ok: true,
    userId: passkey.userId,
  };
}
