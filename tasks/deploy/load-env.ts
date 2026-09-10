import { EnvName } from "@shared/environment.ts";
import { applyEnv, loadEnvFile } from "../utils/env-file.ts";

type DeployEnvName = Extract<EnvName, "prod" | "staging">;

const ENV_NAMES: DeployEnvName[] = ["prod", "staging"];
const DEFAULT_ENV: DeployEnvName = "staging";

// Loads `tasks/.env.tasks`, then `tasks/deploy/.env.deploy`, and returns the
// env name. Called first since everything else reads env.
export async function loadEnv(): Promise<DeployEnvName> {
  const envName = Deno.args[0] ?? DEFAULT_ENV;

  if (!ENV_NAMES.includes(envName as DeployEnvName)) {
    const envsList = ENV_NAMES.join();
    console.error(`Error: Invalid arg '${envName}'. Must be ${envsList}.`);
    Deno.exit(1);
  }

  const tasksEnv = await loadEnvFile("./tasks/.env.tasks");
  const deployEnv = await loadEnvFile("./tasks/deploy/.env.deploy");
  const mergedEnv = { ...tasksEnv, ...deployEnv };

  applyEnv(mergedEnv);

  return envName as DeployEnvName;
}
