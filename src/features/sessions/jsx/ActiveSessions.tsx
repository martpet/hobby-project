import { LogOutForm } from "@features/sessions/jsx/LogOutForm.tsx";
import { Context } from "@shared/context.ts";
import { lookupLocation } from "@shared/geoip.ts";
import { dateTimeFormat, relativeTime } from "@shared/intl.ts";
import { MINUTE } from "@std/datetime";
import { decodeTime } from "@std/ulid/decode-time";
import { Session } from "../types.ts";

interface ActiveSessionsProps {
  sessions: Session[];
  currentSession: Session;
}

export function ActiveSessions(
  { sessions, currentSession }: ActiveSessionsProps,
  c: Context,
) {
  const dateWithTimeFmt = dateTimeFormat(c);
  const now = Date.now();
  const multipleSessions = sessions.length > 1;

  return (
    <table>
      <thead>
        <tr>
          <th>OS</th>
          <th>Browser</th>
          <th>IP address</th>
          <th>Login</th>
          {multipleSessions && <th>Last seen</th>}
          <th>Location</th>
          {multipleSessions && <th></th>}
        </tr>
      </thead>

      {sessions.map((session) => {
        const isCurrentSession = session.id === currentSession.id;
        const created = dateWithTimeFmt.format(decodeTime(session.id));
        const idleMs = now - session.lastActive;
        let lastSeen = "a few seconds ago";

        if (!isCurrentSession && idleMs >= MINUTE) {
          lastSeen = relativeTime(c, -idleMs);
        }

        return (
          <tr>
            <td>{session.os}</td>
            <td>{session.browser}</td>
            <td>{session.ip}</td>
            <td>{created}</td>
            {multipleSessions && <td>{lastSeen}</td>}
            <td>{lookupLocation(session.ip) ?? "Unknown"}</td>
            {multipleSessions && (
              <td>
                {isCurrentSession
                  ? "Current Session"
                  : (
                    <LogOutForm revokedSession={session}>
                      Revoke
                    </LogOutForm>
                  )}
              </td>
            )}
          </tr>
        );
      })}
    </table>
  );
}
