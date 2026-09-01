import { Page } from "@etc/jsx/Page.tsx";
import { Context } from "@etc/types.ts";
import { LogInButton } from "@features/sessions/jsx/LogInButton.tsx";

export function PublicHome(_props: unknown, { assets }: Context) {
  assets.add("login");

  return (
    <Page>
      <h1>Hobby Project</h1>
      <noscript>JavaScript is required to log in.</noscript>
      <LogInButton />
      <p>
        <a href="/signup">Create an account</a>
      </p>
    </Page>
  );
}
