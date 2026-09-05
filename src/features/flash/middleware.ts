import { cacheNoStoreOnCookieChange } from "@shared/cache-control.ts";
import { responseIsHtml } from "@shared/header.ts";
import { Middleware } from "@shared/types.ts";
import { deleteFlashCookie, getFlashCookie, hasFlashCookie } from "./cookie.ts";

export const flashMid: Middleware = (next) => async (c) => {
  c.flash = getFlashCookie(c);

  const res = await next(c);

  // Clear the cookie once shown — or immediately if its value is unknown, so
  // a stale cookie doesn't keep being sent.
  if (hasFlashCookie(c) && c.method === "GET" && responseIsHtml(res)) {
    deleteFlashCookie(res.headers);
    cacheNoStoreOnCookieChange(c, res.headers);
  }

  return res;
};
