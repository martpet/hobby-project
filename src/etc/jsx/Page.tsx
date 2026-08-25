import { Doc, DocProps } from "@etc/jsx/Doc.tsx";
import { Header } from "@etc/jsx/Header.tsx";
import { Context } from "@etc/types.ts";
import { Flash } from "@features/flash/jsx/Flash.tsx";
import { isSessionExpiringSoon } from "@features/sessions/helpers.ts";
import { SessionExpiryWarning } from "@features/sessions/jsx/SessionExpiryWarning.tsx";

export function Page(
  { title, children, ...props }: DocProps,
  { url, user, session }: Context,
) {
  const needsLoginAssets = !user || (session && isSessionExpiringSoon(session));

  const head = (
    <>
      {props.head}
      {needsLoginAssets && (
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
      <SessionExpiryWarning />
      <Header
        url={url}
        user={user}
      />
      {children}
    </Doc>
  );
}
