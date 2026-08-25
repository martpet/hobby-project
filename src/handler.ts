import { handleAsset } from "@etc/asset.ts";
import { respondNotFound } from "@etc/responses/not-found.tsx";
import { Context } from "@etc/types.ts";
import { handleAccount } from "@features/account/handler.tsx";
import { handleHomepage } from "@features/homepage/handler.tsx";
import { handlePasskeys } from "@features/passkeys/handler.ts";
import { handleSession } from "@features/sessions/handler.ts";

export function handler(c: Context) {
  const { pathname } = c.url;

  if (pathname.startsWith("/assets/")) {
    return handleAsset(c, import.meta);
  }

  if (pathname === "/") {
    return handleHomepage(c);
  }

  if (
    pathname.startsWith("/account") ||
    pathname.startsWith("/signup")
  ) {
    return handleAccount(c);
  }

  if (
    pathname.startsWith("/session") ||
    pathname.startsWith("/login") ||
    pathname === "/logout"
  ) {
    return handleSession(c);
  }

  if (pathname.startsWith("/passkeys")) {
    return handlePasskeys(c);
  }

  return respondNotFound(c);
}
