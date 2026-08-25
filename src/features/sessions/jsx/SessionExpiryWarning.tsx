import { dateTimeFormat } from "@etc/intl.ts";
import { Context } from "@etc/types.ts";
import { getAbsoluteExpiresAt, isSessionExpiringSoon } from "../helpers.ts";
import { LogInButton } from "./LogInButton.tsx";

export function SessionExpiryWarning(_props: unknown, c: Context) {
  if (!c.session || !isSessionExpiringSoon(c.session)) return;

  const expiresAt = dateTimeFormat(c).format(getAbsoluteExpiresAt(c.session));

  return (
    <div
      id="session-expiry-warning"
      class="alert warning"
    >
      Your session will expire at {expiresAt}.
      <LogInButton>Reauthenticate</LogInButton>
    </div>
  );
}
