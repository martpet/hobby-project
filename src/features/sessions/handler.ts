import { handleAsset } from "@/shared/handlers/asset.ts";
import { respondNotFound } from "@/shared/response/not-found.tsx";
import { Context } from "@/shared/types.ts";
import { handleSigninFinish } from "./handlers/signin/finish.ts";
import { handleSigninStart } from "./handlers/signin/start.ts";
import { handleSignout } from "./handlers/signout.ts";

export function handleSession(c: Context) {
  const { pathname } = c.url;

  if (pathname.startsWith("/session/assets/")) {
    return handleAsset(c, import.meta);
  }

  if (pathname === "/signout") {
    return handleSignout(c);
  }

  if (pathname === "/signin/start") {
    return handleSigninStart(c);
  }

  if (pathname === "/signin/finish") {
    return handleSigninFinish(c);
  }

  return respondNotFound(c);
}
