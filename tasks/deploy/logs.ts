import { getRequiredEnv } from "@shared/environment.ts";
import { loadEnv } from "./load-env.ts";
import { createSsh } from "../utils/ssh.ts";

// Streams live systemd journal logs for `hobproj.<staging|prod>` from the
// remote host. Usage: `deno task logs staging` / `deno task logs prod`.
const envName = await loadEnv();
const remoteHost = getRequiredEnv("REMOTE_HOST");
const ssh = createSsh(remoteHost);
const blueService = `hobproj.${envName}-blue`;
const greenService = `hobproj.${envName}-green`;

console.log(
  `📜 Tailing logs for "${blueService}" and "${greenService}" on "${remoteHost}" (Ctrl+C to stop)...\n`,
);

await ssh(
  [
    "sudo",
    "journalctl",
    "-u",
    blueService,
    "-u",
    greenService,
    "-f",
    "-n",
    "100",
  ],
  { check: false, tty: true },
);
