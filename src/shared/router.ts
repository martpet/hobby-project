import { Context } from "@shared/context.ts";
import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";
import { respondNotFound } from "@shared/responses/not-found.tsx";
import { Handler } from "@shared/types.ts";
import { METHOD, Method } from "@std/http/unstable-method";
import { VNode } from "preact";

export type RouteHandler = Handler<VNode | Response>;

export interface Route {
  pattern: URLPattern;
  method: Method | Method[];
  handler: RouteHandler;
}

// Matches the path first and the method second, so a known path with the
// wrong method gets 405 with `Allow` (RFC 9110 §15.5.6) rather than 404.
// A route on GET also answers HEAD; `Deno.serve` drops the body itself.
export function router(routes: Route[]): RouteHandler {
  return (c: Context) => {
    const allow = new Set<Method>();

    for (const { pattern, method, handler } of routes) {
      const match = pattern.exec(c.url.href);
      if (!match) continue;

      const methods = [method].flat();
      if (methods.includes(METHOD.Get)) methods.push(METHOD.Head);

      if (methods.includes(c.method)) {
        c.params = match.pathname.groups;
        return handler(c);
      }

      methods.forEach((m) => allow.add(m));
    }

    return allow.size
      ? respondMethodNotAllowed(c, [...allow])
      : respondNotFound(c);
  };
}
