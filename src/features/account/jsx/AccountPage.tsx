import { LoginSession } from "@/features/sessions/types.ts";
import { DEFAULT_LOCALE } from "@/shared/const.ts";
import { Page } from "@/shared/jsx/Page.tsx";
import { ContextWithUser } from "@/shared/types.ts";

interface AccountPageProps {
  heading: string;
  sessions: LoginSession[];
}

export function AccountPage(props: AccountPageProps, c: ContextWithUser) {
  const dateTimeFmt = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    dateStyle: "long",
    timeStyle: "short",
  });

  const dateFmt = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    dateStyle: "long",
  });

  return (
    <Page title="Account">
      <h1>{props.heading}</h1>

      <p>
        Username: {c.user!.username}, created on{" "}
        {dateFmt.format(c.user?.createdAt)}.
      </p>

      <h2>Active login sessions</h2>

      <table class="basic">
        <thead>
          <th>Login date</th>
          <th>Browser</th>
          <th>OS</th>
          <th>IP address</th>
        </thead>
        {props.sessions.reverse().map(({ data: { login } }) => (
          <tr>
            <td>{dateTimeFmt.format(login.date)}</td>
            <td>{login.browser}</td>
            <td>{login.os}</td>
            <td>{login.ip}</td>
          </tr>
        ))}
      </table>
    </Page>
  );
}
