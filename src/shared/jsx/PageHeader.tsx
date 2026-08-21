import { SignInButton } from "@/features/sessions/jsx/SignInButton.tsx";
import { SignOutButton } from "@/features/sessions/jsx/SignOutButton.tsx";
import { WEBSITE_TITLE } from "@/shared/const.ts";
import { Context } from "@/shared/types.ts";

export function PageHeader(_props: unknown, c: Context) {
  const isHomePage = c.url.pathname === "/";
  const isSignupPage = c.url.pathname === "/signup";
  const isAccountPage = c.url.pathname === "/account";

  const logo = (
    <img
      src="/assets/logo.png"
      alt="Logo: the apollo space capsule."
      width={18}
      height={18}
    />
  );

  return (
    <header class="page-header">
      {isHomePage
        ? <h1 class="title">{logo}{WEBSITE_TITLE}</h1>
        : <a href="/" class="title">{logo}{WEBSITE_TITLE}</a>}

      <div class="actions">
        {c.user && (
          <>
            {isAccountPage
              ? c.user.username
              : <a href="/account">{c.user.username}</a>}

            <SignOutButton />
          </>
        )}

        {!c.user && (
          <>
            {!isSignupPage && <a href="/signup">Sign up</a>}
            <SignInButton />
          </>
        )}
      </div>
    </header>
  );
}
