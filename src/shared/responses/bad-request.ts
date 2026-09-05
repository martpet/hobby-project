import { STATUS_CODE } from "@std/http";
import { createProblemDetailsResponse } from "@std/http/unstable-problem-details";

// `detail` is a human-readable explanation of this occurrence (RFC 9457
// §3.1), safe for clients to display as-is.
export function respondBadRequest(
  opts?: { detail?: string; init?: ResponseInit },
) {
  const { detail, init } = opts ?? {};
  const status = STATUS_CODE["BadRequest"];

  return createProblemDetailsResponse(
    { status, detail },
    { headers: init?.headers, statusText: init?.statusText },
  );
}
