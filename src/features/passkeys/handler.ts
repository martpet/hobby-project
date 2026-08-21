import { handleAsset } from "@/shared/handlers/asset.ts";
import { respondNotFound } from "@/shared/response/not-found.tsx";
import { Context } from "@/shared/types.ts";

export function handlePasskeys(c: Context) {
  const { pathname } = c.url;

  if (pathname.startsWith("/passkeys/assets/")) {
    return handleAsset(c, import.meta);
  }

  return respondNotFound(c);
}
