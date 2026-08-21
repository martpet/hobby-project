import { respondForbidden } from "@/shared/response/forbidden.tsx";
import { Middleware } from "@/shared/types.ts";
import { Method } from "@std/http/unstable-method";

const WEBHOOK_PREFIX = "/webhook/";
const ALLOWED_SEC_FETCH = ["same-origin"];
const SAFE_METHODS = new Set<Method>(["GET", "HEAD", "OPTIONS"]);

export const csrfMid: Middleware = (next) => (c) => {
  if (c.url.pathname.startsWith(WEBHOOK_PREFIX)) {
    return next(c);
  }

  if (SAFE_METHODS.has(c.method)) {
    return next(c);
  }

  const originHeader = c.req.headers.get("origin");
  const secFetchHeader = c.req.headers.get("sec-fetch-site");

  const originOk = originHeader === c.url.origin;
  const secFetchOk = secFetchHeader &&
    ALLOWED_SEC_FETCH.includes(secFetchHeader);

  if (originOk || secFetchOk) {
    return next(c);
  }

  return respondForbidden(c, "CSRF validation failed");
};
