import { Context } from "@shared/context.ts";
import { kv } from "@shared/kv.ts";
import {
  AuthenticationResponseJSON,
  SendSignalUnknownCredentialOpts,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { WEBAUTHN_ORIGIN, WEBAUTHN_RP_ID } from "../const.ts";
import { deletePasskeyAuthCookie, getPasskeyAuthCookie } from "../cookie.ts";
import {
  deletePasskeyAuthOptions,
  getPasskeyAuthOptions,
  getPasskeyByCredId,
  getPasskeyDeletedTombstone,
  setPasskey,
} from "../kv.ts";
import { Passkey } from "../types.ts";
import { getUnknownCredentialSignal } from "../webauthn-signals.ts";

type AuthVerificationResult = {
  ok: true;
  passkey: Passkey;
} | {
  ok: false;
  reason?: string;
  signal?: SendSignalUnknownCredentialOpts;
};

export async function verifiyAuthResponseJson(
  c: Context,
  headers: Headers,
  authResponseJson: AuthenticationResponseJSON,
): Promise<AuthVerificationResult> {
  const cookie = getPasskeyAuthCookie(c);

  let authOptions;

  if (cookie) {
    authOptions = (await getPasskeyAuthOptions(cookie)).value;
    deletePasskeyAuthCookie(headers);
  }

  if (authOptions) {
    await deletePasskeyAuthOptions(authOptions);
  }

  if (!authOptions || authOptions.expiresAt < Date.now()) {
    console.debug("PasskeyAuthExpired");
    return { ok: false };
  }

  const passkeyEntry = await getPasskeyByCredId(authResponseJson.id);
  const passkey = passkeyEntry.value;

  if (!passkey) {
    const userHandle = authResponseJson.response.userHandle;
    const tombstoned = userHandle &&
      (await getPasskeyDeletedTombstone(userHandle)).value;

    return {
      ok: false,
      reason: tombstoned ? "AccountDeleted" : "PasskeyNotFound",
      signal: getUnknownCredentialSignal(authResponseJson.id),
    };
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
    console.warn(error);
    return { ok: false };
  }

  const { verified, authenticationInfo } = authVerification;

  if (!verified) {
    return { ok: false };
  }

  const atomic = kv.atomic();
  const updatedPasskey = { ...passkey, counter: authenticationInfo.newCounter };

  atomic.check(passkeyEntry);
  setPasskey(updatedPasskey, atomic);

  const result = await atomic.commit();

  if (!result.ok) {
    return { ok: false };
  }

  return {
    ok: true,
    passkey: updatedPasskey,
  };
}
