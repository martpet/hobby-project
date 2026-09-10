import {
  getBooleanEnv,
  getEnv,
  getEnvName,
  getRequiredEnv,
} from "./environment.ts";

export const APP_ORIGIN = getRequiredEnv("APP_ORIGIN");
export const APP_ID = "hobproj";
export const WEBSITE_TITLE = "Hobproj";
export const DEFAULT_LOCALE = "en-GB";
// Set by the deploy script via a systemd drop-in; drives asset versioning
// and the per-deploy server cache name. Absent in local dev.
export const GIT_SHA = getEnv("GIT_SHA");
export const ENV_NAME = getEnvName();
export const IS_DEV = ENV_NAME === "dev";
export const SERVER_CACHE_ENABLED = getBooleanEnv("SERVER_CACHE_ENABLED");
