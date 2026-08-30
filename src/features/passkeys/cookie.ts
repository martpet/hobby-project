import { IS_DEV } from "@etc/const.ts";
import { generateToken } from "@etc/crypto.ts";
import { Context } from "@etc/types.ts";
import { WEBAUTHN_TIMEOUT } from "@features/passkeys/const.ts";
import { SECOND } from "@std/datetime";
import { deleteCookie, getCookies, setCookie } from "@std/http";

const PASSKEY_REG_COOKIE = "passkey_reg";
const PASSKEY_AUTH_COOKIE = "passkey_auth";

const COOKIE_ATTRIBUTES = {
  path: "/",
  secure: !IS_DEV,
  httpOnly: true,
};

export function setPasskeyRegCookie(res: Response) {
  const value = generateToken();

  setCookie(res.headers, {
    name: PASSKEY_REG_COOKIE,
    value,
    sameSite: "Strict",
    maxAge: WEBAUTHN_TIMEOUT / SECOND,
    ...COOKIE_ATTRIBUTES,
  });

  return value;
}

export function setPasskeyAuthCookie(res: Response) {
  const value = generateToken();

  setCookie(res.headers, {
    name: PASSKEY_AUTH_COOKIE,
    value,
    sameSite: "Strict",
    maxAge: WEBAUTHN_TIMEOUT / SECOND,
    ...COOKIE_ATTRIBUTES,
  });

  return value;
}

export function getPasskeyRegCookie(c: Context) {
  return getCookies(c.req.headers)[PASSKEY_REG_COOKIE];
}

export function getPasskeyAuthCookie(c: Context) {
  return getCookies(c.req.headers)[PASSKEY_AUTH_COOKIE];
}

export function deletePasskeyRegCookie(res: Response) {
  deleteCookie(res.headers, PASSKEY_REG_COOKIE, COOKIE_ATTRIBUTES);
}

export function deletePasskeyAuthCookie(res: Response) {
  deleteCookie(res.headers, PASSKEY_AUTH_COOKIE, COOKIE_ATTRIBUTES);
}
