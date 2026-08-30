import { ComponentChildren } from "preact";
import { Session } from "../types.ts";

interface LogOutFormProps {
  revokedSession?: Session;
  children?: ComponentChildren;
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
