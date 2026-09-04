import { APP_NAME, GIT_SHA } from "@shared/const.ts";
import { toStructuredFieldItem } from "@shared/header.ts";
import { MINUTE, SECOND } from "@std/datetime";
import { StatusCode } from "@std/http";
import { Method } from "@std/http/unstable-method";

export const APP_CACHE_VERSION = GIT_SHA || new Date().toISOString();
export const CACHEABLE_METHODS = new Set<Method>(["GET", "HEAD"]);
export const CACHEABLE_STATUS_CODES = new Set<StatusCode>([200]);
export const DEFAULT_UNAUTHENTICATED_CACHE_CONTROL = `public, max-age=${
  (5 * MINUTE) / SECOND
}`;

// The `Cache-Status` identifier must be a Structured Field Token or String.
export const CACHE_ID = toStructuredFieldItem(APP_NAME);
