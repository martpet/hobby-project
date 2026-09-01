import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";
import { respondRedirect } from "@shared/responses/redirect.ts";
import { Context } from "@shared/types.ts";
import { SignUpPage } from "../../jsx/SignUpPage.tsx";

export function handleSignUpPage(c: Context) {
  if (c.method !== "GET") {
    return respondMethodNotAllowed(c, "GET");
  }

  if (c.user) {
    return respondRedirect("/");
  }

  return <SignUpPage />;
}
