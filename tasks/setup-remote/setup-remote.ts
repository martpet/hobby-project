import { getEnv, getRequiredEnv } from "@shared/environment.ts";
import { join } from "@std/path";
import { loadSetupEnv } from "./load-env.ts";
import { remotePaths } from "../utils/remote-paths.ts";
import { run } from "../utils/run.ts";
import { createSsh } from "../utils/ssh.ts";
import { createScp } from "../utils/scp.ts";

// Local orchestrator for `deno task setup-remote`. Verifies SSH/sudo access,
// uploads a generated config file, runs the already-installed remote
// installer interactively over SSH (so confirmation prompts for destructive
// steps reach the developer's terminal; run `publish-installer` first if
// it hasn't been installed yet or `installer.ts` has changed), then
// installs both deployer binaries.
await loadSetupEnv();

const remoteHost = getRequiredEnv("REMOTE_HOST");
const ssh = createSsh(remoteHost);
const scp = createScp(remoteHost);
const remoteInstaller = join(
  remotePaths.installer,
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
  "STAGING_BLUE_PORT",
  "STAGING_GREEN_PORT",
  "PROD_BLUE_PORT",
  "PROD_GREEN_PORT",
  "STAGING_APP_ORIGIN",
  "PROD_APP_ORIGIN",
];

// Optional; each defaults (on the remote installer side) to "false" if
// absent from the uploaded config, so they're read separately below rather
// than via getRequiredEnv.
const OPTIONAL_CONFIG_KEYS = [
  "STAGING_KEEP_IDLE_RUNNING",
  "PROD_KEEP_IDLE_RUNNING",
];

let uploadedConfig = false;

console.log(
  `🔐 Verifying SSH connectivity and passwordless sudo on "${remoteHost}"...`,
);
await ssh(["sudo", "-n", "true"]);

const { code: installerExists } = await ssh(
  ["sudo", "test", "-x", remoteInstaller],
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
  const requiredLines = CONFIG_KEYS
    .map((key) => `${key}=${getRequiredEnv(key)}`);
  const optionalLines = OPTIONAL_CONFIG_KEYS
    .map((key) => [key, getEnv(key)] as const)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);
  const configContent = [...requiredLines, ...optionalLines].join("\n") +
    "\n";
  await Deno.mkdir("dist", { recursive: true });
  await Deno.writeTextFile(localConfigTemp, configContent);

  console.log(`📦 Uploading config to "${remoteHost}"...`);
  await scp.upload(localConfigTemp, remoteConfigTemp);
  uploadedConfig = true;

  console.log(
    "⚙️  Running remote setup (interactive; you may be prompted)...\n",
  );
  await ssh(["sudo", remoteInstaller], { tty: true });

  console.log("\n📦 Installing deployer binaries...");
  await run("deno", ["task", "publish-deployer", "staging"]);
  await run("deno", ["task", "publish-deployer", "prod"]);

  console.log(
    "\n✅ Server setup complete. Run `deno task deploy staging` / `deno task deploy prod` to deploy the app.",
  );
} finally {
  if (uploadedConfig) {
    await ssh(["rm", "-f", remoteConfigTemp], { check: false });
  }
  await Deno.remove(localConfigTemp, { recursive: true }).catch(() => {});
}
