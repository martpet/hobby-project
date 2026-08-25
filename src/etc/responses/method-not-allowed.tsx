import { requestAcceptsHtml } from "@etc/header.ts";
import { NotFoundPage } from "@etc/jsx/pages/NotFound.tsx";
import { respondHtml } from "@etc/responses/html.ts";
import { Context } from "@etc/types.ts";
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

  if (requestAcceptsHtml(c)) {
    return respondHtml(c, <NotFoundPage />, { status, headers });
  }

  return new Response(body, { status, headers });
}
