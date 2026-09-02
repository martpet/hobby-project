import { cacheNoStore } from "@shared/cache-control.ts";
import { isSafari, responseIsHtml } from "@shared/header.ts";
import { Middleware } from "@shared/types.ts";
import { deleteFlashCookie, getFlashCookie } from "./cookie.ts";

export const flashMid: Middleware = (next) => async (c) => {
  const flash = getFlashCookie(c);

  c.flash = flash;

  const res = await next(c);

  if (flash && c.method === "GET" && responseIsHtml(res)) {
    deleteFlashCookie(res);

    if (isSafari(c.ua.browser)) {
      // Safari's private cache doesn't reliably honor Vary: Cookie, so it
      // can keep replaying this flash message to the same user after the
      // cookie is gone.
      cacheNoStore(res);
    }
  }

  return res;
};
