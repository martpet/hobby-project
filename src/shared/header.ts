import { Context } from "@shared/types.ts";
import { HEADER } from "@std/http/unstable-header";

function parseDirectives(header: string | null) {
  if (!header) return [];
  return header.split(",").map((directive) => directive.trim()).filter(Boolean);
}

export function requestAcceptsHtml(c: Context) {
  return c.req.headers.get(HEADER.Accept)?.includes("text/html") ?? false;
}

export function responseIsHtml(res: Response) {
  return res.headers.get(HEADER.ContentType)?.startsWith("text/html") ?? false;
}

export function getAcceptLanguage(req: Request) {
  return req.headers.get(HEADER.AcceptLanguage)?.split(",")[0];
}

export function cacheNoStore(res: Response) {
  res.headers.set(HEADER.CacheControl, "no-store");
}

export function toPrivateCacheControl(res: Response) {
  const header = res.headers.get(HEADER.CacheControl) ?? "";
  const directives = parseDirectives(header).filter((directive) => {
    const name = directive.split("=")[0].trim().toLowerCase();
    return name !== "public" && name !== "s-maxage";
  });
  directives.unshift("private");
  res.headers.set(HEADER.CacheControl, directives.join(", "));
}

export function addVaryCookie(res: Response) {
  const directives = parseDirectives(res.headers.get(HEADER.Vary));

  if (directives.some((d) => d.toLowerCase() === "cookie")) {
    return;
  }

  res.headers.set(HEADER.Vary, [...directives, "Cookie"].join(", "));
}
