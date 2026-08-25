import { ComponentChildren } from "preact";
import { Session } from "../types.ts";

interface LogOutButtonProps {
  session?: Session;
  children?: ComponentChildren;
}

export function LogOutButton({ session, children }: LogOutButtonProps) {
  return (
    <form
      class="logout"
      method="POST"
      action="/logout"
    >
      <button
        type="submit"
        class="secondary"
      >
        {children || "Log out"}
      </button>
      {session && (
        <input
          type="hidden"
          name="sessionId"
          value={session.id}
        />
      )}
    </form>
  );
}
