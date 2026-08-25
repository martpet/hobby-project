import { respondServerError } from "@etc/responses/server-error.tsx";
import { Middleware } from "@etc/types.ts";

export const errorMid: Middleware = (next) => async (c) => {
  try {
    const res = await next(c);
    return res;
  } catch (error) {
    console.error(error);
    return respondServerError(c, error);
  }
};
