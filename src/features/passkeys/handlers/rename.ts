import { setFlash } from "@features/flash/helpers.ts";
import { Context, isAuthenticatedContext } from "@shared/context.ts";
import { kv } from "@shared/kv.ts";
import { respondBadRequest } from "@shared/responses/bad-request.ts";
import { respondNotFound } from "@shared/responses/not-found.tsx";
import { redirectBack } from "@shared/responses/redirect-back.ts";
import { respondUnauthorized } from "@shared/responses/unauthorized.tsx";
import {
  getPasskeyById,
  PASSKEYS_BY_USER_ID_AND_NAME,
  setPasskey,
} from "../kv.ts";

const PASSKEY_NAME_MAX_LENGTH = 50;

export async function handlePasskeyRename(c: Context) {
  if (!isAuthenticatedContext(c)) {
    return respondUnauthorized(c);
  }

  const passkey = (await getPasskeyById(c.params.passkeyId!)).value;

  // Same 404 whether the id is unknown or another user's: don't leak which
  // passkey ids exist.
  if (!passkey || passkey.userId !== c.user.id) {
    return respondNotFound(c);
  }

  const name = (await c.req.formData()).get("name");

  if (
    typeof name !== "string" || !name.trim() ||
    name.trim().length > PASSKEY_NAME_MAX_LENGTH
  ) {
    return respondBadRequest({
      detail:
        `A name of 1 to ${PASSKEY_NAME_MAX_LENGTH} characters is required`,
    });
  }

  const trimmed = name.trim();

  if (trimmed !== passkey.name) {
    const atomic = kv.atomic();

    // Names identify passkeys in the sessions table, so they must be unique
    // per user. `versionstamp: null` asserts the name isn't already taken,
    // making the commit itself race-proof rather than just the check above
    // it (two concurrent renames to the same name can't both succeed).
    atomic.check({
      key: [PASSKEYS_BY_USER_ID_AND_NAME, c.user.id, trimmed],
      versionstamp: null,
    });

    setPasskey({ ...passkey, name: trimmed }, atomic, passkey);

    const commit = await atomic.commit();

    // A native post gets a flash rather than a bare 409 page.
    if (!commit.ok) {
      const res = redirectBack(c);
      setFlash(res.headers, "PASSKEY_NAME_TAKEN");
      return res;
    }
  }

  const res = redirectBack(c);
  setFlash(res.headers, "PASSKEY_RENAMED");

  return res;
}
