import { signOutUser } from "@/features/sessions/helpers.ts";
import { respondMethodNotAllowed } from "@/shared/response/method-not-allowed.tsx";
import { respondRedirect } from "@/shared/response/redirect.ts";
import { Context } from "@/shared/types.ts";

export function handleSignout(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  const res = respondRedirect("/");

  signOutUser(c);

  return res;
}
