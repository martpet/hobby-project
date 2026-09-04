import { respondRedirect } from "@shared/responses/redirect.ts";
import { Middleware } from "@shared/types.ts";
import { STATUS_CODE } from "@std/http";

export const trailingSlashMid: Middleware = (next) => async (c) => {
  const res = await next(c);

  if (
    c.url.pathname.endsWith("/") &&
    c.url.pathname !== "/" &&
    res.status === STATUS_CODE.NotFound
  ) {
    const url = new URL(c.url);

    url.pathname = url.pathname.slice(0, -1);

    return respondRedirect(url.href, "PermanentRedirect");
  }

  return res;
};
