import { getBooleanEnv, getEnv } from "./environment.ts";

export const IS_DEV = getBooleanEnv("DEV");
export const GIT_SHA = getEnv("GIT_SHA");
export const WEBSITE_TITLE = "Hobby Project";
export const DEFAULT_LOCALE = "en-GB";
