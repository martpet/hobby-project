import { createAuthOptions } from "@features/passkeys/ceremony/auth-options.ts";
import { Context } from "@shared/context.ts";
import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";

export async function handleLogInStart(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

  const headers = new Headers();
  const authOptions = await createAuthOptions(headers);

  return Response.json(authOptions, { headers });
}
