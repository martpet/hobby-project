import { getRequiredEnv } from "@shared/environment.ts";
import { join } from "@std/path";
import { loadSetupEnv } from "./load-env.ts";
import { getRemotePaths } from "../utils/remote-paths.ts";
import { run } from "../utils/run.ts";

// Compiles the remote setup installer and installs it persistently on the
// remote host, so `setup-remote` doesn't need to recompile/upload it on
// every run. Only needs to be re-run when `installer.ts` changes.
await loadSetupEnv();

const remoteHost = getRequiredEnv("REMOTE_HOST");
const compileTarget = getRequiredEnv("COMPILE_TARGET");
const remoteInstallerRoot = getRemotePaths(
  getRequiredEnv("REMOTE_RUNTIME_ROOT"),
  getRequiredEnv("REMOTE_STATE_ROOT"),
).installer;
const remoteInstaller = join(remoteInstallerRoot, "installer");
const localInstaller = "dist/setup-remote-installer";
const remoteTempInstaller = "installer-setup-remote.tmp";

console.log("🔨 Building remote setup installer...");

let failed = false;

try {
  await run("deno", [
    "compile",
    `--output=${localInstaller}`,
    `--target=${compileTarget}`,
    "-A",
    "tasks/setup-remote/installer.ts",
  ]);

  console.log(
    `📦 Installing remote setup installer to "${remoteHost}:${remoteInstaller}"...`,
  );
  await run("scp", [localInstaller, `${remoteHost}:${remoteTempInstaller}`]);
  await run("ssh", [
    "-n",
    remoteHost,
    "sudo",
    "mkdir",
    "-p",
    remoteInstallerRoot,
    "&&",
    "sudo",
    "install",
    "-o",
    "root",
    "-g",
    "root",
    "-m",
    "0700",
    remoteTempInstaller,
    remoteInstaller,
  ]);

  console.log("✅ Remote setup installer installed.");
  console.log("ℹ️  Run `deno task setup-remote` to run it.");
} catch (error) {
  console.error("❌ Remote setup installer installation failed!", error);
  failed = true;
} finally {
  await run("ssh", ["-n", remoteHost, "rm", "-f", remoteTempInstaller], {
    check: false,
  });
}

if (failed) {
  Deno.exit(1);
}
