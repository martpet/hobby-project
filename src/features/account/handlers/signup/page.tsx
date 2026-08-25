import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { respondRedirect } from "@etc/responses/redirect.ts";
import { Context } from "@etc/types.ts";
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
