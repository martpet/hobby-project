export type ScriptKey = keyof typeof SCRIPTS_REGISTRY;

export const SCRIPTS_REGISTRY = {
  "util": "/assets/util.js",
  "signup-form": "/account/assets/signup-form.js",
  "login-button": "/session/assets/login-button.js",
  "simplewebauthn": "/passkeys/assets/simplewebauthn.js",
} as const;
