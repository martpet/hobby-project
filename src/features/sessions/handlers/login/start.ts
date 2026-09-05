import { createAuthOptions } from "@features/passkeys/ceremony/auth-options.ts";

export async function handleLogInStart() {
  const headers = new Headers();
  const authOptions = await createAuthOptions(headers);

  return Response.json(authOptions, { headers });
}
