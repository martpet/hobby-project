import { getRequiredEnv } from "@shared/environment.ts";
import { join } from "@std/path";
import { loadEnv } from "./load-env.ts";
import { remotePaths } from "../utils/remote-paths.ts";
import { run } from "../utils/run.ts";
import { createSsh } from "../utils/ssh.ts";
import { createScp } from "../utils/scp.ts";
import { createSourceArchive } from "./source-archive.ts";

console.log("🔍 Running local checks...");
await run("deno", ["task", "check:src"]);

const envName = await loadEnv();
const badge = `[${envName.toUpperCase()}]`;
const deploymentId = await createDeploymentId(envName);
const localSourceArchive = `dist/${envName}-source.tar.gz`;
const remoteDeployer = join(
  remotePaths.deployer,
  envName,
  "deployer",
);
const remoteHost = getRequiredEnv("REMOTE_HOST");
const ssh = createSsh(remoteHost);
const scp = createScp(remoteHost);
const remoteUploadPath = join(remotePaths.upload, envName);
const remoteSourceArchive = join(
  remoteUploadPath,
  `source-${deploymentId}.tar.gz`,
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

  await scp.upload(localSourceArchive, remoteSourceArchive);
  uploadedSourceArchive = true;

  console.log(
    "⚙️  Running remote deployer...",
  );

  // The fixed sudoers command lets environment-specific deploy groups run the
  // administrator-owned deployer as `hobproj`, but not replace it.
  await ssh([
    "cd",
    remoteUploadPath,
    "&&",
    "sudo",
    "-n",
    "-u",
    "hobproj",
    remoteDeployer,
    deploymentId,
  ]);

  console.log(`✅ Deployment to ${badge} completed successfully!`);
} catch (error) {
  console.error("❌ Deployment failed!", error);

  if (uploadedSourceArchive) {
    try {
      await ssh(["rm", "-f", remoteSourceArchive]);
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

async function createDeploymentId(
  envName: "staging" | "prod",
): Promise<string> {
  const { stdout: gitSha } = await run(
    "git",
    ["rev-parse", "--short", "HEAD"],
    { stdout: "piped" },
  );
  const { stdout: status } = await run(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { stdout: "piped" },
  );

  if (status === "") {
    return gitSha;
  }

  if (envName === "prod") {
    throw new Error(
      "Production deployments require a clean working tree. Commit or stash your changes first.",
    );
  }

  const timestamp = new Date().toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(".", "");
  return `${gitSha}-dirty-${timestamp}`;
}
