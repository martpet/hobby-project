import { DeleteAccountDialog } from "@features/account/jsx/DeleteAccountDialog.tsx";
import { ActiveSessions } from "@features/sessions/jsx/ActiveSessions.tsx";
import { LogOutForm } from "@features/sessions/jsx/LogOutForm.tsx";
import { Session } from "@features/sessions/types.ts";
import { User } from "@features/users/types.ts";
import { Page } from "@shared/jsx/Page.tsx";

interface PrivateHomeProps {
  user: User;
  sessions: Session[];
  currentSession: Session;
}

export function PrivateHome(props: PrivateHomeProps) {
  return (
    <Page>
      <h1>Welcome {props.user.username}</h1>

      <LogOutForm />

      <h2>Active sessions</h2>
      <ActiveSessions
        sessions={props.sessions}
        currentSession={props.currentSession}
      />

      <h2>Delete account</h2>
      <DeleteAccountDialog user={props.user} />
    </Page>
  );
}
