import { ForbiddenPage } from "@/shared/jsx/pages/Forbidden.tsx";
import { acceptHtml } from "@/shared/request/headers.ts";
import { respondHtml } from "@/shared/response/html.ts";
import { Context } from "@/shared/types.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondForbidden(c: Context, reason?: string) {
  const status = STATUS_CODE["Forbidden"];

  if (acceptHtml(c)) {
    return respondHtml(c, <ForbiddenPage reason={reason} />, { status });
  }

  return new Response(reason || STATUS_TEXT[status], { status });
}
