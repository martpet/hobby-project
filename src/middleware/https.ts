import { IS_DEV } from "@shared/const.ts";
import { Middleware } from "@shared/types.ts";
import { DAY, SECOND } from "@std/datetime/constants";
import { STATUS_CODE } from "@std/http";
import { HEADER } from "@std/http/unstable-header";

const HSTS_MAX_AGE = (DAY * 365 * 2) / SECOND;
const HSTS_VALUE = `max-age=${HSTS_MAX_AGE}; includeSubDomains; preload`;

export const httpsMid: Middleware = (next) => async (c) => {
  if (IS_DEV) {
    return next(c);
  }

  if (c.url.protocol !== "https:") {
    const url = new URL(c.url);
    url.protocol = "https:";
    return Response.redirect(url, STATUS_CODE.PermanentRedirect);
  }

  const res = await next(c);
  res.headers.set(HEADER.StrictTransportSecurity, HSTS_VALUE);
  return res;
};
