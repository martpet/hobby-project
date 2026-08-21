import { respondRegOptions } from "@/features/passkeys/ceremony/reg-options.ts";
import { USERNAME_PATTERN_REGEX } from "@/features/users/const.ts";
import { getUserByUsername } from "@/features/users/kv.ts";
import { respondBadRequest } from "@/shared/response/bad-request.ts";
import { respondConflict } from "@/shared/response/conflict.ts";
import { respondForbidden } from "@/shared/response/forbidden.tsx";
import { respondMethodNotAllowed } from "@/shared/response/method-not-allowed.tsx";
import { Context } from "@/shared/types.ts";

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

  const userByUsername = await getUserByUsername(username);
  if (userByUsername) {
    return respondConflict("UsernameTaken");
  }

  return respondRegOptions(c, username);
}
