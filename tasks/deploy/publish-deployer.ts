import { getRequiredEnv } from "@shared/environment.ts";
import { join } from "@std/path";
import { loadEnv } from "./load-env.ts";
import { remotePaths } from "../utils/remote-paths.ts";
import { run } from "../utils/run.ts";
import { createSsh } from "../utils/ssh.ts";
import { createScp } from "../utils/scp.ts";
import { loadEnvFile } from "../utils/env-file.ts";

const envName = await loadEnv();
const setupEnv = await loadEnvFile("./tasks/setup-remote/.env.setup");
const usbMountPath = setupEnv.USB_MOUNT_PATH;
if (usbMountPath === undefined) {
  throw new Error("Missing USB_MOUNT_PATH in tasks/setup-remote/.env.setup.");
}
const badge = `[${envName.toUpperCase()}]`;
const localRemoteDeployer = `dist/remote-deployer-${envName}`;
const remoteDeployerRoot = remotePaths.deployer;
const remoteAppRoot = remotePaths.app;
const remoteUploadRoot = remotePaths.upload;
const remoteCacheRoot = remotePaths.cache;
// Matches the `ETC_ROOT` constant in `tasks/setup-remote/installer.ts`,
// where the per-env active-color file and Caddy upstream snippet live.
const remoteEtcRoot = "/etc/hobproj";
const remoteDeployer = join(remoteDeployerRoot, envName, "deployer");
const remoteAppPath = join(remoteAppRoot, envName);
const persistentDataPath = join(
  usbMountPath,
  envName,
  "db",
);
const remoteUploadPath = join(remoteUploadRoot, envName);
const remoteEtcEnvPath = join(remoteEtcRoot, envName);
const remoteTempDeployer = `deployer-${envName}.tmp`;
const remoteHost = getRequiredEnv("REMOTE_HOST");
const ssh = createSsh(remoteHost);
const scp = createScp(remoteHost);
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
    `--allow-read=${remoteDeployerRoot},${remoteAppPath},${remoteUploadPath},${remoteCacheRoot},${persistentDataPath},${remoteEtcEnvPath}`,
    `--allow-write=${remoteAppPath},${remoteUploadPath},${remoteCacheRoot},${persistentDataPath},${remoteEtcEnvPath}`,
    "--allow-run",
    `--allow-net=${allowNet}`,
    "tasks/deploy/deployer.ts",
  ]);

  console.log(
    `📦 Installing remote deployer to "${remoteHost}:${remoteDeployer}"...`,
  );
  await scp.upload(localRemoteDeployer, remoteTempDeployer);
  await ssh([
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
  await ssh(["rm", "-f", remoteTempDeployer], {
    check: false,
  });
}

if (failed) {
  Deno.exit(1);
}
