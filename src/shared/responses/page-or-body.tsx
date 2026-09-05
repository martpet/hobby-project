import { Context } from "@shared/context.ts";
import { requestAcceptsHtml } from "@shared/header/negotiation.ts";
import { render } from "@shared/render.ts";
import { StatusCode } from "@std/http";
import {
  createProblemDetailsResponse,
  ProblemDetails,
  ProblemDetailsExtensions,
} from "@std/http/unstable-problem-details";
import { VNode } from "preact";

// Shared by the respond* helpers that render an HTML error page for browser
// navigations, but fall back to a Problem Details (RFC 9457) JSON response
// otherwise. `problem` is built from the RFC's own `ProblemDetails` type
// (minus `status`, which comes from `init.status`): `detail` is a
// human-readable explanation of this occurrence (RFC 9457 §3.1); a
// machine-readable code, if any, belongs in an extension member instead (by
// convention `code`, e.g. `{ code: "REAUTH_REQUIRED" }`) since clients must
// not parse `detail`/`title` for that. (Threading `ProblemDetailsExtensions`
// through `ProblemDetails`' own generic doesn't type-check here — the
// unresolved type parameter defaults to `Record<string, never>`, which
// collapses every field, including `detail`, to `never` — so `detail` is
// picked directly and extensions are intersected in concretely instead.)
export function respondPageOrBody(
  c: Context,
  page: VNode,
  init: ResponseInit & { status: StatusCode },
  problem?: Pick<ProblemDetails, "detail"> & ProblemDetailsExtensions,
) {
  if (requestAcceptsHtml(c)) {
    return render(c, page, init);
  }

  const { headers, status, statusText } = init;

  return createProblemDetailsResponse(
    { ...problem, status },
    { headers, statusText },
  );
}
