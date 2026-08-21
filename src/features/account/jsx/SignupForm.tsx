import {
  USERNAME_PATTERN_DESCRIPTION,
  USERNAME_PATTERN_REGEX,
} from "@/features/users/const.ts";

export function SignupForm() {
  return (
    <form id="signup-form" class="basic">
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

      <button type="submit">Create</button>
    </form>
  );
}
