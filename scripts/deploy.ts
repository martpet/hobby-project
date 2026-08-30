import { getRequiredEnv } from "@etc/environment.ts";
import { exists } from "@std/fs/exists";
import { command, commandOutput } from "./utils/command.ts";
import { loadEnv } from "./utils/load-env.ts";

const envName = await loadEnv();
const badge = `[${envName.toUpperCase()}]`;
const localBinary = `dist/bin-${envName}`;
const remoteBinary = getRequiredEnv("REMOTE_BINARY");
const remoteBinaryTemp = `${remoteBinary}.tmp`;
const remoteHost = getRequiredEnv("REMOTE_HOST");
const remoteService = getRequiredEnv("REMOTE_SERVICE");
const webCachePath = getRequiredEnv("WEB_CACHE_PATH");
const gitSha = await commandOutput("git", ["rev-parse", "HEAD"]);

if (!await exists(localBinary)) {
  console.error(`❌ File '${localBinary}' doesn't exist!`);
  Deno.exit(1);
}

console.log(`🚀 Starting deployment to ${badge}...`);
console.time("✨ Total deployment time");

try {
  console.log(
    `📦 Copying "${localBinary}" to "${remoteHost}:${remoteBinaryTemp}"...`,
  );

  await command("scp", [localBinary, `${remoteHost}:${remoteBinaryTemp}`]);

  console.log(
    `⚙️  Updating file and restarting "${remoteService}"...`,
  );

  await command("ssh", [
    "-n",
    remoteHost,
    `
      set -e

      mv ${remoteBinaryTemp} ${remoteBinary}
      sudo mkdir -p /etc/systemd/system/${remoteService}.service.d
      printf '[Service]\nEnvironment=GIT_SHA=%s\n' ${gitSha} | sudo tee /etc/systemd/system/${remoteService}.service.d/git-sha.conf > /dev/null
      sudo systemctl daemon-reload
      sudo systemctl restart ${remoteService}
      sudo rm -rf ${webCachePath}

      if ! sudo systemctl is-active --quiet ${remoteService}; then
        echo "Service '${remoteService}' is not running."
        sudo systemctl status ${remoteService} --no-pager
        exit 1
      fi
    `,
  ]);

  console.log(`✅ Deployment to ${badge} completed successfully!`);
} catch (error) {
  console.error("❌ Deployment failed!", error);
  Deno.exit(1);
} finally {
  console.timeEnd("✨ Total deployment time");
}
