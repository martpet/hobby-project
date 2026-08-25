import { respondRedirect } from "@etc/responses/redirect.ts";
import { Context } from "@etc/types.ts";
import { HEADER } from "@std/http/unstable-header";

export function redirectBack(c: Context) {
  const referer = c.req.headers.get(HEADER.Referer);

  const location = referer && new URL(referer).origin === c.url.origin
    ? referer
    : "/";

  return respondRedirect(location);
}
