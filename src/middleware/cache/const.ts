import { DEFAULT_MAX_AGE } from "@shared/cache-control.ts";
import { APP_ID, GIT_SHA } from "@shared/const.ts";
import { toStructuredFieldItem } from "@shared/header.ts";
import { STATUS_CODE, StatusCode } from "@std/http";
import { METHOD, Method } from "@std/http/unstable-method";

export const APP_CACHE_VERSION = GIT_SHA || new Date().toISOString();
export const CACHEABLE_METHODS = new Set<Method>([METHOD.Get, METHOD.Head]);

// Statuses that get `Cache-Control`/`Vary` handling for downstream caches.
// 404 is here so its handler-set policy still gets `Vary: Cookie` and turns
// `private` when authenticated.
export const CACHEABLE_STATUS_CODES = new Set<StatusCode>([
  STATUS_CODE.OK,
  STATUS_CODE.NotFound,
]);

// Statuses the app cache stores. Narrower than above: 404s are cheap to
// render and would let URL enumeration grow the app cache unboundedly.
export const STORABLE_STATUS_CODES = new Set<StatusCode>([STATUS_CODE.OK]);

// Applied to cacheable responses from unauthenticated requests that set no
// policy themselves. Never use for an authenticated response: it is `public`.
export const DEFAULT_UNAUTHENTICATED_CACHE_CONTROL =
  `public, max-age=${DEFAULT_MAX_AGE}`;

// The `Cache-Status` identifier must be a Structured Field Token or String.
export const CACHE_ID = toStructuredFieldItem(APP_ID);
