import { Context } from "@shared/context.ts";
import { respondHtml } from "@shared/responses/html.ts";
import { VNode } from "preact";
import { renderToStringAsync } from "preact-render-to-string";

const SUSPENSE_MARKERS = /<!--\/?\$s-->/g;

export async function render(c: Context, vnode: VNode, init?: ResponseInit) {
  const rendered = await renderToStringAsync(vnode, c);
  const html = "<!DOCTYPE html>" + rendered.replaceAll(SUSPENSE_MARKERS, "");

  return respondHtml(html, init);
}
