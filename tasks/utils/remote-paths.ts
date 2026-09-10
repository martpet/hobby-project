import { join } from "@std/path";

// Structural layout of the server, not configuration. Changing either root
// is a migration (systemd units, sudoers rules and Caddy config all bake in
// the resulting paths), so they live in code where they are reviewable
// rather than in an untracked env file. Mirrors `ETC_ROOT` in
// `tasks/setup-remote/installer.ts`.
const RUNTIME_ROOT = "/opt/hobproj";
export const STATE_ROOT = "/var/lib/hobproj";

export const remotePaths = {
  app: join(RUNTIME_ROOT, "app"),
  deployer: join(RUNTIME_ROOT, "deployer"),
  installer: join(RUNTIME_ROOT, "installer"),
  upload: join(STATE_ROOT, "deploy"),
  cache: join(STATE_ROOT, "cache"),
} as const;
