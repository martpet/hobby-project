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

// RFC 8941 Token: `[A-Za-z*]` followed by tchar / ":" / "/".
const STRUCTURED_FIELD_TOKEN = /^[A-Za-z*][A-Za-z0-9!#$%&'*+\-.^_`|~:/]*$/;

// Serialises a value as an RFC 8941 Structured Field item: a bare Token when
// possible, otherwise a quoted String.
export function toStructuredFieldItem(value: string) {
  return STRUCTURED_FIELD_TOKEN.test(value) ? value : JSON.stringify(value);
}
