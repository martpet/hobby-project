import { getRequiredEnv } from "@shared/environment.ts";
import { loadEnv } from "./load-env.ts";
import { run } from "../utils/run.ts";

// Streams live systemd journal logs for `hobproj.<staging|prod>` from the
// remote host. Usage: `deno task logs staging` / `deno task logs prod`.
const envName = await loadEnv();
const remoteHost = getRequiredEnv("REMOTE_HOST");
const service = `hobproj.${envName}`;

console.log(
  `📜 Tailing logs for "${service}" on "${remoteHost}" (Ctrl+C to stop)...\n`,
);

await run(
  "ssh",
  ["-t", remoteHost, "sudo", "journalctl", "-u", service, "-f", "-n", "100"],
  { check: false },
);
