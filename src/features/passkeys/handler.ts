import { handleAsset } from "@shared/asset/handler.ts";
import { respondNotFound } from "@shared/responses/not-found.tsx";
import { Context } from "@shared/types.ts";

export function handlePasskeys(c: Context) {
  const { pathname } = c.url;

  if (pathname.startsWith("/passkeys/assets/")) {
    return handleAsset(c, import.meta);
  }

  return respondNotFound(c);
}
