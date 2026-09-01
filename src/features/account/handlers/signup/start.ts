import { respondRegOptions } from "@features/passkeys/ceremony/reg-options.ts";
import { USERNAME_PATTERN_REGEX } from "@features/users/const.ts";
import { getUserByUsername } from "@features/users/kv.ts";
import { respondBadRequest } from "@shared/responses/bad-request.ts";
import { respondConflict } from "@shared/responses/conflict.ts";
import { respondForbidden } from "@shared/responses/forbidden.tsx";
import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";
import { Context } from "@shared/types.ts";

export async function handleSignupStart(c: Context) {
  if (c.method !== "POST") {
    return respondMethodNotAllowed(c, "POST");
  }

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

  return respondRegOptions(username);
}
