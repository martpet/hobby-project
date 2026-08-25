import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { Context } from "@etc/types.ts";
import { respondAuthOptions } from "@features/passkeys/ceremony/auth-options.ts";

export function handleLogInStart(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  return respondAuthOptions();
}
