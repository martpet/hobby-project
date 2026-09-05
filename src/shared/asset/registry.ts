export type ScriptKey = keyof typeof SCRIPTS_REGISTRY;

// Bare specifier → served path. Keys double as import-map names, so browser
// code imports them as-is (`import { apiFetch } from "util"`), and as the
// values components add to `c.head.modules` / `modulepreloads` / `importmap`.
export const SCRIPTS_REGISTRY = {
  "util": "/assets/util.js",
  "signup-form": "/account/assets/signup-form.js",
  "delete-account-form": "/account/assets/delete-account-form.js",
  "login-button": "/session/assets/login-button.js",
  "simplewebauthn": "/passkeys/assets/simplewebauthn.js",
} as const;
