import { handleAsset } from "@/shared/handlers/asset.ts";
import { respondNotFound } from "@/shared/response/not-found.tsx";
import { Context } from "@/shared/types.ts";
import { handleAccountPage } from "./handlers/page.tsx";
import { handleSignupFinish } from "./handlers/signup/finish.ts";
import { handleSignupPage } from "./handlers/signup/page.tsx";
import { handleSignupStart } from "./handlers/signup/start.ts";

export function handleAccount(c: Context) {
  const { pathname } = c.url;

  if (pathname.startsWith("/account/assets/")) {
    return handleAsset(c, import.meta);
  }

  if (pathname === "/account") {
    return handleAccountPage(c);
  }

  if (pathname === "/signup") {
    return handleSignupPage(c);
  }

  if (pathname === "/signup/start") {
    return handleSignupStart(c);
  }

  if (pathname === "/signup/finish") {
    return handleSignupFinish(c);
  }

  return respondNotFound(c);
}
