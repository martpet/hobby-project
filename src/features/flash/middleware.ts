import { responseIsHtml } from "@etc/header.ts";
import { Middleware } from "@etc/types.ts";
import { deleteFlashCookie, getFlashCookie } from "./cookie.ts";

export const flashMid: Middleware = (next) => async (c) => {
  const flash = getFlashCookie(c);

  c.flash = flash;

  const res = await next(c);

  if (
    flash &&
    c.method === "GET" &&
    responseIsHtml(res)
  ) {
    deleteFlashCookie(res);
  }

  return res;
};
