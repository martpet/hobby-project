import { requestAcceptsHtml } from "@shared/header.ts";
import { ForbiddenPage } from "@shared/jsx/pages/Forbidden.tsx";
import { render } from "@shared/render.ts";
import { Context } from "@shared/types.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondForbidden(c: Context, reason?: string) {
  const status = STATUS_CODE["Forbidden"];

  if (requestAcceptsHtml(c)) {
    return render(c, <ForbiddenPage reason={reason} />, { status });
  }

  return new Response(reason || STATUS_TEXT[status], { status });
}
