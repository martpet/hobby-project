import { handleAsset } from "@etc/asset.ts";
import { respondNotFound } from "@etc/responses/not-found.tsx";
import { Context } from "@etc/types.ts";
import { handleAccountDelete } from "./handlers/delete.ts";
import { handleSignupFinish } from "./handlers/signup/finish.ts";
import { handleSignUpPage } from "./handlers/signup/page.tsx";
import { handleSignupStart } from "./handlers/signup/start.ts";

export function handleAccount(c: Context) {
  const { pathname } = c.url;

  if (pathname.startsWith("/account/assets/")) {
    return handleAsset(c, import.meta);
  }

  if (pathname === "/account/delete") {
    return handleAccountDelete(c);
  }

  if (pathname === "/signup") {
    return handleSignUpPage(c);
  }

  if (pathname === "/signup/start") {
    return handleSignupStart(c);
  }

  if (pathname === "/signup/finish") {
    return handleSignupFinish(c);
  }

  return respondNotFound(c);
}
