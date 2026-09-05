import { getBooleanEnv, getEnv, getRequiredEnv } from "./environment.ts";

const port = getEnv("PORT");

export const APP_ID = "hobproj";
export const WEBSITE_TITLE = "Hobby Project";
export const DEFAULT_LOCALE = "en-GB";
// Unset → `Deno.serve` default (8000).
export const PORT = port ? Number(port) : undefined;
export const ORIGIN = getRequiredEnv("ORIGIN");
// Set by the deploy script via a systemd drop-in; drives asset versioning
// and the per-deploy app cache name. Absent in local dev.
export const GIT_SHA = getEnv("GIT_SHA");
export const IS_DEV = getBooleanEnv("DEV");
export const APP_CACHE_ENABLED = getBooleanEnv("APP_CACHE_ENABLED");
