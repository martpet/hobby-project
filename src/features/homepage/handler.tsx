import { isAuthenticatedContext } from "@etc/context.ts";
import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { Context } from "@etc/types.ts";
import { listSessionsByUserId } from "@features/sessions/kv.ts";
import { PrivateHome } from "./jsx/PrivateHome.tsx";
import { PublicHome } from "./jsx/PublicHome.tsx";

export async function handleHomepage(c: Context) {
  if (c.method !== "GET") {
    return respondMethodNotAllowed(c, "GET");
  }

  c.shouldCache = !isAuthenticatedContext(c);

  if (!isAuthenticatedContext(c)) {
    return <PublicHome />;
  }

  const sessions = await listSessionsByUserId(c.user.id);

  sessions.sort((a, b) => {
    if (a.id === c.session.id) return -1;
    if (b.id === c.session.id) return 1;

    return b.lastActive - a.lastActive;
  });

  return (
    <PrivateHome
      user={c.user}
      sessions={sessions}
      currentSession={c.session}
    />
  );
}
