import { Context } from "@shared/context.ts";
import { relativeTime } from "@shared/intl.ts";
import { CloseButton } from "@shared/jsx/CloseButton.tsx";
import { getAbsoluteExpiresAt, isSessionExpiringSoon } from "../helpers.ts";
import { LogInButton } from "./LogInButton.tsx";

const SESSION_EXPIRY_DIALOG = "session-expiry-dialog";

export function SessionExpiryWarning(_props: unknown, c: Context) {
  if (!c.session || !isSessionExpiringSoon(c.session)) {
    return;
  }

  const expiryDelta = getAbsoluteExpiresAt(c.session) - Date.now();
  const expiresIn = relativeTime(c, expiryDelta);

  return (
    <dialog
      open
      id={SESSION_EXPIRY_DIALOG}
      class="alert warning"
    >
      Your session will expire {expiresIn}.

      <LogInButton>Reauthenticate</LogInButton>

      <CloseButton
        commandfor={SESSION_EXPIRY_DIALOG}
        command="close"
      />
    </dialog>
  );
}
