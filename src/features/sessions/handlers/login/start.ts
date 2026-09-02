import { respondAuthOptions } from "@features/passkeys/ceremony/auth-options.ts";
import { Context } from "@shared/context.ts";
import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";

export function handleLogInStart(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  return respondAuthOptions();
}
