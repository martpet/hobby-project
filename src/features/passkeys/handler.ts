import { handleAsset } from "@shared/asset/handler.ts";
import { Context } from "@shared/context.ts";
import { respondNotFound } from "@shared/responses/not-found.tsx";

export function handlePasskeys(c: Context) {
  const { pathname } = c.url;

  if (pathname.startsWith("/passkeys/assets/")) {
    return handleAsset(c, import.meta);
  }

  return respondNotFound(c);
}
