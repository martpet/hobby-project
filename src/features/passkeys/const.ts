import { WEBSITE_TITLE } from "@shared/const.ts";
import { getRequiredEnv } from "@shared/environment.ts";
import { DAY, MINUTE } from "@std/datetime";

export const WEBAUTHN_TIMEOUT = 5 * MINUTE;
export const WEBAUTHN_USER_VERIFICATION = "preferred";
export const WEBAUTHN_RP_NAME = WEBSITE_TITLE;
export const WEBAUTHN_ORIGIN = getRequiredEnv("WEBAUTHN_ORIGIN");
export const WEBAUTHN_RP_ID = new URL(WEBAUTHN_ORIGIN).hostname;

// How long a deleted account's WebAuthn userHandle is remembered, so a later
// failed login attempt can report "account deleted" instead of "not found".
export const DELETED_ACCOUNT_TOMBSTONE_TTL = DAY * 30;
