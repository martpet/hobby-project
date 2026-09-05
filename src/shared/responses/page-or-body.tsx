import { Context } from "@shared/context.ts";
import { requestAcceptsHtml } from "@shared/header.ts";
import { render } from "@shared/render.ts";
import { StatusCode } from "@std/http";
import { VNode } from "preact";

// Shared by the respond* helpers that render an HTML error page for
// browser navigations, but fall back to a plain (or JSON) response
// otherwise. Pass an object as `body` to send it as JSON instead
// (e.g. `{ error, ...data }`).
export function respondPageOrBody(
  c: Context,
  page: VNode,
  body: string | object,
  init: ResponseInit & { status: StatusCode },
) {
  if (requestAcceptsHtml(c)) {
    return render(c, page, init);
  }

  if (typeof body === "string") {
    return new Response(body, init);
  }

  return Response.json(body, init);
}
