import { createRegOptions } from "@features/passkeys/ceremony/reg-options.ts";
import {
  USERNAME_PATTERN_DESCRIPTION,
  USERNAME_PATTERN_REGEX,
} from "@features/users/const.ts";
import { getUserByUsername } from "@features/users/kv.ts";
import { Context } from "@shared/context.ts";
import { respondBadRequest } from "@shared/responses/bad-request.ts";
import { respondForbidden } from "@shared/responses/forbidden.tsx";
import { respondUsernameTaken } from "../../responses/username-taken.ts";

export async function handleSignupStart(c: Context) {
  if (c.user) {
    return respondForbidden(c);
  }

  const { username } = await c.req.json();

  if (!username) {
    return respondBadRequest({ detail: "A username is required" });
  }

  if (!USERNAME_PATTERN_REGEX.test(username)) {
    return respondBadRequest({ detail: USERNAME_PATTERN_DESCRIPTION });
  }

  // Early rejection for UX only; the authoritative uniqueness check is the
  // atomic commit in `handleSignupFinish`.
  const entry = await getUserByUsername(username);

  if (entry.value) {
    return respondUsernameTaken(username);
  }

  const headers = new Headers();
  const regOptions = await createRegOptions(headers, { username });

  return Response.json(regOptions, { headers });
}
