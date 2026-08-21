import { kv } from "@/shared/kv.ts";

import { ulid } from "@std/ulid/ulid";
import { SetOptional } from "type-fest";
import { Passkey } from "./types.ts";

export const PASSKEY_BY_ID = "passkey_by_id";
export const PASSKEY_BY_CRED_ID = "passkey_by_cred_id";
export const PASSKEY_BY_USER_ID = "passkey_by_user_id";

export function setPasskey(
  data: SetOptional<Passkey, "id">,
  atomic: Deno.AtomicOperation,
) {
  const passkey: Passkey = {
    ...data,
    id: data.id || ulid(),
  };

  for (
    const key of [
      [PASSKEY_BY_ID, passkey.id],
      [PASSKEY_BY_CRED_ID, passkey.credId],
      [PASSKEY_BY_USER_ID, passkey.userId, passkey.id],
    ]
  ) atomic.set(key, passkey);

  return passkey.id;
}

export async function getPasskeyByCredId(credId: Passkey["credId"]) {
  const entry = await kv.get<Passkey>([PASSKEY_BY_CRED_ID, credId]);
  return entry.value;
}
