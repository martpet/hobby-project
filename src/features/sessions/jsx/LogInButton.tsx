import { ButtonHTMLAttributes, ComponentChildren } from "preact";

interface LogInButtonProps extends ButtonHTMLAttributes {
  children?: ComponentChildren;
}

export function LogInButton({ children, ...buttonAttr }: LogInButtonProps) {
  return (
    <button class="login-button" {...buttonAttr}>
      {children || "Sign In"}
    </button>
  );
}
