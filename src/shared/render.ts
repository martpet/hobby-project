import { respondHtml } from "@shared/responses/html.ts";
import { Context } from "@shared/types.ts";
import { JSX } from "preact";
import { renderToString } from "preact-render-to-string";

export function render(c: Context, jsx: JSX.Element, init?: ResponseInit) {
  const html = "<!DOCTYPE html>" + renderToString(jsx, c);

  return respondHtml(html, init);
}
