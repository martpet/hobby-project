import { dateTimeFormat, timeAgo } from "@etc/intl.ts";
import { Context } from "@etc/types.ts";
import { MINUTE } from "@std/datetime";
import { decodeTime } from "@std/ulid/decode-time";
import { Session } from "../types.ts";
import { LogOutButton } from "./LogOutButton.tsx";

interface ActiveLoginSessionsProps {
  sessions: Session[];
  currentSession: Session;
}

export function ActiveLoginSessions(
  { sessions, currentSession }: ActiveLoginSessionsProps,
  c: Context,
) {
  const dateWithTimeFmt = dateTimeFormat(c);
  const now = Date.now();
  const multipleSessions = sessions.length > 1;

  return (
    <table class="basic">
      <thead>
        <tr>
          {multipleSessions && <th>Last active</th>}
          <th>Login date</th>
          <th>IP address</th>
          <th>Browser</th>
          {multipleSessions && <th></th>}
        </tr>
      </thead>

      {sessions.map((session) => {
        const isCurrentSession = session.id === currentSession.id;
        const created = dateWithTimeFmt.format(decodeTime(session.id));
        const activeDelta = now - session.lastActive;
        let active = "now";

        if (!isCurrentSession && activeDelta >= MINUTE) {
          active = timeAgo(c, -activeDelta);
        }

        return (
          <tr>
            {multipleSessions && <td>{active}</td>}
            <td>{created}</td>
            <td>{session.ip}</td>
            <td>{session.browser} {session.os}</td>
            {multipleSessions && (
              <td>
                {isCurrentSession ? "Your session" : (
                  <LogOutButton
                    session={session}
                    class="small"
                  >
                    Revoke
                  </LogOutButton>
                )}
              </td>
            )}
          </tr>
        );
      })}
    </table>
  );
}
