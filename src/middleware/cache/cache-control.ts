import {
  CACHEABLE_METHODS,
  CACHEABLE_STATUS_CODES,
  DEFAULT_UNAUTHENTICATED_CACHE_CONTROL,
} from "./const.ts";
import { addVaryCookie, toPrivateCacheControl } from "@shared/cache-control.ts";
import { isAuthenticatedContext } from "@shared/context.ts";
import { Middleware } from "@shared/types.ts";
import { StatusCode } from "@std/http";
import { HEADER } from "@std/http/unstable-header";

// Sets `Cache-Control`/`Vary` on cacheable responses for downstream caches
// (browser, CDN): authenticated responses become `private`, anonymous ones
// without an explicit policy get the public default, and anything revalidated
// against cookies gets `Vary: Cookie`. Composed inside `appCacheMid` (so
// stored responses carry these headers) and outside `sessionMid` (so
// `isAuthenticatedContext` reflects the resolved session).
export const cacheControlMid: Middleware = (next) => async (c) => {
  const res = await next(c);

  if (
    !CACHEABLE_METHODS.has(c.method) ||
    !CACHEABLE_STATUS_CODES.has(res.status as StatusCode)
  ) {
    return res;
  }

  const cacheControl = res.headers.get(HEADER.CacheControl) ?? "";

  if (isAuthenticatedContext(c)) {
    toPrivateCacheControl(res);
  } else if (!cacheControl) {
    res.headers.set(HEADER.CacheControl, DEFAULT_UNAUTHENTICATED_CACHE_CONTROL);
  }

  const finalCacheControl = res.headers.get(HEADER.CacheControl) ?? "";

  if (
    finalCacheControl &&
    !finalCacheControl.includes("no-store") &&
    !finalCacheControl.includes("immutable")
  ) {
    addVaryCookie(res);
  }

  return res;
};
