import { respondAuthOptions } from "@/features/passkeys/ceremony/auth-options.ts";
import { respondForbidden } from "@/shared/response/forbidden.tsx";
import { respondMethodNotAllowed } from "@/shared/response/method-not-allowed.tsx";
import { Context } from "@/shared/types.ts";

export function handleSigninStart(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  if (c.user) {
    return respondForbidden(c);
  }

  return respondAuthOptions(c);
}
