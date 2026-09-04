import { getSharedFreshnessLifetime } from "@shared/cache-control.ts";
import { SECOND } from "@std/datetime";
import { StatusCode } from "@std/http";
import { HEADER } from "@std/http/unstable-header";
import { CACHE_ID, CACHEABLE_STATUS_CODES } from "./const.ts";
import { CacheStatus } from "./types.ts";

export function appendCacheStatus(res: Response, status: CacheStatus) {
  const params = [CACHE_ID];

  if ("hit" in status) {
    params.push("hit");
    if (status.ttl !== undefined) params.push(`ttl=${status.ttl}`);
  } else {
    params.push(`fwd=${status.fwd}`);
    if (status.stored) params.push("stored");
    if (status.detail) params.push(`detail=${status.detail}`);
  }

  res.headers.append(HEADER.CacheStatus, params.join("; "));

  return res;
}

// Returns why the response must not be stored, or `undefined` if it may be.
export function notStorableReason(res: Response) {
  if (!CACHEABLE_STATUS_CODES.has(res.status as StatusCode)) {
    return "STATUS";
  }

  if (res.headers.has(HEADER.SetCookie)) {
    return "SET-COOKIE";
  }

  const cacheControl = res.headers.get(HEADER.CacheControl) ?? "";

  if (cacheControl.includes("no-store")) {
    return "NO-STORE";
  }

  if (cacheControl.includes("private")) {
    return "PRIVATE";
  }

  if (!cacheControl.includes("public")) {
    return "NOT-PUBLIC";
  }
}

// Unlike Deno Deploy's hosted cache, the Deno CLI Cache API (used on our
// self-hosted server) ignores `max-age`/`Expires` and never evicts by
// freshness, so it is checked here against the `Date` recorded on store.
// Returns remaining freshness in whole seconds, or `undefined` if unknown.
export function getRemainingTtl(res: Response) {
  const lifetime = getSharedFreshnessLifetime(res);
  const storedAt = Date.parse(res.headers.get(HEADER.Date) ?? "");

  if (lifetime === undefined || Number.isNaN(storedAt)) {
    return undefined;
  }

  return Math.floor((storedAt + lifetime * SECOND - Date.now()) / SECOND);
}
