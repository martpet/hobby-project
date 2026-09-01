import { render } from "@shared/render.ts";
import { Middleware } from "@shared/types.ts";
import { VNode } from "preact";

export const jsxMid: Middleware<VNode | Response> = (next) => async (c) => {
  const resMaybe = await next(c);

  if (resMaybe instanceof Response) {
    return resMaybe;
  }

  return render(c, resMaybe);
};
