import { NotFoundPage } from "@/shared/jsx/pages/NotFound.tsx";
import { acceptHtml } from "@/shared/request/headers.ts";
import { respondHtml } from "@/shared/response/html.ts";
import { Context } from "@/shared/types.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";
import { HEADER } from "@std/http/unstable-header";
import { Method } from "@std/http/unstable-method";

export function respondMethodNotAllowed(
  c: Context,
  allow: Method | Method[],
) {
  const status = STATUS_CODE["MethodNotAllowed"];
  const body = STATUS_TEXT[status];
  const headers = { [HEADER["Allow"]]: [allow].flat().join() };

  if (acceptHtml(c)) {
    return respondHtml(c, <NotFoundPage />, { status, headers });
  }

  return new Response(body, { status, headers });
}
