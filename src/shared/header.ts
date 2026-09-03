import { Context } from "@shared/context.ts";
import { Engine } from "@std/http";
import { HEADER } from "@std/http/unstable-header";

export function requestAcceptsHtml(c: Context) {
  return c.req.headers.get(HEADER.Accept)?.includes("text/html") ?? false;
}

export function responseIsHtml(res: Response) {
  return res.headers.get(HEADER.ContentType)?.startsWith("text/html") ?? false;
}

export function getAcceptLanguage(req: Request) {
  return req.headers.get(HEADER.AcceptLanguage)?.split(",")[0];
}

export function isWebKit(engine: Engine) {
  return engine.name === "WebKit";
}
