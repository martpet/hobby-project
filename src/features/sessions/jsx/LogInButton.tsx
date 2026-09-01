import { ButtonHTMLAttributes, ComponentChildren } from "preact";

interface LogInButtonProps extends ButtonHTMLAttributes {
  children?: ComponentChildren;
}

export function LogInButton({ children, ...attr }: LogInButtonProps) {
  return (
    <button class="login-button" {...attr}>
      {children || "Sign In"}
    </button>
  );
}
