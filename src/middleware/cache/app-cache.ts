import { getSessionCookie } from "@features/sessions/cookie.ts";
import { APP_CACHE_ENABLED } from "@shared/const.ts";
import { Middleware } from "@shared/types.ts";
import { HEADER } from "@std/http/unstable-header";
import { METHOD } from "@std/http/unstable-method";
import { APP_CACHE_VERSION, CACHEABLE_METHODS } from "./const.ts";
import {
  appendCacheStatus,
  getRemainingTtl,
  invalidateAfterUnsafeRequest,
  notStorableReason,
} from "./helpers.ts";

let appCache: Cache;

if (APP_CACHE_ENABLED) {
  appCache = await caches.open(APP_CACHE_VERSION);
}

// Serves public GET/HEAD responses from a server-side Cache API instance, keyed
// by request and versioned per deploy. Only anonymous requests are looked up
// (a session cookie bypasses the cache) and only `public` 200 responses
// without `Set-Cookie` are stored. HEAD is answered from the GET entry with
// the body stripped (RFC 9111 §4.3.5) and never stores. Unsafe requests evict
// what they may have changed. Every response gets a `Cache-Status` entry.
export const appCacheMid: Middleware = (next) => async (c) => {
  if (!CACHEABLE_METHODS.has(c.method)) {
    const res = await next(c);

    if (APP_CACHE_ENABLED) {
      await invalidateAfterUnsafeRequest(appCache, c, res);
    }

    return appendCacheStatus(res, { fwd: "method" });
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

  // The Cache API only keys GET requests, so a HEAD shares its GET's entry.
  const isHead = c.method === METHOD.Head;
  const cacheKey = isHead ? new Request(c.req, { method: METHOD.Get }) : c.req;

  const match = await appCache.match(cacheKey);
  const ttl = match ? getRemainingTtl(match) : undefined;

  if (match && (ttl === undefined || ttl > 0)) {
    return appendCacheStatus(isHead ? new Response(null, match) : match, {
      hit: true,
      ttl,
    });
  }

  const fwd = match ? "stale" : "miss";
  const res = await next(c);

  // A HEAD response has no body to store; it would poison the GET entry.
  const detail = isHead ? "HEAD" : notStorableReason(res);

  if (detail) {
    return appendCacheStatus(res, { fwd, detail });
  }

  // Freshness counts from `Date`. Deno only adds it on the wire, so stamp it
  // here for the stored copy — unless the handler already set one (e.g. a
  // proxied upstream response), which per RFC 9111 a cache must not overwrite.
  if (!res.headers.has(HEADER.Date)) {
    res.headers.set(HEADER.Date, new Date().toUTCString());
  }

  await appCache.put(cacheKey, res.clone());

  return appendCacheStatus(res, { fwd, stored: true });
};
