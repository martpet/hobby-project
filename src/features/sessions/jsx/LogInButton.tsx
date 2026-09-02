import { Context } from "@shared/context.ts";
import { ButtonHTMLAttributes } from "preact";
import { PropsWithChildren } from "preact/compat";

type LogInButtonProps = ButtonHTMLAttributes & PropsWithChildren;

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
