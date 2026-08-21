import { UnauthorizedPage } from "@/shared/jsx/pages/Unauthorized.tsx";
import { acceptHtml } from "@/shared/request/headers.ts";
import { respondHtml } from "@/shared/response/html.ts";
import { Context } from "@/shared/types.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondUnauthorized(c: Context, heading?: string) {
  const status = STATUS_CODE["Unauthorized"];

  if (acceptHtml(c)) {
    return respondHtml(c, <UnauthorizedPage heading={heading} />, { status });
  }

  return new Response(STATUS_TEXT[status], { status });
}
