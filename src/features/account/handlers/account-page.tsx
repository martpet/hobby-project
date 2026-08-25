import { isAuthenticatedContext } from "@etc/context.ts";
import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { respondUnauthorized } from "@etc/responses/unauthorized.tsx";
import { Context } from "@etc/types.ts";
import { listSessionsByUserId } from "@features/sessions/kv.ts";
import { AccountPage } from "../jsx/AccountPage.tsx";

export async function handleAccountPage(c: Context) {
  if (c.method !== "GET") {
    return respondMethodNotAllowed(c, "GET");
  }

  const heading = "Your account";

  if (!isAuthenticatedContext(c)) {
    return respondUnauthorized(c, heading);
  }

  const sessions = await listSessionsByUserId(c.user.id);

  sessions.sort((a, b) => {
    if (a.id === c.session.id) return -1;
    if (b.id === c.session.id) return 1;

    return b.lastActive - a.lastActive;
  });

  return (
    <AccountPage
      heading={heading}
      user={c.user}
      sessions={sessions}
      currentSession={c.session}
    />
  );
}
