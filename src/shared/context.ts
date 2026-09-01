import { DEFAULT_LOCALE } from "@shared/const.ts";
import { getAcceptLanguage } from "@shared/header.ts";
import { AuthenticatedContext, Context } from "@shared/types.ts";
import { Method } from "@std/http/unstable-method";

export function buildContext(
  req: Request,
  info: Deno.ServeHandlerInfo<Deno.NetAddr>,
): Context {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto");

  if (proto) {
    url.protocol = `${proto}:`;
  }

  return {
    req,
    url,
    method: req.method as Method,
    ip: req.headers.get("X-Forwarded-For") || info.remoteAddr.hostname,
    locale: getAcceptLanguage(req) ?? DEFAULT_LOCALE,
    assets: new Set(),
  };
}

export function isAuthenticatedContext(c: Context): c is AuthenticatedContext {
  return c.session !== undefined && c.user !== undefined;
}
