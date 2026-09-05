import { getRequiredEnv } from "@shared/environment.ts";
import { exists } from "@std/fs/exists";
import { command, commandOutput } from "./utils/command.ts";
import { loadEnv } from "./utils/load-env.ts";

const envName = await loadEnv();
const badge = `[${envName.toUpperCase()}]`;
const localBinary = `dist/${envName}`;
const remoteBinary = getRequiredEnv("REMOTE_BINARY");
const remoteBinaryTemp = `${remoteBinary}.tmp`;
const remoteHost = getRequiredEnv("REMOTE_HOST");
const remoteService = getRequiredEnv("REMOTE_SERVICE");
const appCachePath = getRequiredEnv("REMOTE_CACHE_PATH");
const gitSha = await commandOutput("git", ["rev-parse", "--short", "HEAD"]);
const serviceUnit = remoteService.replace(/\.service$/, "");

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

  // Upload to a temp name, then `mv` (atomic on the same filesystem) so the
  // service never sees a half-written binary.
  await command("scp", [localBinary, `${remoteHost}:${remoteBinaryTemp}`]);

  console.log(
    `⚙️  Updating file and restarting "${remoteService}"...`,
  );

  // `-n` keeps ssh from swallowing this script's stdin. The remote script:
  // - writes the SHA as a systemd drop-in so the app sees GIT_SHA (asset
  //   versioning and the app cache name depend on it),
  // - removes the previous deploy's app cache directory *after* the restart,
  //   since the new process opens a fresh cache named after the new SHA.
  await command("ssh", [
    "-n",
    remoteHost,
    `
      set -e

      mv ${remoteBinaryTemp} ${remoteBinary}
      sudo mkdir -p /etc/systemd/system/${serviceUnit}.service.d
      printf '[Service]\nEnvironment=GIT_SHA=%s\n' ${gitSha} | sudo tee /etc/systemd/system/${serviceUnit}.service.d/git-sha.conf > /dev/null
      sudo systemctl daemon-reload
      sudo systemctl restart ${remoteService}
      sudo rm -rf ${appCachePath}

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
