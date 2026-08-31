import { assetPath } from "@etc/asset.ts";
import { Document, DocumentProps } from "@etc/jsx/Document.tsx";
import { Context } from "@etc/types.ts";
import { FlashDialog } from "@features/flash/jsx/FlashDialog.tsx";
import { isSessionExpiringSoon } from "@features/sessions/helpers.ts";
import { SessionExpiryWarning } from "@features/sessions/jsx/SessionExpiryWarning.tsx";

export function Page({ head, title, children }: DocumentProps, c: Context) {
  const needsLoginAssets = !c.user ||
    (c.session && isSessionExpiringSoon(c.session));

  const docHead = (
    <>
      {head}

      {needsLoginAssets && (
        <>
          <script type="module" src={assetPath("/session/assets/login.js")} />
          <link
            rel="modulepreload"
            href={assetPath("/passkeys/assets/simplewebauthn.js")}
          />
          <link rel="modulepreload" href={assetPath("/assets/util.js")} />
        </>
      )}
    </>
  );

  return (
    <Document head={docHead} title={title}>
      <FlashDialog />
      <SessionExpiryWarning />
      {children}
    </Document>
  );
}
