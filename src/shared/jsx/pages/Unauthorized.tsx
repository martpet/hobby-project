import { LogInButton } from "@features/sessions/jsx/LogInButton.tsx";
import { Page } from "@shared/jsx/Page.tsx";
import { Context } from "@shared/types.ts";

interface UnauthorizedPageProps {
  heading?: string;
}

export function UnauthorizedPage(
  { heading }: UnauthorizedPageProps,
  { assets }: Context,
) {
  assets.add("login");

  const headingUsed = heading || "Unauthorized";

  return (
    <Page title={headingUsed}>
      <h1>{headingUsed}</h1>
      <LogInButton />
    </Page>
  );
}
