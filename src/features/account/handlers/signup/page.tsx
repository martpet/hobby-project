import { respondMethodNotAllowed } from "@/shared/response/method-not-allowed.tsx";
import { respondRedirect } from "@/shared/response/redirect.ts";
import { Context } from "@/shared/types.ts";
import { SignupPage } from "../../jsx/SignupPage.tsx";

export function handleSignupPage(c: Context) {
  if (c.method !== "GET") {
    return respondMethodNotAllowed(c, "GET");
  }

  if (c.user) {
    return respondRedirect("/");
  }

  return <SignupPage />;
}
