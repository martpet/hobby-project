import { Page } from "@etc/jsx/Page.tsx";
import { DeleteAccountDialog } from "@features/account/jsx/DeleteAccountDialog.tsx";
import { ActiveLoginSessions } from "@features/sessions/jsx/ActiveLoginSessions.tsx";
import { LogOutForm } from "@features/sessions/jsx/LogOutForm.tsx";
import { Session } from "@features/sessions/types.ts";
import { User } from "@features/users/types.ts";

interface PrivateHomeProps {
  user: User;
  sessions: Session[];
  currentSession: Session;
}

export function PrivateHome(
  { user, sessions, currentSession }: PrivateHomeProps,
) {
  return (
    <Page>
      <h1>
        Welcome {user.username}
      </h1>

      <LogOutForm />

      <section>
        <h2>Active login sessions</h2>
        <ActiveLoginSessions
          sessions={sessions}
          currentSession={currentSession}
        />
      </section>

      <section>
        <h2>Delete account</h2>
        <DeleteAccountDialog username={user.username} />
      </section>
    </Page>
  );
}
