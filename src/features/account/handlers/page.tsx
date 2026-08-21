import { listSessionsByUserId } from "@/features/sessions/kv.ts";
import { respondMethodNotAllowed } from "@/shared/response/method-not-allowed.tsx";
import { respondUnauthorized } from "@/shared/response/unauthorized.tsx";
import { Context } from "@/shared/types.ts";
import { AccountPage } from "../jsx/AccountPage.tsx";

export async function handleAccountPage(c: Context) {
  if (c.method !== "GET") {
    return respondMethodNotAllowed(c, "GET");
  }

  const heading = "Your account";

  if (!c.user) {
    return respondUnauthorized(c, heading);
  }

  const sessions = await listSessionsByUserId(c.user.id);
  const activeSessions = sessions.filter((s) => s.expiresAt > Date.now());

  return (
    <AccountPage
      heading={heading}
      sessions={activeSessions}
    />
  );
}
