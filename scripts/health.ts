import { getRequiredEnv } from "@shared/environment.ts";
import { command, commandOutput } from "./utils/command.ts";
import { remoteHealthCheckScript } from "./utils/health.ts";
import { loadEnv } from "./utils/load-env.ts";

const envName = await loadEnv();
const badge = `[${envName.toUpperCase()}]`;
const gitSha = await commandOutput("git", ["rev-parse", "--short", "HEAD"]);
const remoteHost = getRequiredEnv("REMOTE_HOST");
const remoteService = getRequiredEnv("REMOTE_SERVICE");
const remoteAppPort = getRequiredEnv("REMOTE_APP_PORT");

console.log(`🩺 Checking ${badge} health...`);

try {
  await command("ssh", [
    "-n",
    remoteHost,
    `set -e\n${remoteHealthCheckScript(remoteService, remoteAppPort, gitSha)}`,
  ]);
  console.log(`✅ ${badge} is serving ${gitSha}.`);
} catch (error) {
  console.error(`❌ ${badge} health check failed!`, error);
  Deno.exit(1);
}
