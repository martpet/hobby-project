import { getRequiredEnv } from "@shared/environment.ts";
import { join } from "@std/path";
import { loadEnv } from "./load-env.ts";
import { run } from "../utils/run.ts";

const envName = await loadEnv();
const badge = `[${envName.toUpperCase()}]`;
const localRemoteDeployer = `dist/remote-deployer-${envName}`;
const remoteDeployerRoot = getRequiredEnv("REMOTE_DEPLOYER_PATH");
const remoteAppRoot = getRequiredEnv("REMOTE_APP_PATH");
const remoteUploadRoot = getRequiredEnv("REMOTE_UPLOAD_PATH");
const remoteCacheRoot = getRequiredEnv("REMOTE_CACHE_PATH");
// Matches the `ETC_ROOT` constant in `tasks/setup-remote/installer.ts`,
// where the per-env active-color file and Caddy upstream snippet live.
const remoteEtcRoot = "/etc/hobproj";
const remoteDeployer = join(remoteDeployerRoot, envName, "deployer");
const remoteAppPath = join(remoteAppRoot, envName);
const remoteUploadPath = join(remoteUploadRoot, envName);
const remoteEtcEnvPath = join(remoteEtcRoot, envName);
const remoteTempDeployer = `deployer-${envName}.tmp`;
const remoteHost = getRequiredEnv("REMOTE_HOST");
const compileTarget = getRequiredEnv("COMPILE_TARGET");
const bluePort = getRequiredEnv(`${envName.toUpperCase()}_BLUE_PORT`);
const greenPort = getRequiredEnv(`${envName.toUpperCase()}_GREEN_PORT`);
const allowNet = `${
  getRequiredEnv("ALLOW_NET")
},127.0.0.1:${bluePort},127.0.0.1:${greenPort}`;

console.log(`🔨 Building remote deployer for ${badge}...`);

let failed = false;

try {
  await run("deno", [
    "compile",
    `--output=${localRemoteDeployer}`,
    `--target=${compileTarget}`,
    `--allow-read=${remoteDeployerRoot},${remoteAppPath},${remoteUploadPath},${remoteCacheRoot},${remoteEtcEnvPath}`,
    `--allow-write=${remoteAppPath},${remoteUploadPath},${remoteCacheRoot},${remoteEtcEnvPath}`,
    "--allow-run",
    `--allow-net=${allowNet}`,
    "tasks/deploy/deployer.ts",
  ]);

  console.log(
    `📦 Installing remote deployer to "${remoteHost}:${remoteDeployer}"...`,
  );
  await run("scp", [
    localRemoteDeployer,
    `${remoteHost}:${remoteTempDeployer}`,
  ]);
  await run("ssh", [
    "-n",
    remoteHost,
    "sudo",
    "install",
    "-o",
    "root",
    "-g",
    "root",
    "-m",
    "0755",
    remoteTempDeployer,
    remoteDeployer,
  ]);

  console.log(`✅ Remote deployer installed for ${badge}.`);
  console.log(
    `ℹ️  It will read config from "${remoteDeployerRoot}/.env.deployer" and "${
      join(remoteDeployerRoot, envName, ".env.deployer")
    }".`,
  );
} catch (error) {
  console.error("❌ Remote deployer installation failed!", error);
  failed = true;
} finally {
  await run("ssh", ["-n", remoteHost, "rm", "-f", remoteTempDeployer], {
    check: false,
  });
}

if (failed) {
  Deno.exit(1);
}
