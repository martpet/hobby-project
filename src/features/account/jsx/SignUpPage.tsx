import { Context } from "@shared/context.ts";
import { Page } from "@shared/jsx/Page.tsx";
import { SignUpForm } from "./SignUpForm.tsx";

export function SignUpPage(_props: unknown, c: Context) {
  c.head.title = "Sign Up";

  return (
    <Page>
      <h1>Create an account</h1>
      <noscript>JavaScript is required to create an account.</noscript>
      <SignUpForm />
    </Page>
  );
}
