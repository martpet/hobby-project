import { SignInButton } from "@/features/sessions/jsx/SignInButton.tsx";
import { Page } from "@/shared/jsx/Page.tsx";

interface UnauthorizedPageProps {
  heading?: string;
}

export function UnauthorizedPage(props: UnauthorizedPageProps) {
  const headingUsed = props.heading || "Unauthorized";

  return (
    <Page title={headingUsed}>
      <h1>{headingUsed}</h1>
      <SignInButton />
    </Page>
  );
}
