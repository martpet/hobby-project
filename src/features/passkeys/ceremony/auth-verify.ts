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
import { getUnknownCredentialSignal } from "../signals.ts";

type AuthVerificationResult = {
  ok: true;
  passkey: Passkey;
} | {
  ok: false;
  reason?: string;
  signal?: SendSignalUnknownCredentialOpts;
};

// Checks a WebAuthn assertion against the challenge issued by
// `createAuthOptions`, looked up via the short-lived `passkey_auth` cookie.
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

  // A challenge is single-use: consume it before verifying so a replayed
  // assertion, or a second attempt with the same options, is always rejected.
  if (authOptions) {
    await deletePasskeyAuthOptions(authOptions);
  }

  if (!authOptions || authOptions.expiresAt < Date.now()) {
    console.debug("PasskeyAuthExpired");
    return { ok: false };
  }

  const passkeyEntry = await getPasskeyByCredId(authResponseJson.id);
  const passkey = passkeyEntry.value;

  // Discoverable credentials mean the browser may offer a passkey whose
  // account was deleted here. The tombstone tells those users what happened,
  // and the signal lets the credential manager stop offering it.
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

  // The library throws on malformed input or a bad signature (rather than
  // returning `verified: false`), so a reject here is expected, not a bug.
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

  // Persist the new signature counter (used by the library to detect cloned
  // authenticators; many passkey providers keep it at 0). The check makes
  // two concurrent assertions with the same passkey fail one of them, so the
  // counter can't be rolled back.
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
