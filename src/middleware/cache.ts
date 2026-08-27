import { DISABLE_CACHE } from "@etc/const.ts";
import { Middleware } from "@etc/types.ts";
import { HEADER } from "@std/http/unstable-header";
import { Method } from "@std/http/unstable-method";

const cache = await caches.open("v1");

const CACHED_METHODS = new Set<Method>(["GET", "HEAD"]);

export const cacheMid: Middleware = (next) => async (c) => {
  if (DISABLE_CACHE || !CACHED_METHODS.has(c.method)) {
    return next(c);
  }

  const match = await cache.match(c.req);

  if (match) {
    match.headers.set("X-Cache", "hit");
    return match;
  }

  const res = await next(c);

  if (c.shouldCache) {
    res.headers.set(HEADER.Vary, HEADER.Cookie);
    cache.put(c.req, res.clone());
  }

  return res;
};
