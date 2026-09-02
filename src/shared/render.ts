import { respondHtml } from "@shared/responses/html.ts";
import { Context } from "@shared/types.ts";
import { VNode } from "preact";
import { render as renderToString } from "preact-render-to-string/jsx";

export function render(c: Context, vnode: VNode, init?: ResponseInit) {
  const html = `<!DOCTYPE html>\n ${renderToString(vnode, c, {})}`;

  return respondHtml(html, init);
}
