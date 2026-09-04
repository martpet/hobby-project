export type ScriptKey = keyof typeof SCRIPTS_REGISTRY;

export const SCRIPTS_REGISTRY = {
  "util": "/assets/util.js",
  "signup-form": "/account/assets/signup-form.js",
  "delete-account-form": "/account/assets/delete-account-form.js",
  "login-button": "/session/assets/login-button.js",
  "simplewebauthn": "/passkeys/assets/simplewebauthn.js",
} as const;
