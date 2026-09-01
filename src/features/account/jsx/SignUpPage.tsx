import { Page } from "@shared/jsx/Page.tsx";
import { Context } from "@shared/types.ts";
import { SignUpForm } from "./SignUpForm.tsx";

export function SignUpPage(_props: unknown, { assets }: Context) {
  assets.add("signup");

  return (
    <Page title="Sign Up">
      <h1>Create an account</h1>
      <noscript>JavaScript is required to create an account.</noscript>
      <SignUpForm />
    </Page>
  );
}
