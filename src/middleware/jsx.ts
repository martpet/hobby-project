import { respondHtml } from "@etc/responses/html.ts";
import { Middleware } from "@etc/types.ts";
import { VNode } from "preact";

export const jsxMid: Middleware<VNode | Response> = (next) => async (c) => {
  const resMaybe = await next(c);

  if (resMaybe instanceof Response) {
    return resMaybe;
  }

  return respondHtml(c, resMaybe);
};
