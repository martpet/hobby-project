import {
  USERNAME_PATTERN_DESCRIPTION,
  USERNAME_PATTERN_REGEX,
} from "@features/users/const.ts";

export function SignUpForm() {
  return (
    <form id="signup-form">
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
  );
}
