import { dateTimeFormat } from "@etc/intl.ts";
import { Page } from "@etc/jsx/Page.tsx";
import { Context } from "@etc/types.ts";
import { ActiveLoginSessions } from "@features/sessions/jsx/ActiveLoginSessions.tsx";
import { Session } from "@features/sessions/types.ts";
import { User } from "@features/users/types.ts";
import { decodeTime } from "@std/ulid";

interface AccountPageProps {
  heading: string;
  user: User;
  sessions: Session[];
  currentSession: Session;
}

export function AccountPage(
  { heading, user, sessions, currentSession }: AccountPageProps,
  c: Context,
) {
  const dateOnlyFmt = dateTimeFormat(c);
  const created = dateOnlyFmt.format(decodeTime(user.id));

  return (
    <Page title="Account">
      <main>
        <h1>{heading}</h1>

        <p>
          Username: {user.username} <br />
          Created: {created}
        </p>

        <h2>Active login sessions</h2>
        <ActiveLoginSessions
          sessions={sessions}
          currentSession={currentSession}
        />
      </main>
    </Page>
  );
}
