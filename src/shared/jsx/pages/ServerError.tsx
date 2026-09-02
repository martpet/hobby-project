import { IS_DEV } from "@shared/const.ts";
import { Context } from "@shared/context.ts";
import { Page } from "@shared/jsx/Page.tsx";

interface ServerErrorPageProps {
  error: unknown;
}

export function ServerErrorPage({ error }: ServerErrorPageProps, c: Context) {
  c.head.title = "Server Error";

  return (
    <Page>
      <h1>{c.head.title}</h1>
      {IS_DEV && error instanceof Error && <pre>{error.stack}</pre>}
    </Page>
  );
}
