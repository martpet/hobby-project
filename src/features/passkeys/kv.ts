import { kv } from "@shared/kv.ts";
import { ulid } from "@std/ulid";
import { SetOptional } from "type-fest";
import { DELETED_ACCOUNT_TOMBSTONE_TTL } from "./const.ts";
import { Passkey, PasskeyAuthOptions, PasskeyRegOptions } from "./types.ts";

const PASSKEYS_BY_ID = "passkeys_by_id";
const PASSKEYS_BY_CRED_ID = "passkeys_by_cred_id";
const PASSKEYS_BY_USER_ID = "passkeys_by_user_id";
const PASSKEYS_REG_OPTIONS_BY_COOKIE = "passkeys_reg_options_by_cookie";
const PASSKEYS_AUTH_OPTIONS_BY_COOKIE = "passkeys_auth_options_by_cookie";
const PASSKEYS_DELETED_BY_WEBAUTHN_USER_ID =
  "passkeys_deleted_by_webauthn_user_id";

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

export function listPasskeysByUserId(userId: Passkey["userId"]) {
  const iter = kv.list<Passkey>({ prefix: [PASSKEYS_BY_USER_ID, userId] });
  return Array.fromAsync(iter, (entry) => entry.value);
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

export function deletePasskey(passkey: Passkey, atomic: Deno.AtomicOperation) {
  for (const key of getPasskeyKeys(passkey)) {
    atomic.delete(key);
  }
}

export function tombstonePasskey(
  passkey: Passkey,
  atomic: Deno.AtomicOperation,
) {
  atomic.set(
    [PASSKEYS_DELETED_BY_WEBAUTHN_USER_ID, passkey.webauthnUserId],
    true,
    { expireIn: DELETED_ACCOUNT_TOMBSTONE_TTL },
  );
}

export function getPasskeyDeletedTombstone(
  webauthnUserId: Passkey["webauthnUserId"],
) {
  return kv.get<boolean>([
    PASSKEYS_DELETED_BY_WEBAUTHN_USER_ID,
    webauthnUserId,
  ]);
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
