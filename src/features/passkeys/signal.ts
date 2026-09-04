import { SendSignalAllAcceptedCredentialsOpts } from "@simplewebauthn/server";
import { WEBAUTHN_RP_ID } from "./const.ts";
import { listPasskeysByUserId } from "./kv.ts";
import { Passkey } from "./types.ts";

// Options for @simplewebauthn/browser's sendSignal(), so the credential
// manager can hide passkeys this RP no longer recognizes for the user.
export async function getAllAcceptedCredentialsSignal(
  passkey: Passkey,
): Promise<SendSignalAllAcceptedCredentialsOpts> {
  const passkeys = await listPasskeysByUserId(passkey.userId);

  return {
    signalName: "allAcceptedCredentials",
    rpID: WEBAUTHN_RP_ID,
    userID: passkey.webauthnUserId,
    allAcceptedCredentialIDs: passkeys
      .filter((p) => p.webauthnUserId === passkey.webauthnUserId)
      .map((p) => p.credId),
  };
}
