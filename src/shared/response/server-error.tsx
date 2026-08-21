import { ServerErrorPage } from "@/shared/jsx/pages/ServerError.tsx";
import { acceptHtml } from "@/shared/request/headers.ts";
import { respondHtml } from "@/shared/response/html.ts";
import { Context } from "@/shared/types.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondServerError(c: Context, error: unknown) {
  const status = STATUS_CODE["NotFound"];

  if (acceptHtml(c)) {
    return respondHtml(c, <ServerErrorPage error={error} />, { status });
  }

  return new Response(STATUS_TEXT[status], { status });
}
