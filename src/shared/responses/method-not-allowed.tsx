import { Context } from "@shared/context.ts";
import { NotFoundPage } from "@shared/jsx/pages/NotFound.tsx";
import { respondPageOrBody } from "@shared/responses/page-or-body.tsx";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";
import { HEADER } from "@std/http/unstable-header";
import { Method } from "@std/http/unstable-method";

// Deliberately renders the 404 page: "this path exists but not with that
// method" is not useful to a browser user. The `Allow` header is for clients.
export function respondMethodNotAllowed(
  c: Context,
  allow: Method | Method[],
) {
  const status = STATUS_CODE["MethodNotAllowed"];
  const init = {
    status,
    headers: { [HEADER["Allow"]]: [allow].flat().join() },
  };

  return respondPageOrBody(c, <NotFoundPage />, STATUS_TEXT[status], init);
}
