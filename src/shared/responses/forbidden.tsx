import { Context } from "@shared/context.ts";
import { requestAcceptsHtml } from "@shared/header.ts";
import { ForbiddenPage } from "@shared/jsx/pages/Forbidden.tsx";
import { render } from "@shared/render.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondForbidden(
  c: Context,
  reason?: string,
  data?: Record<string, unknown>,
  init?: ResponseInit,
) {
  const status = STATUS_CODE["Forbidden"];

  if (requestAcceptsHtml(c)) {
    return render(c, <ForbiddenPage reason={reason} />, { ...init, status });
  }

  const msg = reason || STATUS_TEXT[status];

  if (data) {
    return Response.json({ error: msg, ...data }, { ...init, status });
  }

  return new Response(msg, { ...init, status });
}
