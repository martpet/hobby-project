import { Context } from "@shared/context.ts";
import { requestAcceptsHtml } from "@shared/header.ts";
import { ServerErrorPage } from "@shared/jsx/pages/ServerError.tsx";
import { render } from "@shared/render.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondServerError(c: Context, error: unknown) {
  const status = STATUS_CODE["NotFound"];

  if (requestAcceptsHtml(c)) {
    return render(c, <ServerErrorPage error={error} />, { status });
  }

  return new Response(STATUS_TEXT[status], { status });
}
