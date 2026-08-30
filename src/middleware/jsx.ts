import { render } from "@etc/render.ts";
import { Middleware } from "@etc/types.ts";
import { VNode } from "preact";

export const jsxMid: Middleware<VNode | Response> = (next) => async (c) => {
  const resMaybe = await next(c);

  if (resMaybe instanceof Response) {
    return resMaybe;
  }

  return render(c, resMaybe);
};
