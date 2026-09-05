import { Context } from "@shared/context.ts";
import { ForbiddenPage } from "@shared/jsx/pages/Forbidden.tsx";
import { respondPageOrBody } from "@shared/responses/page-or-body.tsx";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

// `reason` doubles as a machine-readable error code: for non-HTML requests it
// becomes the response body (or the `error` field when `data` is present),
// and the client-side scripts branch on it (e.g. "ReauthRequired").
export function respondForbidden(
  c: Context,
  opts?: {
    reason?: string;
    data?: Record<string, unknown>;
    init?: ResponseInit;
  },
) {
  const { reason, data, init } = opts ?? {};
  const status = STATUS_CODE["Forbidden"];
  const errorMsg = reason || STATUS_TEXT[status];
  const body = data ? { error: errorMsg, ...data } : errorMsg;

  return respondPageOrBody(
    c,
    <ForbiddenPage reason={reason} />,
    body,
    { ...init, status },
  );
}
