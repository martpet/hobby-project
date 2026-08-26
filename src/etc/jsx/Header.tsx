import { WEBSITE_TITLE } from "@etc/const.ts";
import { LogInButton } from "@features/sessions/jsx/LogInButton.tsx";
import { LogOutButton } from "@features/sessions/jsx/LogOutButton.tsx";
import { User } from "@features/users/types.ts";

interface HeaderProps {
  url: URL;
  user: User | undefined;
}

export function Header({ url, user }: HeaderProps) {
  const isHome = url.pathname === "/";
  const isAccount = url.pathname === "/account";
  const isSignUp = url.pathname === "/signup";

  const logo = (
    <img
      src="/assets/logo.png"
      alt="Logo: the apollo space capsule."
      width={18}
      height={18}
    />
  );

  return (
    <header id="header">
      {isHome ? <h1 class="title">{logo}{WEBSITE_TITLE}</h1> : (
        <a
          href="/"
          class="title"
        >
          {logo}
          {WEBSITE_TITLE}
        </a>
      )}

      <div class="actions">
        {user
          ? (
            <>
              {isAccount
                ? user.username
                : <a href="/account">{user.username}</a>}
              <LogOutButton />
            </>
          )
          : (
            <>
              {!isSignUp && <a href="/signup">Sign Up</a>}
              <LogInButton />
            </>
          )}
      </div>
    </header>
  );
}
