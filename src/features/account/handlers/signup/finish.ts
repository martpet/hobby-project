import { verifyRegResponseJson } from "@features/passkeys/ceremony/reg-verify.ts";
import { uniquePasskeyName } from "@features/passkeys/helpers.ts";
import { setPasskey } from "@features/passkeys/kv.ts";
import {
  setNewSessionCookie,
  stageSession,
} from "@features/sessions/helpers.ts";
import { setUser, USERS_BY_USERNAME } from "@features/users/kv.ts";
import { Context } from "@shared/context.ts";
import { kv } from "@shared/kv.ts";
import { respondBadRequest } from "@shared/responses/bad-request.ts";
import { respondForbidden } from "@shared/responses/forbidden.tsx";
import { respondUsernameTaken } from "../../responses/username-taken.ts";

export async function handleSignupFinish(c: Context) {
  const regResponseJson = await c.req.json();

  if (!regResponseJson) {
    return respondBadRequest({
      detail: "The registration response is missing or invalid",
    });
  }

  const headers = new Headers();

  const verification = await verifyRegResponseJson(c, headers, regResponseJson);

  if (!verification.ok) {
    return respondForbidden(c, { headers });
  }

  const { username, passkey } = verification;
  const atomic = kv.atomic();

  // `versionstamp: null` asserts the key does not exist, making the username
  // unique even if two signups for it finish at the same moment; the loser
  // gets 409. `handleSignupStart` already checked, but that was a race.
  atomic.check({
    key: [USERS_BY_USERNAME, username],
    versionstamp: null,
  });

  const user = setUser({ username }, atomic);

  // First passkey of a new user: the plain authenticator-derived name always
  // wins (`uniquePasskeyName` falls back to "Passkey •<credId tail>").
  const storedPasskey = setPasskey(
    {
      ...passkey,
      userId: user.id,
      name: uniquePasskeyName([], passkey.aaguid, passkey.credId),
    },
    atomic,
  );

  // User, passkey and session land in one commit, so there is no window in
  // which the account exists but the signup response can't log the user in.
  const session = stageSession(c, user.id, storedPasskey.id, atomic);

  const commit = await atomic.commit();

  // The username check above is the only thing that can fail the commit.
  if (!commit.ok) {
    return respondUsernameTaken(username, { headers });
  }

  setNewSessionCookie(headers, session);

  return new Response(null, { headers });
}
