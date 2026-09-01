import { dateTimeFormat } from "@shared/intl.ts";
import { Context } from "@shared/types.ts";
import { getAbsoluteExpiresAt, isSessionExpiringSoon } from "../helpers.ts";
import { LogInButton } from "./LogInButton.tsx";

export function SessionExpiryWarning(_props: unknown, c: Context) {
  if (!c.session || !isSessionExpiringSoon(c.session)) return;

  const expiresAt = dateTimeFormat(c).format(getAbsoluteExpiresAt(c.session));

  return (
    <dialog open class="alert warning">
      <p>Your session will expire at {expiresAt}.</p>
      <LogInButton>Reauthenticate</LogInButton>
    </dialog>
  );
}
