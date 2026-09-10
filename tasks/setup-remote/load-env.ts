import { applyEnv, loadEnvFile } from "../utils/env-file.ts";

// Loads `tasks/.env.tasks` merged with `tasks/setup-remote/.env.setup` and
// sets the result on the process environment. Used by `setup-remote`, which
// isn't tied to a single staging/prod environment.
export async function loadSetupEnv(): Promise<void> {
  const tasksEnv = await loadEnvFile("./tasks/.env.tasks");
  const setupEnv = await loadEnvFile("./tasks/setup-remote/.env.setup");

  applyEnv({ ...tasksEnv, ...setupEnv });
}
