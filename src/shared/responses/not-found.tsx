import { Context } from "@shared/context.ts";
import { requestAcceptsHtml } from "@shared/header.ts";
import { NotFoundPage } from "@shared/jsx/pages/NotFound.tsx";
import { render } from "@shared/render.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondNotFound(c: Context) {
  const status = STATUS_CODE["NotFound"];

  if (requestAcceptsHtml(c)) {
    return render(c, <NotFoundPage />, { status });
  }

  return new Response(STATUS_TEXT[status], { status });
}
