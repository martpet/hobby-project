import { GIT_SHA } from "@shared/const.ts";

export const ASSET_VERSION = GIT_SHA;
export const VERSION_PARAM = "v";

// Cache-busting via `?v=<git sha>`; `handleAsset` marks such requests
// immutable for a year. Without a SHA (local dev) paths are left bare.
export function assetPath(path: string) {
  return ASSET_VERSION ? `${path}?${VERSION_PARAM}=${ASSET_VERSION}` : path;
}
