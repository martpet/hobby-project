import { applyEnv, loadEnvFile } from "../utils/env-file.ts";

// Loads `tasks/.env.tasks` merged with `tasks/backup/.env.backup` and sets the
// result on the process environment. Used by `backup` and `restore`, which
// aren't tied to a single staging/prod environment.
//
// Values already present in the environment win over the file, so a one-off
// `BACKUP_ENCRYPTION_PASSWORD=... deno task backup-db` overrides the stored one.
// Empty values are skipped so a placeholder key never shadows the Keychain.
export async function loadBackupEnv(): Promise<void> {
  const tasksEnv = await loadEnvFile("./tasks/.env.tasks");
  const backupEnv = await loadEnvFile("./tasks/backup/.env.backup");

  applyEnv(tasksEnv);
  applyEnv(
    Object.fromEntries(
      Object.entries(backupEnv).filter(([key, value]) =>
        value !== "" && Deno.env.get(key) === undefined
      ),
    ),
  );
}
