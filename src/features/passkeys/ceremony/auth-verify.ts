import { addSessionChange } from "@/features/sessions/helpers.ts";
import { User } from "@/features/users/types.ts";
import { kv } from "@/shared/kv.ts";
import { Context } from "@/shared/types.ts";
import {
  AuthenticationResponseJSON,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { WEBAUTHN_ORIGIN, WEBAUTHN_RP_ID } from "../const.ts";
import { getPasskeyByCredId, setPasskey } from "../kv.ts";

type AuthVerificationResult = {
  ok: true;
  userId: User["id"];
} | {
  ok: false;
  reason?: string;
};

export async function verifiyAuthResponse(
  c: Context,
  authResponse: AuthenticationResponseJSON,
): Promise<AuthVerificationResult> {
  const authOptions = c.session?.data.passkeyAuthOptions;

  if (!authOptions) {
    console.log("SessionExpiredOrMissingAuthOptions");
    return { ok: false };
  }

  addSessionChange(c, { passkeyAuthOptions: undefined });

  if (Date.now() > authOptions.expiresAt) {
    console.log("AuthOptionsExpired");
    return { ok: false };
  }

  const passkey = await getPasskeyByCredId(authResponse.id);

  if (!passkey) {
    return {
      ok: false,
      reason: "PasskeyNotFound",
    };
  }

  let verifiedResponse;

  try {
    verifiedResponse = await verifyAuthenticationResponse({
      response: authResponse,
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

  const { verified, authenticationInfo } = verifiedResponse;

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
