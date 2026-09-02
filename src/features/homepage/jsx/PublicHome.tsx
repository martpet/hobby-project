import { LogInButton } from "@features/sessions/jsx/LogInButton.tsx";
import { Page } from "@shared/jsx/Page.tsx";

export function PublicHome() {
  return (
    <Page>
      <h1>Hobby Project</h1>
      <noscript>JavaScript is required to signup in.</noscript>
      <LogInButton />
      <p>
        <a href="/signup">Create an account</a>
      </p>
    </Page>
  );
}
