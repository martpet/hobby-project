import { FlashKey } from "@features/flash/types.ts";
import { Session } from "@features/sessions/types.ts";
import { User } from "@features/users/types.ts";
import { ScriptKey } from "@shared/asset/registry.ts";
import { DEFAULT_LOCALE } from "@shared/const.ts";
import { getAcceptLanguage } from "@shared/header.ts";
import { UserAgent } from "@std/http";
import { HEADER } from "@std/http/unstable-header";
import { Method } from "@std/http/unstable-method";
import { SetRequired } from "type-fest";

export interface Context {
  req: Request;
  url: URL;
  method: Method;
  ip: string;
  locale: string;
  ua: UserAgent;
  session?: Session;
  user?: User;
  flash?: FlashKey;
  head: {
    title?: string;
    modules: Set<ScriptKey>;
    modulepreloads: Set<ScriptKey>;
    importmap: Set<ScriptKey>;
  };
}

export type AuthenticatedContext = SetRequired<Context, "user" | "session">;

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
    ua: new UserAgent(req.headers.get(HEADER.UserAgent)),
    head: {
      modules: new Set(),
      modulepreloads: new Set(),
      importmap: new Set(),
    },
  };
}

export function isAuthenticatedContext(c: Context): c is AuthenticatedContext {
  return c.session !== undefined && c.user !== undefined;
}
