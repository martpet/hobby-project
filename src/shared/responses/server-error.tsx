import { Context } from "@shared/context.ts";
import { ServerErrorPage } from "@shared/jsx/pages/ServerError.tsx";
import { respondPageOrBody } from "@shared/responses/page-or-body.tsx";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondServerError(c: Context, error: unknown) {
  const status = STATUS_CODE["InternalServerError"];

  return respondPageOrBody(
    c,
    <ServerErrorPage error={error} />,
    STATUS_TEXT[status],
    { status },
  );
}
