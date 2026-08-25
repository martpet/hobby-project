import { ButtonHTMLAttributes, ComponentChildren } from "preact";
import { Session } from "../types.ts";

interface LogOutButtonProps extends ButtonHTMLAttributes {
  session?: Session;
  children?: ComponentChildren;
}

export function LogOutButton(
  { session, children, ...attr }: LogOutButtonProps,
) {
  return (
    <form
      class="logout"
      method="POST"
      action="/logout"
    >
      <button
        type="submit"
        class="secondary"
        {...attr}
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
