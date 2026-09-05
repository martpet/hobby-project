import { Context } from "@shared/context.ts";
import { ButtonHTMLAttributes } from "preact";
import { PropsWithChildren } from "preact/compat";

type LogInButtonProps = ButtonHTMLAttributes & PropsWithChildren;

// Components that need a script register it here; `<Assets />` emits the
// tags once, deduplicated, no matter how many components asked. The
// `modulepreload` for "util" lets it download alongside the entry module
// instead of after it.
export function LogInButton(
  { children, ...attr }: LogInButtonProps,
  c: Context,
) {
  c.head.modules.add("login-button");
  c.head.modulepreloads.add("util");
  c.head.importmap.add("util");
  c.head.importmap.add("simplewebauthn");

  return (
    <button class="login-button" {...attr}>
      {children || "Sign In"}
    </button>
  );
}
