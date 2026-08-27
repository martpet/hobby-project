import { DEFAULT_LOCALE } from "@etc/const.ts";
import { getAcceptLanguage } from "@etc/header.ts";
import { AuthenticatedContext, Context } from "@etc/types.ts";
import { Method } from "@std/http/unstable-method";

export function createContext(
  req: Request,
  info: Deno.ServeHandlerInfo<Deno.NetAddr>,
) {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host");
  const url = new URL(req.url);

  if (proto && host) {
    url.protocol = `${proto}:`;
    url.host = host;
  }

  return {
    req,
    url,
    method: req.method as Method,
    ip: req.headers.get("X-Forwarded-For") || info.remoteAddr.hostname,
    locale: getAcceptLanguage(req) ?? DEFAULT_LOCALE,
  };
}

export function isAuthenticatedContext(c: Context): c is AuthenticatedContext {
  return c.session !== undefined && c.user !== undefined;
}
