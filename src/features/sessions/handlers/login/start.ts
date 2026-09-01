import { respondAuthOptions } from "@features/passkeys/ceremony/auth-options.ts";
import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";
import { Context } from "@shared/types.ts";

export function handleLogInStart(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  return respondAuthOptions();
}
