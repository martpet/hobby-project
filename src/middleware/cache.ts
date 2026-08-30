import { IS_DEV } from "@etc/const.ts";
import { isAuthenticatedContext } from "@etc/context.ts";
import { addVaryCookie, toPrivateCacheControl } from "@etc/header.ts";
import { Middleware } from "@etc/types.ts";
import { getSessionCookie } from "@features/sessions/cookie.ts";
import { MINUTE } from "@std/datetime/constants";
import { StatusCode } from "@std/http";
import { HEADER } from "@std/http/unstable-header";
import { Method } from "@std/http/unstable-method";

const APP_CACHE_ENABLED = false;
const CACHEABLE_METHODS = new Set<Method>(["GET", "HEAD"]);
const CACHEABLE_STATUS_CODES = new Set<StatusCode>([200]);
const DEFAULT_UNAUTHENTICATED_CACHE_CONTROL = `public, max-age=${
  5 * MINUTE / 1000
}`;

let appCache: Cache;

if (APP_CACHE_ENABLED) {
  appCache = await caches.open("app-cache");
}

export const cacheMid: Middleware = (next) => async (c) => {
  if (IS_DEV || !CACHEABLE_METHODS.has(c.method)) {
    return next(c);
  }

  if (APP_CACHE_ENABLED && !getSessionCookie(c)) {
    const match = await appCache.match(c.req);

    if (match) {
      match.headers.set("X-App-Cache", "hit");
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

  if (finalCacheControl && !finalCacheControl.includes("no-store")) {
    addVaryCookie(res);
  }

  if (
    APP_CACHE_ENABLED &&
    finalCacheControl.includes("public") &&
    !finalCacheControl.includes("no-store")
  ) {
    await appCache.put(c.req, res.clone());
  }

  return res;
};
