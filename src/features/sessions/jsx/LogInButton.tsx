import { Context } from "@shared/context.ts";
import { ButtonHTMLAttributes } from "preact";
import { PropsWithChildren } from "preact/compat";

type LogInButtonProps = ButtonHTMLAttributes & PropsWithChildren;

// Components that need a script register it here; `<Assets />` emits the
// tags once, deduplicated, no matter how many components asked. It also
// derives modulepreloads/importmap from the module's registry entry.
export function LogInButton(
  { children, ...attr }: LogInButtonProps,
  c: Context,
) {
  c.head.modules.add("login-button");

  return (
    <button class="login-button" {...attr}>
      {children || "Sign in"}
    </button>
  );
}
