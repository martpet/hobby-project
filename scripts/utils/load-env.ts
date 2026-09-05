import { load } from "@std/dotenv";
import { exists } from "@std/fs/exists";

const ENV_NAMES = ["prod", "staging"];
const DEFAULT_ENV = "staging";

// Loads `scripts/.env.<prod|staging>` into the process env and returns the
// env name. Called first by build/deploy since everything else reads env.
export async function loadEnv() {
  const envName = Deno.args[0] ?? DEFAULT_ENV;
  const envPath = `./scripts/.env.${envName}`;

  if (!ENV_NAMES.includes(envName)) {
    const envsList = ENV_NAMES.join();
    console.error(`Error: Invalid arg '${envName}'. Must be ${envsList}.`);
    Deno.exit(1);
  }

  if (!await exists(envPath)) {
    console.log(`Error: File '${envPath}' doesn't exist`);
    Deno.exit(1);
  }

  await load({ envPath, export: true });

  return envName;
}
