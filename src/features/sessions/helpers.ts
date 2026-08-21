import { Session } from "@/features/sessions/types.ts";
import { Alert, Context } from "@/shared/types.ts";
import { UserAgent } from "@std/http";

export function signInUser(c: Context, userId: string) {
  const agent = new UserAgent(c.req.headers.get("user-agent"));
  addSessionChange(c, {
    login: {
      userId,
      date: new Date(),
      browser: agent.browser.name,
      os: agent.os.name,
      ip: c.ipAddress,
    },
  });
}

export function signOutUser(c: Context) {
  addSessionChange(c, { login: undefined });
  addSessionAlert(c, {
    type: "success",
    content: "You were signed out.",
  });
}

export function addSessionAlert(c: Context, alert: Alert) {
  const alerts = (c.sessionChanges?.alerts || []).concat(alert);
  addSessionChange(c, { alerts });
}

export function addSessionChange(c: Context, change: Session["data"]) {
  c.sessionChanges = { ...c.sessionChanges, ...change };
}
