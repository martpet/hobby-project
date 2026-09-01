import { IS_DEV } from "@shared/const.ts";
import { Page } from "@shared/jsx/Page.tsx";

interface ServerErrorPageProps {
  error: unknown;
}

export function ServerErrorPage({ error }: ServerErrorPageProps) {
  const title = "Server Error";

  return (
    <Page title={title}>
      <h1>{title}</h1>
      {IS_DEV && error instanceof Error && <pre>{error.stack}</pre>}
    </Page>
  );
}
