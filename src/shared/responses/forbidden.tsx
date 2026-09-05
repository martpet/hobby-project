import { Context } from "@shared/context.ts";
import { ForbiddenPage } from "@shared/jsx/pages/Forbidden.tsx";
import { respondPageOrBody } from "@shared/responses/page-or-body.tsx";
import { STATUS_CODE } from "@std/http";
import { ProblemDetailsExtensions } from "@std/http/unstable-problem-details";

// `code` is a machine-readable error code (e.g. "REAUTH_REQUIRED") that the
// client-side scripts branch on; it's a Problem Details extension member,
// not the standard `detail` member, per RFC 9457 §3.1 (clients MUST NOT
// parse `detail`/`title` for information). `detail`, if given, is the
// human-readable explanation of this occurrence — shown as-is by clients
// instead of hardcoding a message per `code`. `extensions`, if any, are
// merged in alongside `code` (e.g. a WebAuthn `signal`).
export function respondForbidden(
  c: Context,
  opts?: {
    code?: string;
    detail?: string;
    extensions?: ProblemDetailsExtensions;
    init?: ResponseInit;
  },
) {
  const { code, detail, extensions, init } = opts ?? {};
  const status = STATUS_CODE["Forbidden"];

  return respondPageOrBody(
    c,
    <ForbiddenPage detail={detail} />,
    { ...init, status },
    { ...extensions, detail, ...(code && { code }) },
  );
}
