import { Context } from "@shared/context.ts";
import { HEADER } from "@std/http/unstable-header";

// Distinguishes browser navigations from our own `fetch()` calls: a
// navigation sends `Accept: text/html,...` while `apiFetch` leaves the
// default `*/*`. Handlers use this to pick a redirect/HTML page vs. JSON.
export function requestAcceptsHtml(c: Context) {
  return c.req.headers.get(HEADER.Accept)?.includes("text/html") ?? false;
}

export function responseIsHtml(res: Response) {
  return res.headers.get(HEADER.ContentType)?.startsWith("text/html") ?? false;
}

export function getAcceptLanguage(req: Request) {
  return req.headers.get(HEADER.AcceptLanguage)?.split(",")[0];
}
