import { getRequiredEnv } from "@shared/environment.ts";
import { join } from "@std/path";
import { loadSetupEnv } from "./load-env.ts";
import { remotePaths } from "../utils/remote-paths.ts";
import { run } from "../utils/run.ts";
import { createSsh } from "../utils/ssh.ts";
import { createScp } from "../utils/scp.ts";

// Compiles the remote setup installer and installs it persistently on the
// remote host, so `setup-remote` doesn't need to recompile/upload it on
// every run. Only needs to be re-run when `installer.ts` changes.
await loadSetupEnv();

const remoteHost = getRequiredEnv("REMOTE_HOST");
const ssh = createSsh(remoteHost);
const scp = createScp(remoteHost);
const compileTarget = getRequiredEnv("COMPILE_TARGET");
const remoteInstaller = join(remotePaths.installer, "installer");
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
  await scp.upload(localInstaller, remoteTempInstaller);
  await ssh([
    "sudo",
    "mkdir",
    "-p",
    remotePaths.installer,
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
  await ssh(["rm", "-f", remoteTempInstaller], {
    check: false,
  });
}

if (failed) {
  Deno.exit(1);
}
