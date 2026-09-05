import { Context } from "@shared/context.ts";
import { UnauthorizedPage } from "@shared/jsx/pages/Unauthorized.tsx";
import { respondPageOrBody } from "@shared/responses/page-or-body.tsx";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondUnauthorized(c: Context, heading?: string) {
  const status = STATUS_CODE["Unauthorized"];

  return respondPageOrBody(
    c,
    <UnauthorizedPage heading={heading} />,
    STATUS_TEXT[status],
    { status },
  );
}
