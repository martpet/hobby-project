import { Page } from "@etc/jsx/Page.tsx";
import { LogInButton } from "@features/sessions/jsx/LogInButton.tsx";

interface UnauthorizedPageProps {
  heading?: string;
}

export function UnauthorizedPage({ heading }: UnauthorizedPageProps) {
  const headingUsed = heading || "Unauthorized";

  return (
    <Page title={headingUsed}>
      <h1>{headingUsed}</h1>
      <LogInButton />
    </Page>
  );
}
