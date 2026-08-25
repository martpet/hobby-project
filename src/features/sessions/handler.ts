import { handleAsset } from "@etc/asset.ts";
import { respondNotFound } from "@etc/responses/not-found.tsx";
import { Context } from "@etc/types.ts";
import { handleLogInFinish } from "./handlers/login/finish.ts";
import { handleLogInStart } from "./handlers/login/start.ts";
import { handleLogOut } from "./handlers/logout.ts";

export function handleSession(c: Context) {
  const { pathname } = c.url;

  if (pathname.startsWith("/session/assets/")) {
    return handleAsset(c, import.meta);
  }

  if (pathname === "/login/start") {
    return handleLogInStart(c);
  }

  if (pathname === "/login/finish") {
    return handleLogInFinish(c);
  }

  if (pathname === "/logout") {
    return handleLogOut(c);
  }

  return respondNotFound(c);
}
