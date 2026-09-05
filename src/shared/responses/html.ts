import { eTag } from "@std/http/etag";
import { HEADER } from "@std/http/unstable-header";

// The strong `ETag` lets clients revalidate rendered pages with
// `If-None-Match`; `conditionalMid` answers a matching one with 304.
export async function respondHtml(body: string, init?: ResponseInit) {
  const headers = new Headers(init?.headers);

  headers.set(HEADER.ContentType, "text/html; charset=utf-8");
  headers.set(HEADER.ETag, await eTag(body));

  return new Response(body, { ...init, headers });
}
