import { respondServerError } from "@shared/responses/server-error.tsx";
import { Middleware } from "@shared/types.ts";

// Outermost middleware. `Deno.serve` would otherwise answer a thrown error
// with a bare 500 and no logging.
export const errorMid: Middleware = (next) => async (c) => {
  try {
    const res = await next(c);
    return res;
  } catch (error) {
    console.error(error);
    return respondServerError(c, error);
  }
};
