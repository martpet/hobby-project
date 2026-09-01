import { listSessionsByUserId } from "@features/sessions/kv.ts";
import { isAuthenticatedContext } from "@shared/context.ts";
import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";
import { Context } from "@shared/types.ts";
import { PrivateHome } from "./jsx/PrivateHome.tsx";
import { PublicHome } from "./jsx/PublicHome.tsx";

export async function handleHomepage(c: Context) {
  if (c.method !== "GET") {
    return respondMethodNotAllowed(c, "GET");
  }

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
