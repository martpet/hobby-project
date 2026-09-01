import { Document, DocumentProps } from "@etc/jsx/Document.tsx";
import { Context } from "@etc/types.ts";
import { FlashMessage } from "@features/flash/jsx/FlashMessage.tsx";
import { isSessionExpiringSoon } from "@features/sessions/helpers.ts";
import { SessionExpiryWarning } from "@features/sessions/jsx/SessionExpiryWarning.tsx";

export function Page(
  { head, title, children }: DocumentProps,
  { assets, session }: Context,
) {
  if (session && isSessionExpiringSoon(session)) {
    assets.add("login");
  }

  return (
    <Document head={head} title={title}>
      <FlashMessage />
      <SessionExpiryWarning />
      {children}
    </Document>
  );
}
