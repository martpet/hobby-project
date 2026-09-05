import { createRegOptions } from "@features/passkeys/ceremony/reg-options.ts";
import { USERNAME_PATTERN_REGEX } from "@features/users/const.ts";
import { getUserByUsername } from "@features/users/kv.ts";
import { Context } from "@shared/context.ts";
import { respondBadRequest } from "@shared/responses/bad-request.ts";
import { respondConflict } from "@shared/responses/conflict.ts";
import { respondForbidden } from "@shared/responses/forbidden.tsx";

export async function handleSignupStart(c: Context) {
  if (c.user) {
    return respondForbidden(c);
  }

  const { username } = await c.req.json();

  if (!username) {
    return respondBadRequest("UsernameMissing");
  }

  if (!USERNAME_PATTERN_REGEX.test(username)) {
    return respondBadRequest("BadUsernameFormat");
  }

  const entry = await getUserByUsername(username);

  if (entry.value) {
    return respondConflict("UsernameTaken");
  }

  const headers = new Headers();
  const regOptions = await createRegOptions(headers, username);

  return Response.json(regOptions, { headers });
}
