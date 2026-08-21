import { Doc, DocProps } from "@/shared/jsx/Doc.tsx";
import { PageAlerts } from "@/shared/jsx/PageAlerts.tsx";
import { PageHeader } from "@/shared/jsx/PageHeader.tsx";
import { Context } from "@/shared/types.ts";

export function Page(props: DocProps, c: Context) {
  const docHead = (
    <>
      {!c.user && (
        <>
          <script type="module" src="/session/assets/signin.js" />
          <link rel="modulepreload" href="/passkeys/assets/simplewebauthn.js" />
          <link rel="modulepreload" href="/assets/util.js" />
        </>
      )}
      {props.head}
    </>
  );

  const className = `page ${props.bodyClass}`;

  return (
    <Doc head={docHead} title={props.title} bodyClass={className}>
      {c.alerts && <PageAlerts items={c.alerts} />}
      <PageHeader />
      {props.children}
    </Doc>
  );
}
