import { respondHtml } from "@shared/responses/html.ts";
import { Context } from "@shared/types.ts";
import { VNode } from "preact";
import { renderToString } from "preact-render-to-string";

export function render(c: Context, vnode: VNode, init?: ResponseInit) {
  const html = "<!DOCTYPE html>" + renderToString(vnode, c);

  return respondHtml(html, init);
}
