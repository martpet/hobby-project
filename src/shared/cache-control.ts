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

export function toPrivateCacheControl(res: Response) {
  const directives = parseDirectives(res.headers.get(HEADER.CacheControl));

  directives.delete("public");
  directives.delete("s-maxage");
  directives.set("private", null);

  res.headers.set(HEADER.CacheControl, stringifyDirectives(directives));
}

export function addVaryCookie(res: Response) {
  const directives = parseDirectives(res.headers.get(HEADER.Vary));

  directives.set("cookie", null);

  res.headers.set(HEADER.Vary, stringifyDirectives(directives));
}
