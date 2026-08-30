import { Document, DocumentProps } from "@etc/jsx/Document.tsx";
import { Context } from "@etc/types.ts";
import { FlashDialog } from "@features/flash/jsx/FlashDialog.tsx";
import { isSessionExpiringSoon } from "@features/sessions/helpers.ts";
import { SessionExpiryDialog } from "@features/sessions/jsx/SessionExpiryDialog.tsx";

export function Page({ head, title, children }: DocumentProps, c: Context) {
  const needsLoginAssets = !c.user ||
    (c.session && isSessionExpiringSoon(c.session));

  const docHead = (
    <>
      {head}

      {needsLoginAssets && (
        <>
          <script type="module" src="/session/assets/login.js" />
          <link rel="modulepreload" href="/passkeys/assets/simplewebauthn.js" />
          <link rel="modulepreload" href="/assets/util.js" />
        </>
      )}
    </>
  );

  return (
    <Document head={docHead} title={title}>
      <FlashDialog />
      <SessionExpiryDialog />
      {children}
    </Document>
  );
}
