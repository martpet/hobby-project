import { requestAcceptsHtml } from "@etc/header.ts";
import { NotFoundPage } from "@etc/jsx/pages/NotFound.tsx";
import { render } from "@etc/render.ts";
import { Context } from "@etc/types.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondNotFound(c: Context) {
  const status = STATUS_CODE["NotFound"];

  if (requestAcceptsHtml(c)) {
    return render(c, <NotFoundPage />, { status });
  }

  return new Response(STATUS_TEXT[status], { status });
}
