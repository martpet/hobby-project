import { Page } from "@etc/jsx/Page.tsx";
import { LogInButton } from "@features/sessions/jsx/LogInButton.tsx";

export function PublicHome() {
  return (
    <Page>
      <h1>Hobby Project</h1>
      <LogInButton />
      <p>
        <a href="/signup">Create account</a>
      </p>
    </Page>
  );
}
