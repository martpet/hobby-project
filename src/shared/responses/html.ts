import { HEADER } from "@std/http/unstable-header";

export function respondHtml(body: string, init?: ResponseInit) {
  const headers = new Headers(init?.headers);

  headers.set(HEADER.ContentType, "text/html; charset=utf-8");

  return new Response(body, { ...init, headers });
}
