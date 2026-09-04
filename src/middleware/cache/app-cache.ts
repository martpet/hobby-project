import { getSessionCookie } from "@features/sessions/cookie.ts";
import { APP_CACHE_ENABLED } from "@shared/const.ts";
import { Middleware } from "@shared/types.ts";
import { HEADER } from "@std/http/unstable-header";
import { APP_CACHE_VERSION, CACHEABLE_METHODS } from "./const.ts";
import {
  appendCacheStatus,
  getRemainingTtl,
  notStorableReason,
} from "./helpers.ts";

let appCache: Cache;

if (APP_CACHE_ENABLED) {
  appCache = await caches.open(APP_CACHE_VERSION);
}

// Serves public GET/HEAD responses from a server-side Cache API store, keyed
// by request and versioned per deploy. Only anonymous requests are looked up
// (a session cookie bypasses the store) and only `public` 200 responses
// without `Set-Cookie` are stored. Every response gets a `Cache-Status` entry.
export const appCacheMid: Middleware = (next) => async (c) => {
  if (!CACHEABLE_METHODS.has(c.method)) {
    return appendCacheStatus(await next(c), { fwd: "method" });
  }

  if (!APP_CACHE_ENABLED) {
    return appendCacheStatus(await next(c), {
      fwd: "bypass",
      detail: "DISABLED",
    });
  }

  // The session is only resolved further down the chain (`sessionMid`), so
  // the cookie's presence is the sole signal here. Downstream caches are
  // handled separately by `cacheControlMid` once authentication is known.
  if (getSessionCookie(c)) {
    return appendCacheStatus(await next(c), {
      fwd: "bypass",
      detail: "SESSION-COOKIE",
    });
  }

  const match = await appCache.match(c.req);
  const ttl = match ? getRemainingTtl(match) : undefined;

  if (match && (ttl === undefined || ttl > 0)) {
    return appendCacheStatus(match, { hit: true, ttl });
  }

  const fwd = match ? "stale" : "miss";
  const res = await next(c);
  const detail = notStorableReason(res);

  if (detail) {
    return appendCacheStatus(res, { fwd, detail });
  }

  // Freshness counts from `Date`. Deno only adds it on the wire, so stamp it
  // here for the stored copy — unless the handler already set one (e.g. a
  // proxied upstream response), which per RFC 9111 a cache must not overwrite.
  if (!res.headers.has(HEADER.Date)) {
    res.headers.set(HEADER.Date, new Date().toUTCString());
  }

  await appCache.put(c.req, res.clone());

  return appendCacheStatus(res, { fwd, stored: true });
};
