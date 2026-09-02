import { getSessionCookie } from "@features/sessions/cookie.ts";
import { GIT_SHA, IS_DEV } from "@shared/const.ts";
import { isAuthenticatedContext } from "@shared/context.ts";
import { addVaryCookie, toPrivateCacheControl } from "@shared/header.ts";
import { Middleware } from "@shared/types.ts";
import { MINUTE, SECOND } from "@std/datetime";
import { StatusCode } from "@std/http";
import { HEADER } from "@std/http/unstable-header";
import { Method } from "@std/http/unstable-method";

const LOCAL_CACHE_ENABLED = false;
const LOCAL_CACHE_VERSION = GIT_SHA || new Date().toISOString();
const CACHEABLE_METHODS = new Set<Method>(["GET", "HEAD"]);
const CACHEABLE_STATUS_CODES = new Set<StatusCode>([200]);
const DEFAULT_UNAUTHENTICATED_CACHE_CONTROL = `public, max-age=${
  (5 * MINUTE) / SECOND
}`;

let localCache: Cache;

if (LOCAL_CACHE_ENABLED) {
  localCache = await caches.open(LOCAL_CACHE_VERSION);
}

export const cacheMid: Middleware = (next) => async (c) => {
  if (IS_DEV || !CACHEABLE_METHODS.has(c.method)) {
    return next(c);
  }

  if (LOCAL_CACHE_ENABLED && !getSessionCookie(c)) {
    const match = await localCache.match(c.req);

    if (match) {
      match.headers.set("X-Local-Cache", "hit");
      return match;
    }
  }

  const res = await next(c);

  if (!CACHEABLE_STATUS_CODES.has(res.status as StatusCode)) {
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

  if (
    LOCAL_CACHE_ENABLED &&
    finalCacheControl.includes("public") &&
    !finalCacheControl.includes("no-store")
  ) {
    await localCache.put(c.req, res.clone());
  }

  return res;
};
