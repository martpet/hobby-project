import { getRequiredEnv } from "@shared/environment.ts";
import { join } from "@std/path/posix";
import { loadEnv } from "./utils/load-env.ts";
import { run } from "./utils/run.ts";
import { createSourceArchive } from "./utils/source-archive.ts";

const envName = await loadEnv();
const badge = `[${envName.toUpperCase()}]`;
const localSourceArchive = `dist/${envName}-source.tar.gz`;
const remoteDeployer = join(
  getRequiredEnv("REMOTE_DEPLOYER_PATH"),
  envName,
  "deployer",
);
const remoteHost = getRequiredEnv("REMOTE_HOST");
const { stdout: gitSha } = await run("git", ["rev-parse", "--short", "HEAD"], {
  stdout: "piped",
});
const remoteUploadPath = join(getRequiredEnv("REMOTE_UPLOAD_PATH"), envName);
const remoteSourceArchive = join(
  remoteUploadPath,
  `source-${gitSha}.tar.gz`,
);
let uploadedSourceArchive = false;

console.log(`🚀 Starting deployment to ${badge}...`);
console.time("✨ Total deployment time");

try {
  console.log(`🗜️  Compressing source for ${badge}...`);
  await createSourceArchive(localSourceArchive);

  console.log(
    `📦 Copying "${localSourceArchive}" to "${remoteHost}:${remoteSourceArchive}"...`,
  );

  await run("scp", [
    localSourceArchive,
    `${remoteHost}:${remoteSourceArchive}`,
  ]);
  uploadedSourceArchive = true;

  console.log(
    "⚙️  Running remote deployer...",
  );

  // The fixed sudoers command lets environment-specific deploy groups run the
  // administrator-owned deployer as `hobproj`, but not replace it.
  await run("ssh", [
    "-n",
    remoteHost,
    "cd",
    remoteUploadPath,
    "&&",
    "sudo",
    "-n",
    "-u",
    "hobproj",
    remoteDeployer,
    gitSha,
  ]);

  console.log(`✅ Deployment to ${badge} completed successfully!`);
} catch (error) {
  console.error("❌ Deployment failed!", error);

  if (uploadedSourceArchive) {
    try {
      await run("ssh", ["-n", remoteHost, "rm", "-f", remoteSourceArchive]);
    } catch (cleanupError) {
      console.error(
        `Warning: could not remove ${remoteHost}:${remoteSourceArchive}.`,
        cleanupError,
      );
    }
  }

  Deno.exit(1);
} finally {
  console.timeEnd("✨ Total deployment time");
}
