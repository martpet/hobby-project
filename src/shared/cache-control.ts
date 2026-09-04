import { Context } from "@shared/context.ts";
import { isWebKit } from "@shared/header.ts";
import { HEADER } from "@std/http/unstable-header";

function parseDirectives(header: string | null) {
  const directives = new Map<Lowercase<string>, string | null>();

  if (!header) return directives;

  for (const raw of header.split(",")) {
    const directive = raw.trim();
    if (!directive) continue;
    const [name, value] = directive.split("=");
    directives.set(
      name.trim().toLowerCase() as Lowercase<string>,
      value !== undefined ? value.trim() : null,
    );
  }

  return directives;
}

function stringifyDirectives(directives: Map<string, string | null>) {
  return [...directives].map(([name, value]) =>
    value !== null ? `${name}=${value}` : name
  ).join(", ");
}

export function cacheNoStore(res: Response) {
  res.headers.set(HEADER.CacheControl, "no-store");
}

// Call this on any cacheable response that changes a cookie the response
// varies on (via Set-Cookie). WebKit records the `Vary: Cookie` value for a
// stored entry from the cookie jar *after* applying the response's
// Set-Cookie, so it files such a response under the wrong variant and may
// later serve it to a request whose cookies never produced it.
// Upstream bug: https://bugs.webkit.org/show_bug.cgi?id=323342 (remove this
// workaround once it is fixed and the fix has shipped). FIXME in
// headerValueForVary, WebCore/platform/network/CacheValidation.cpp:
// https://github.com/WebKit/WebKit/blob/7d09127ca947791dc0a72109466a9b0433ab898e/Source/WebCore/platform/network/CacheValidation.cpp#L413
// This affects every WebKit browser (Safari, all iOS browsers, Epiphany);
// Blink and Gecko snapshot the request's Cookie header and need nothing.
// `max-age=0, must-revalidate` would be the only equivalent alternative;
// `Vary` tricks are not (Vary only matches *request* headers).
export function cacheNoStoreOnCookieChange(c: Context, res: Response) {
  if (isWebKit(c.ua.engine)) {
    cacheNoStore(res);
  }
}

export function toPrivateCacheControl(res: Response) {
  const directives = parseDirectives(res.headers.get(HEADER.CacheControl));

  directives.delete("public");
  directives.delete("s-maxage");
  directives.set("private", null);

  res.headers.set(HEADER.CacheControl, stringifyDirectives(directives));
}

// Freshness lifetime in seconds for a shared cache (`s-maxage` wins over
// `max-age`), or `undefined` when the response does not declare one.
export function getSharedFreshnessLifetime(res: Response) {
  const directives = parseDirectives(res.headers.get(HEADER.CacheControl));
  const value = directives.get("s-maxage") ?? directives.get("max-age");
  const seconds = value === null || value === undefined ? NaN : Number(value);

  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

export function addVaryCookie(res: Response) {
  const directives = parseDirectives(res.headers.get(HEADER.Vary));

  directives.set("cookie", null);

  res.headers.set(HEADER.Vary, stringifyDirectives(directives));
}
