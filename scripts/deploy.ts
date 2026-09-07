import { getRequiredEnv } from "@shared/environment.ts";
import { exists } from "@std/fs";
import { command, commandOutput } from "./helpers/command.ts";
import { remoteHealthCheckScript } from "./helpers/health.ts";
import { loadEnv } from "./helpers/load-env.ts";
import { purgeCloudflareCache } from "./helpers/purge-cache.ts";

const envName = await loadEnv();
const badge = `[${envName.toUpperCase()}]`;
const localBinary = `dist/${envName}`;
const remoteBinary = getRequiredEnv("REMOTE_BINARY");
const remoteBinaryTemp = `${remoteBinary}.tmp`;
const remoteBinaryPrevious = `${remoteBinary}.prev`;
const remoteHost = getRequiredEnv("REMOTE_HOST");
const remoteService = getRequiredEnv("REMOTE_SERVICE");
const serverCachePath = getRequiredEnv("REMOTE_CACHE_PATH");
const remoteAppPort = getRequiredEnv("REMOTE_APP_PORT");
const gitSha = await commandOutput("git", ["rev-parse", "--short", "HEAD"]);
const serviceUnit = remoteService.replace(/\.service$/, "");

// These are interpolated into a remote shell script, where an empty or
// whitespace-bearing value turns a targeted command into a destructive or
// failing one (`rm -rf ""`, word-split paths). `getRequiredEnv` only rejects
// unset vars, so validate the shape here.
for (
  const [key, value] of Object.entries({
    REMOTE_BINARY: remoteBinary,
    REMOTE_SERVICE: remoteService,
    REMOTE_CACHE_PATH: serverCachePath,
  })
) {
  if (value.trim() === "" || /\s/.test(value)) {
    console.error(`❌ ${key} must be a non-empty path without whitespace.`);
    Deno.exit(1);
  }
}

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
  // - keeps the replaced binary and SHA drop-in as `.prev` copies and restores
  //   them if the restart, service check or health check fails, then deletes
  //   them once the deploy is healthy. They exist purely to make this one
  //   deploy reversible; rolling back a release that only turns out to be bad
  //   later is `git checkout <sha>` plus a redeploy;
  // - wipes the server cache store once the deploy is known healthy, so a
  //   rolled-back release keeps serving from the cache it built.
  await command("ssh", [
    "-n",
    remoteHost,
    `
      set -e
      previous_binary="${remoteBinaryPrevious}"
      sha_dropin="/etc/systemd/system/${serviceUnit}.service.d/git-sha.conf"
      previous_sha_dropin="\${sha_dropin}.prev"
      installed_binary=false
      installed_sha_dropin=false

      rollback() {
        rollback_status=0
        rm -f "${remoteBinaryTemp}"
        # Branch on what actually exists rather than on a flag, so a failure
        # during the snapshot below can never delete a live binary it didn't
        # manage to copy.
        if [ -f "$previous_binary" ]; then
          mv "$previous_binary" "${remoteBinary}" || rollback_status=1
        elif [ "$installed_binary" = true ]; then
          rm -f "${remoteBinary}" || rollback_status=1
        fi
        if sudo test -f "$previous_sha_dropin"; then
          sudo mv "$previous_sha_dropin" "$sha_dropin" || rollback_status=1
        elif [ "$installed_sha_dropin" = true ]; then
          sudo rm -f "$sha_dropin" || rollback_status=1
        fi
        sudo systemctl daemon-reload || rollback_status=1
        sudo systemctl restart ${remoteService} || rollback_status=1
        sudo systemctl is-active --quiet ${remoteService} || rollback_status=1
        if [ "$rollback_status" -ne 0 ]; then
          echo "Rollback failed; manual recovery is required."
          return 1
        fi
        echo "Rollback completed successfully."
      }

      on_error() {
        error_status=$?
        trap - ERR
        echo "Deployment validation failed; restoring the previous release."
        if ! rollback; then
          exit 1
        fi
        exit "$error_status"
      }
      trap on_error ERR

      if [ -f "${remoteBinary}" ]; then
        rm -f "$previous_binary"
        mv "${remoteBinary}" "$previous_binary"
      fi

      sudo mkdir -p /etc/systemd/system/${serviceUnit}.service.d
      if sudo test -f "$sha_dropin"; then
        sudo rm -f "$previous_sha_dropin"
        sudo cp "$sha_dropin" "$previous_sha_dropin"
      fi
      mv ${remoteBinaryTemp} ${remoteBinary}
      installed_binary=true
      printf '[Service]\nEnvironment=GIT_SHA=%s\n' ${gitSha} | sudo tee "$sha_dropin" > /dev/null
      installed_sha_dropin=true
      sudo systemctl daemon-reload
      sudo systemctl restart ${remoteService}

      if ! sudo systemctl is-active --quiet ${remoteService}; then
        echo "Service '${remoteService}' is not running."
        sudo systemctl status ${remoteService} --no-pager || true
        false
      fi

      ${remoteHealthCheckScript(remoteService, remoteAppPort, gitSha)}

      # The release is healthy from here on, so nothing below may trigger a
      # rollback or fail the deploy: disarm the trap and let cleanup errors
      # through, since leftover files are cosmetic next to a working service.
      trap - ERR

      sudo rm -rf "${serverCachePath}" || echo "Warning: could not wipe the server cache."
      rm -f "$previous_binary" || echo "Warning: could not remove $previous_binary."
      sudo rm -f "$previous_sha_dropin" || echo "Warning: could not remove $previous_sha_dropin."
    `,
  ]);

  console.log(`✅ Deployment to ${badge} completed successfully!`);

  // Purges only this environment's HTML cache tag, so staging and prod
  // deploys never evict each other's cache despite sharing a zone. Like the
  // server cache wipe it only runs once the deploy is healthy, which also
  // avoids spending API calls on a release we'd roll back. A failure here
  // leaves stale HTML but a healthy release, so it only warns.
  try {
    await purgeCloudflareCache(envName);
  } catch (error) {
    console.error(
      `⚠️  Deployment succeeded, but Cloudflare cache purge failed. Retry with 'deno task purge-cloudflare-cache ${envName}'.`,
      error,
    );
  }
} catch (error) {
  console.error("❌ Deployment failed!", error);
  Deno.exit(1);
} finally {
  console.timeEnd("✨ Total deployment time");
}
