import { Page } from "@/shared/jsx/Page.tsx";
import { SignupForm } from "./SignUpForm.tsx";

export function SignupPage() {
  const head = <script type="module" src="/account/assets/signup.js" />;

  return (
    <Page head={head} title="Sign up">
      <h1>Create an account</h1>
      <SignupForm />
    </Page>
  );
}
