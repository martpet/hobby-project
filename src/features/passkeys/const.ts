import { WEBSITE_TITLE } from "@/shared/const.ts";
import { getRequiredEnv } from "@/shared/utils/environment.ts";
import { MINUTE } from "@std/datetime";

export const WEBAUTHN_TIMEOUT_MS = MINUTE * 5;
export const WEBAUTHN_USER_VERIFICATION = "preferred";
export const WEBAUTHN_RP_NAME = WEBSITE_TITLE;
export const WEBAUTHN_ORIGIN = getRequiredEnv("WEBAUTHN_ORIGIN");
export const WEBAUTHN_RP_ID = new URL(WEBAUTHN_ORIGIN).hostname;
