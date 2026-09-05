import { STATUS_CODE } from "@std/http";
import { createProblemDetailsResponse } from "@std/http/unstable-problem-details";

// `code` is a machine-readable error code (e.g. "USERNAME_TAKEN"); see
// respondForbidden for why it's a `code` extension, not the standard
// `detail` member. `detail`, if given, is a human-readable explanation of
// this occurrence, safe for clients to display as-is.
export function respondConflict(
  code?: string,
  opts?: { detail?: string; init?: ResponseInit },
) {
  const { detail, init } = opts ?? {};
  const status = STATUS_CODE["Conflict"];

  return createProblemDetailsResponse(
    { status, detail, ...(code && { code }) },
    { headers: init?.headers, statusText: init?.statusText },
  );
}
