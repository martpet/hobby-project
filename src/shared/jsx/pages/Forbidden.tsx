import { Page } from "@/shared/jsx/Page.tsx";

interface ForbiddenPageProps {
  reason?: string;
}

export function ForbiddenPage({ reason }: ForbiddenPageProps) {
  const title = "Forbidden";

  return (
    <Page title={title}>
      <h1>{title}</h1>
      {reason && <p>{reason}</p>}
    </Page>
  );
}
