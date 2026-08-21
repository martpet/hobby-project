import { Context } from "@/shared/types.ts";
import { JSX } from "preact";
import { renderToString } from "preact-render-to-string";

export function respondHtml(c: Context, jsx: JSX.Element, init?: ResponseInit) {
  const body = "<!DOCTYPE html>" + renderToString(jsx, c);
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "text/html; charset=utf-8");

  return new Response(body, { ...init, headers });
}
