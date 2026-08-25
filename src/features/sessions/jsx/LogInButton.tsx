import { ButtonHTMLAttributes, ComponentChildren } from "preact";

interface LogInButtonProps extends ButtonHTMLAttributes {
  children?: ComponentChildren;
}

export function LogInButton({ children, ...attr }: LogInButtonProps) {
  return (
    <>
      <noscript>JavaScript is required to log in.</noscript>
      <button
        type="button"
        class="login"
        {...attr}
      >
        {children || "Log in"}
      </button>
    </>
  );
}
