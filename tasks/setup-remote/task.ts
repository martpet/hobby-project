import { getRequiredEnv } from "@shared/environment.ts";
import { join } from "@std/path";
import { loadSetupEnv } from "./load-env.ts";
import { run } from "../utils/run.ts";

// Local orchestrator for `deno task setup-remote`. Verifies SSH/sudo access,
// uploads a generated config file, runs the already-installed remote
// installer interactively over SSH (so confirmation prompts for destructive
// steps reach the developer's terminal; run `publish-installer` first if
// it hasn't been installed yet or `installer.ts` has changed), then
// installs both deployer binaries.
await loadSetupEnv();

const remoteHost = getRequiredEnv("REMOTE_HOST");
const remoteInstaller = join(
  getRequiredEnv("REMOTE_INSTALLER_PATH"),
  "installer",
);
const remoteConfigTemp = ".env.setup-remote";
const localConfigTemp = "dist/.env.setup-remote";

const CONFIG_KEYS = [
  "USB_FILESYSTEM_LABEL",
  "USB_MOUNT_PATH",
  "SSH_ALLOWED_SUBNET",
  "DEPLOY_STAGING_USERS",
  "DEPLOY_PROD_USERS",
  "STAGING_APP_PORT",
  "PROD_APP_PORT",
  "STAGING_APP_ORIGIN",
  "PROD_APP_ORIGIN",
  "COMPILE_TARGET",
  "CLOUDFLARE_TUNNEL_TOKEN",
  "CLOUDFLARE_ZONE_ID",
  "CLOUDFLARE_API_TOKEN",
  "GEOIP_ACCOUNT_ID",
  "GEOIP_LICENSE_KEY",
  "REMOTE_APP_PATH",
  "REMOTE_UPLOAD_PATH",
  "REMOTE_CACHE_PATH",
  "REMOTE_DEPLOYER_PATH",
];

let uploadedConfig = false;

console.log(
  `🔐 Verifying SSH connectivity and passwordless sudo on "${remoteHost}"...`,
);
await run("ssh", ["-n", remoteHost, "sudo", "-n", "true"]);

const { code: installerExists } = await run(
  "ssh",
  ["-n", remoteHost, "sudo", "test", "-x", remoteInstaller],
  { check: false },
);
if (installerExists !== 0) {
  console.error(
    `Error: "${remoteInstaller}" doesn't exist on "${remoteHost}". Run \`deno task publish-installer\` first.`,
  );
  Deno.exit(1);
}

try {
  console.log("📝 Preparing remote config...");
  const configContent = CONFIG_KEYS
    .map((key) => `${key}=${getRequiredEnv(key)}`)
    .join("\n") + "\n";
  await Deno.mkdir("dist", { recursive: true });
  await Deno.writeTextFile(localConfigTemp, configContent);

  console.log(`📦 Uploading config to "${remoteHost}"...`);
  await run("scp", [localConfigTemp, `${remoteHost}:${remoteConfigTemp}`]);
  uploadedConfig = true;

  console.log(
    "⚙️  Running remote setup (interactive; you may be prompted)...\n",
  );
  await run("ssh", ["-t", remoteHost, "sudo", remoteInstaller]);

  console.log("\n📦 Installing deployer binaries...");
  await run("deno", ["task", "publish-deployer", "staging"]);
  await run("deno", ["task", "publish-deployer", "prod"]);

  console.log(
    "\n✅ Server setup complete. Run `deno task deploy staging` / `deno task deploy prod` to deploy the app.",
  );
} finally {
  if (uploadedConfig) {
    await run(
      "ssh",
      ["-n", remoteHost, "rm", "-f", remoteConfigTemp],
      { check: false },
    );
  }
  await Deno.remove(localConfigTemp, { recursive: true }).catch(() => {});
}
