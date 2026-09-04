import { getBooleanEnv, getEnv, getRequiredEnv } from "./environment.ts";

export const IS_DEV = getBooleanEnv("DEV");
export const APP_NAME = getRequiredEnv("APP_NAME");
export const APP_CACHE_ENABLED = getBooleanEnv("APP_CACHE_ENABLED");
export const GIT_SHA = getEnv("GIT_SHA");
export const WEBSITE_TITLE = "Hobby Project";
export const DEFAULT_LOCALE = "en-GB";
