import { kv } from "@etc/kv.ts";
import { ulid } from "@std/ulid";
import { SetOptional } from "type-fest";
import { Passkey, PasskeyAuthOptions, PasskeyRegOptions } from "./types.ts";

const PASSKEYS_BY_ID = "passkeys_by_id";
const PASSKEYS_BY_CRED_ID = "passkeys_by_cred_id";
const PASSKEYS_BY_USER_ID = "passkeys_by_user_id";
const PASSKEYS_REG_OPTIONS_BY_COOKIE = "passkeys_reg_options_by_cookie";
const PASSKEYS_AUTH_OPTIONS_BY_COOKIE = "passkeys_auth_options_by_cookie";

function getPasskeyKeys(passkey: Passkey) {
  return [
    [PASSKEYS_BY_ID, passkey.id],
    [PASSKEYS_BY_CRED_ID, passkey.credId],
    [PASSKEYS_BY_USER_ID, passkey.userId, passkey.id],
  ];
}

export function getPasskeyByCredId(credId: Passkey["credId"]) {
  return kv.get<Passkey>([PASSKEYS_BY_CRED_ID, credId]);
}

export function setPasskey(
  partialPasskey: SetOptional<Passkey, "id">,
  atomic: Deno.AtomicOperation,
) {
  const passkey: Passkey = {
    ...partialPasskey,
    id: partialPasskey.id ?? ulid(),
  };

  for (const key of getPasskeyKeys(passkey)) {
    atomic.set(key, passkey);
  }

  return passkey;
}

export function getPasskeyRegOptions(cookie: PasskeyRegOptions["cookie"]) {
  return kv.get<PasskeyRegOptions>([PASSKEYS_REG_OPTIONS_BY_COOKIE, cookie]);
}

export function setPasskeyRegOptions(regOptions: PasskeyRegOptions) {
  const expireIn = regOptions.expiresAt - Date.now();

  return kv.set(
    [PASSKEYS_REG_OPTIONS_BY_COOKIE, regOptions.cookie],
    regOptions,
    { expireIn },
  );
}

export function deletePasskeyRegOptions(regOptions: PasskeyRegOptions) {
  return kv.delete([PASSKEYS_REG_OPTIONS_BY_COOKIE, regOptions.cookie]);
}

export function getPasskeyAuthOptions(cookie: PasskeyAuthOptions["cookie"]) {
  return kv.get<PasskeyAuthOptions>([PASSKEYS_AUTH_OPTIONS_BY_COOKIE, cookie]);
}

export function setPasskeyAuthOptions(authOptions: PasskeyAuthOptions) {
  const expireIn = authOptions.expiresAt - Date.now();

  return kv.set(
    [PASSKEYS_AUTH_OPTIONS_BY_COOKIE, authOptions.cookie],
    authOptions,
    { expireIn },
  );
}

export function deletePasskeyAuthOptions(authOptions: PasskeyAuthOptions) {
  return kv.delete([PASSKEYS_AUTH_OPTIONS_BY_COOKIE, authOptions.cookie]);
}
