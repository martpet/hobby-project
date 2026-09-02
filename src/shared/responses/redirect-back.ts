import { Context } from "@shared/context.ts";
import { respondRedirect } from "@shared/responses/redirect.ts";
import { HEADER } from "@std/http/unstable-header";

export function redirectBack(c: Context) {
  const referer = c.req.headers.get(HEADER.Referer);

  const location = referer && new URL(referer).origin === c.url.origin
    ? referer
    : "/";

  return respondRedirect(location);
}
