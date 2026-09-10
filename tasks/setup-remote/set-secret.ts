import { getRequiredEnv } from "@shared/environment.ts";
import { loadSetupEnv } from "./load-env.ts";
import { credentialPath, SECRET_STORE_DIR, SECRETS } from "./secrets.ts";
import { promptSecret } from "../utils/prompt-secret.ts";
import { run } from "../utils/run.ts";

// Sets or rotates one of the 5 provider-issued secrets (Cloudflare, MaxMind)
// used during remote setup and deploy. The value never touches a local file
// or a remote env file: it is read from a hidden prompt and piped directly
// over SSH into `systemd-creds encrypt`, which stores it under
// `SECRET_STORE_DIR` on the Pi, encrypted with a key that exists only there.
//
// This is deliberately separate from `setup-remote`, so a secret's plaintext
// value only ever exists in this one narrow command, and rotating it doesn't
// require re-running the broader (and much noisier) provisioning script.
//
// Usage: deno task set-secret <name>

// Restarting cloudflared picks up a rotated tunnel token immediately; the
// other secrets are read fresh on every use (by geoipupdate's timer or by
// the deployer), so nothing else needs restarting.
const RESTART_UNIT_AFTER: Record<string, string> = {
  cloudflare_tunnel_token: "cloudflared.service",
};

await loadSetupEnv();

const name = Deno.args[0];
const secret = SECRETS.find((s) => s.name === name);
if (secret === undefined) {
  const names = SECRETS.map((s) => `  ${s.name} — ${s.label}`).join("\n");
  throw new Error(
    `Usage: deno task set-secret <name>, where <name> is one of:\n${names}`,
  );
}

const remoteHost = getRequiredEnv("REMOTE_HOST");

console.log(
  `🔐 Verifying SSH connectivity and passwordless sudo on "${remoteHost}"...`,
);
await run("ssh", ["-n", remoteHost, "sudo", "-n", "true"]);

const value = await promptSecret(`Enter the ${secret.label}`);
if (value === "") {
  throw new Error("No value entered; the secret was not changed.");
}

const path = credentialPath(secret.name);
const tempPath = `${path}.tmp`;

console.log(`🔒 Encrypting and storing "${secret.label}" on ${remoteHost}...`);
await run("ssh", [
  "-n",
  remoteHost,
  "sudo",
  "mkdir",
  "-p",
  SECRET_STORE_DIR,
]);
await run("ssh", [
  "-n",
  remoteHost,
  "sudo",
  "chmod",
  "0700",
  SECRET_STORE_DIR,
]);
// Piped over the same SSH connection's stdin; the value is never written to
// a file on this laptop and never appears in `ps` on either machine.
await run("ssh", [
  remoteHost,
  "sudo",
  "systemd-creds",
  "encrypt",
  `--name=${secret.name}`,
  "-",
  tempPath,
], { input: value });
await run("ssh", ["-n", remoteHost, "sudo", "chmod", "0600", tempPath]);
await run("ssh", ["-n", remoteHost, "sudo", "mv", "-f", tempPath, path]);

console.log(`✅ Stored "${secret.label}" at ${path} on ${remoteHost}.`);

const unit = RESTART_UNIT_AFTER[secret.name];
if (unit !== undefined) {
  const { code } = await run(
    "ssh",
    ["-n", remoteHost, "sudo", "systemctl", "is-enabled", unit],
    { check: false, stdout: "piped", stderr: "null" },
  );
  if (code === 0) {
    console.log(`🔄 Restarting ${unit} to pick up the new value...`);
    await run("ssh", ["-n", remoteHost, "sudo", "systemctl", "restart", unit]);
  }
}
