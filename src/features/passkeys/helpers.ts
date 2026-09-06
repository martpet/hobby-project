import { getAaguidName } from "./aaguid.ts";
import { Passkey } from "./types.ts";

// Default name for a freshly registered passkey, unique among the user's
// passkeys (names double as identifiers in the sessions table). The
// AAGUID-derived base wins when free; an unknown authenticator or a taken
// base falls back to the credential id's tail, which is random and therefore
// unique per user for all practical purposes.
export function uniquePasskeyName(
  existing: Passkey[],
  aaguid: Passkey["aaguid"],
  credId: Passkey["credId"],
) {
  const base = getAaguidName(aaguid) ?? "Passkey";
  const taken = new Set(existing.map((passkey) => passkey.name));

  if (!taken.has(base)) {
    return base;
  }

  return `${base} •${credId.slice(-4)}`;
}
