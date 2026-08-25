import { requestAcceptsHtml } from "@etc/header.ts";
import { ServerErrorPage } from "@etc/jsx/pages/ServerError.tsx";
import { respondHtml } from "@etc/responses/html.ts";
import { Context } from "@etc/types.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondServerError(c: Context, error: unknown) {
  const status = STATUS_CODE["NotFound"];

  if (requestAcceptsHtml(c)) {
    return respondHtml(c, <ServerErrorPage error={error} />, { status });
  }

  return new Response(STATUS_TEXT[status], { status });
}
