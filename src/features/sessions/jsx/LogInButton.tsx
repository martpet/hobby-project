import { ButtonHTMLAttributes, ComponentChildren } from "preact";

interface LogInButtonProps extends ButtonHTMLAttributes {
  children?: ComponentChildren;
}

export function LogInButton({ children, ...buttonAttr }: LogInButtonProps) {
  return (
    <>
      <noscript>JavaScript is required to log in.</noscript>
      <button class="login-button" {...buttonAttr}>
        {children || "Sign In"}
      </button>
    </>
  );
}
