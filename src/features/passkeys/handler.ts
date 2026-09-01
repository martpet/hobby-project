import { handleAsset } from "@etc/asset/handler.ts";
import { respondNotFound } from "@etc/responses/not-found.tsx";
import { Context } from "@etc/types.ts";

export function handlePasskeys(c: Context) {
  const { pathname } = c.url;

  if (pathname.startsWith("/passkeys/assets/")) {
    return handleAsset(c, import.meta);
  }

  return respondNotFound(c);
}
