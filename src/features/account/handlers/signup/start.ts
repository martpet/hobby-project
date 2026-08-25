import { respondBadRequest } from "@etc/responses/bad-request.ts";
import { respondConflict } from "@etc/responses/conflict.ts";
import { respondForbidden } from "@etc/responses/forbidden.tsx";
import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { Context } from "@etc/types.ts";
import { respondRegOptions } from "@features/passkeys/ceremony/reg-options.ts";
import { USERNAME_PATTERN_REGEX } from "@features/users/const.ts";
import { getUserByUsername } from "@features/users/kv.ts";

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
