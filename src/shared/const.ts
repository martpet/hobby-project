import { getBooleanEnv, getEnv, getRequiredEnv } from "./environment.ts";

export const APP_ID = "hobproj";
export const WEBSITE_TITLE = "Hobby Project";
export const DEFAULT_LOCALE = "en-GB";
export const PORT = Number(getEnv("PORT")) ?? undefined;
export const ORIGIN = getRequiredEnv("ORIGIN");
export const GIT_SHA = getEnv("GIT_SHA");
export const IS_DEV = getBooleanEnv("DEV");
export const APP_CACHE_ENABLED = getBooleanEnv("APP_CACHE_ENABLED");
