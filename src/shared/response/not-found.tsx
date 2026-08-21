import { NotFoundPage } from "@/shared/jsx/pages/NotFound.tsx";
import { acceptHtml } from "@/shared/request/headers.ts";
import { respondHtml } from "@/shared/response/html.ts";
import { Context } from "@/shared/types.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondNotFound(c: Context) {
  const status = STATUS_CODE["NotFound"];

  if (acceptHtml(c)) {
    return respondHtml(c, <NotFoundPage />, { status });
  }

  return new Response(STATUS_TEXT[status], { status });
}
