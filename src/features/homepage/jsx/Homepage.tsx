import { Page } from "@etc/jsx/Page.tsx";
import { User } from "@features/users/types.ts";

interface HomepageProps {
  user: User | undefined;
}

export function Homepage({ user }: HomepageProps) {
  if (user) {
    return (
      <Page>
        <h1>
          Hi {user.username}
        </h1>
        <p>
          Go to <a href="/account">your account</a>.
        </p>
      </Page>
    );
  }
  return (
    <Page>
      <p>A simple website with passkey authentication.</p>
    </Page>
  );
}
