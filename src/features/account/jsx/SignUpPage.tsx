import { assetPath } from "@etc/asset.ts";
import { Page } from "@etc/jsx/Page.tsx";
import { SignUpForm } from "./SignUpForm.tsx";

export function SignUpPage() {
  const head = (
    <script type="module" src={assetPath("/account/assets/signup.js")} />
  );

  return (
    <Page head={head} title="Sign Up">
      <h1>Create an account</h1>
      <noscript>JavaScript is required to create an account.</noscript>
      <SignUpForm />
    </Page>
  );
}
