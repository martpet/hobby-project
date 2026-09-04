import { ORIGIN, WEBSITE_TITLE } from "@shared/const.ts";
import { MINUTE } from "@std/datetime";

export const WEBAUTHN_TIMEOUT = 5 * MINUTE;
export const WEBAUTHN_USER_VERIFICATION = "preferred";
export const WEBAUTHN_RP_NAME = WEBSITE_TITLE;
export const WEBAUTHN_ORIGIN = ORIGIN;
export const WEBAUTHN_RP_ID = new URL(WEBAUTHN_ORIGIN).hostname;
