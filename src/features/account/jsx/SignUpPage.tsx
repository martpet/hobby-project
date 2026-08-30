import { assetPath } from "@etc/asset.ts";
import { Page } from "@etc/jsx/Page.tsx";
import {
  USERNAME_PATTERN_DESCRIPTION,
  USERNAME_PATTERN_REGEX,
} from "@features/users/const.ts";

export function SignUpPage() {
  const head = (
    <script
      type="module"
      src={assetPath("/account/assets/signup.js")}
    />
  );

  return (
    <Page
      head={head}
      title="Sign up"
    >
      <h1>Create a new account</h1>

      <form id="signup-form">
        <noscript>JavaScript is required to create an account.</noscript>
        <label for="username">Username:</label>
        <input
          id="username"
          required
          pattern={USERNAME_PATTERN_REGEX.source}
          title={USERNAME_PATTERN_DESCRIPTION}
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
        />
        <p>
          <button type="submit">Create Account</button>
        </p>
      </form>
    </Page>
  );
}
