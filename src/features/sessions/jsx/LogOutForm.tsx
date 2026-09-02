import { PropsWithChildren } from "preact/compat";
import { Session } from "../types.ts";

interface LogOutFormProps extends PropsWithChildren {
  revokedSession?: Session;
}

export function LogOutForm({ revokedSession, children }: LogOutFormProps) {
  return (
    <form method="POST" action="/logout">
      <button type="submit">
        {children || "Sign Out"}
      </button>
      {revokedSession && (
        <input
          type="hidden"
          name="sessionId"
          value={revokedSession.id}
        />
      )}
    </form>
  );
}
