import { Page } from "@/shared/jsx/Page.tsx";

export function NotFoundPage() {
  const title = "Page Not Found";

  return (
    <Page title={title}>
      <h1>{title}</h1>
    </Page>
  );
}
