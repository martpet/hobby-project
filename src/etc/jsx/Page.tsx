import { Doc, DocProps } from "@etc/jsx/Doc.tsx";
import { Header } from "@etc/jsx/Header.tsx";
import { Context } from "@etc/types.ts";
import { Flash } from "@features/flash/jsx/Flash.tsx";

export function Page(
  { title, children, ...props }: DocProps,
  { url, user }: Context,
) {
  const head = (
    <>
      {props.head}
      {!user && (
        <>
          <script
            type="module"
            src="/session/assets/login.js"
          />
          <link
            rel="modulepreload"
            href="/passkeys/assets/simplewebauthn.js"
          />
          <link
            rel="modulepreload"
            href="/assets/util.js"
          />
        </>
      )}
    </>
  );

  const bodyClass = "page" + (props.bodyClass ? ` ${props.bodyClass}` : "");

  return (
    <Doc
      title={title}
      head={head}
      bodyClass={bodyClass}
    >
      <Flash />
      <Header
        url={url}
        user={user}
      />
      {children}
    </Doc>
  );
}
