import { GIT_SHA } from "@shared/const.ts";

export const ASSET_VERSION = GIT_SHA;
export const VERSION_PARAM = "v";

export function assetPath(path: string) {
  return ASSET_VERSION ? `${path}?${VERSION_PARAM}=${ASSET_VERSION}` : path;
}
