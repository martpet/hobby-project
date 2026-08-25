import { requestAcceptsHtml } from "@etc/header.ts";
import { ForbiddenPage } from "@etc/jsx/pages/Forbidden.tsx";
import { respondHtml } from "@etc/responses/html.ts";
import { Context } from "@etc/types.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondForbidden(c: Context, reason?: string) {
  const status = STATUS_CODE["Forbidden"];

  if (requestAcceptsHtml(c)) {
    return respondHtml(c, <ForbiddenPage reason={reason} />, { status });
  }

  return new Response(reason || STATUS_TEXT[status], { status });
}
