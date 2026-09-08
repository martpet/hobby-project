import { load } from "@std/dotenv";
import { exists } from "@std/fs";
import { EnvName } from "@shared/environment.ts";

type DeployEnvName = Extract<EnvName, "prod" | "staging">;

const ENV_NAMES: DeployEnvName[] = ["prod", "staging"];
const DEFAULT_ENV: DeployEnvName = "staging";

// Loads `tasks/.env.common` first, then `tasks/.env.<prod|staging>`, and
// returns the env name. Called first since everything else reads env.
export async function loadEnv(): Promise<DeployEnvName> {
  const envName = Deno.args[0] ?? DEFAULT_ENV;
  const commonEnvPath = "./tasks/.env.common";
  const envPath = `./tasks/.env.${envName}`;

  if (!ENV_NAMES.includes(envName as DeployEnvName)) {
    const envsList = ENV_NAMES.join();
    console.error(`Error: Invalid arg '${envName}'. Must be ${envsList}.`);
    Deno.exit(1);
  }

  if (!await exists(commonEnvPath)) {
    console.log(`Error: File '${commonEnvPath}' doesn't exist`);
    Deno.exit(1);
  }

  if (!await exists(envPath)) {
    console.log(`Error: File '${envPath}' doesn't exist`);
    Deno.exit(1);
  }

  const commonEnv = await load({ envPath: commonEnvPath });
  const deployEnv = await load({ envPath });
  const mergedEnv = { ...commonEnv, ...deployEnv };

  if (commonEnv.ALLOW_NET !== undefined && deployEnv.ALLOW_NET !== undefined) {
    mergedEnv.ALLOW_NET = `${commonEnv.ALLOW_NET},${deployEnv.ALLOW_NET}`;
  }

  for (const [key, value] of Object.entries(mergedEnv)) {
    Deno.env.set(key, value);
  }

  return envName as DeployEnvName;
}
