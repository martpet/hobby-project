import { Context } from "@shared/context.ts";
import { Page } from "@shared/jsx/Page.tsx";

interface ForbiddenPageProps {
  reason?: string;
}

export function ForbiddenPage({ reason }: ForbiddenPageProps, c: Context) {
  c.head.title = "Forbidden";

  return (
    <Page>
      <h1>{c.head.title}</h1>
      {reason && <p>{reason}</p>}
    </Page>
  );
}
