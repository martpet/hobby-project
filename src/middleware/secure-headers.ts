import { Middleware } from "@etc/types.ts";
import { HEADER } from "@std/http/unstable-header";

export const secureHeadersMid: Middleware = (next) => async (c) => {
  const res = await next(c);

  res.headers.set(HEADER.XContentTypeOptions, "nosniff");
  res.headers.set(HEADER.XFrameOptions, "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(HEADER.CrossOriginOpenerPolicy, "same-origin");
  res.headers.set(HEADER.CrossOriginResourcePolicy, "same-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  res.headers.set("X-XSS-Protection", "0");

  return res;
};
