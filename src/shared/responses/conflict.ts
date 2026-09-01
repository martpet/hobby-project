import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondConflict(body?: string) {
  const status = STATUS_CODE["Conflict"];
  const bodyUsed = body || STATUS_TEXT[status];

  return new Response(bodyUsed, { status });
}
