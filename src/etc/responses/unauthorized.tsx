import { requestAcceptsHtml } from "@etc/header.ts";
import { UnauthorizedPage } from "@etc/jsx/pages/Unauthorized.tsx";
import { respondHtml } from "@etc/responses/html.ts";
import { Context } from "@etc/types.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondUnauthorized(c: Context, heading?: string) {
  const status = STATUS_CODE["Unauthorized"];

  if (requestAcceptsHtml(c)) {
    return respondHtml(c, <UnauthorizedPage heading={heading} />, { status });
  }

  return new Response(STATUS_TEXT[status], { status });
}
