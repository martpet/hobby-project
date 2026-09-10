import { getRequiredEnv } from "@shared/environment.ts";
import { exists } from "@std/fs";
import { dirname, join } from "@std/path";
import { applyEnv, loadEnvFile } from "../utils/load-env.ts";
import { resolveEncryptionPassword } from "./password.ts";
import { DEFAULT_RETENTION, selectExpiredBackups } from "./retention.ts";
import { run } from "../utils/run.ts";

type EnvName = "staging" | "prod";

const CONFIG_FILES = [
  ".env",
  "tasks/.env.tasks",
  "tasks/deploy/.env.deploy",
  "tasks/setup-remote/.env.setup",
  "tasks/backup/.env.backup",
];

const envName = Deno.args[0] as EnvName | undefined;
if (envName !== "staging" && envName !== "prod") {
  throw new Error("Usage: deno task backup <staging|prod>.");
}

const tasksEnv = await loadEnvFile("./tasks/.env.tasks");
const backupEnv = await loadEnvFile("./tasks/backup/.env.backup");
applyEnv(tasksEnv);
applyBackupEnv(backupEnv);

const remoteHost = getRequiredEnv("REMOTE_HOST");
const backupRoot = getRequiredEnv("BACKUP_LOCAL_PATH");
const encryptionPassword = await resolveEncryptionPassword();
const timestamp = new Date().toISOString().replaceAll(":", "-");
const finalDir = join(backupRoot, envName, timestamp);
const tempDir = `${finalDir}.tmp`;
const remoteArchive = `/tmp/hobproj-${envName}-${timestamp}.tar.gz`;
const localArchive = join(tempDir, "database.tar.gz");
const encryptedArchiveTemp = join(tempDir, "database.tar.gz.enc");
// Staged outside `tempDir` so the plaintext copies can never be promoted into
// the synced backup folder when `tempDir` is renamed to `finalDir`.
const stagingDir = await Deno.makeTempDir({ prefix: "hobproj-backup-" });
const configArchive = join(stagingDir, "config.tar.gz");
const encryptedConfigArchiveTemp = join(tempDir, "config.tar.gz.enc");
const dbPath = `/mnt/store/${envName}/db`;
const remoteSnapshot = `/tmp/hobproj-${envName}-${timestamp}.sqlite`;

try {
  await Deno.mkdir(tempDir, { recursive: true });
  await createConfigurationArchive(stagingDir, configArchive);

  console.log(`Creating an online SQLite snapshot for ${envName}...`);
  await run("ssh", [
    remoteHost,
    "sudo",
    "sqlite3",
    `${dbPath}/kv.sqlite`,
  ], {
    input: `.backup ${remoteSnapshot}\n`,
  });
  await run("ssh", [
    remoteHost,
    "sudo",
    "sqlite3",
    remoteSnapshot,
  ], {
    input: "PRAGMA integrity_check;\n",
    stdout: "piped",
  });
  await run("ssh", [
    "-n",
    remoteHost,
    "sudo",
    "tar",
    "--ignore-failed-read",
    "-czf",
    remoteArchive,
    "-C",
    "/tmp",
    remoteSnapshot.split("/").at(-1)!,
  ]);
  await run("ssh", ["-n", remoteHost, "sudo", "chmod", "0644", remoteArchive]);
  await run("scp", [`${remoteHost}:${remoteArchive}`, localArchive]);

  const archiveBytes = await Deno.readFile(localArchive);
  const archiveHash = (await run(
    "shasum",
    ["-a", "256", localArchive],
    { stdout: "piped" },
  )).stdout.split(/\s+/)[0];
  const manifest = [
    `environment=${envName}`,
    `created_at=${new Date().toISOString()}`,
    `source_path=${dbPath}`,
    `archive_sha256=${archiveHash}`,
    `archive_bytes=${archiveBytes.byteLength}`,
    "database_format=sqlite",
    "consistency=sqlite online backup snapshot",
    "",
  ].join("\n");
  await Deno.writeTextFile(join(tempDir, "manifest.txt"), manifest);

  await run("openssl", [
    "enc",
    "-aes-256-cbc",
    "-pbkdf2",
    "-salt",
    "-pass",
    "env:BACKUP_ENCRYPTION_PASSWORD",
    "-in",
    localArchive,
    "-out",
    encryptedArchiveTemp,
  ], { env: { BACKUP_ENCRYPTION_PASSWORD: encryptionPassword } });

  await run("openssl", [
    "enc",
    "-aes-256-cbc",
    "-pbkdf2",
    "-salt",
    "-pass",
    "env:BACKUP_ENCRYPTION_PASSWORD",
    "-in",
    configArchive,
    "-out",
    encryptedConfigArchiveTemp,
  ], { env: { BACKUP_ENCRYPTION_PASSWORD: encryptionPassword } });

  await Deno.remove(localArchive);
  const encryptedArchive = join(finalDir, "database.tar.gz.enc");
  const encryptedConfigArchive = join(finalDir, "config.tar.gz.enc");
  await Deno.writeTextFile(
    join(tempDir, "manifest.txt"),
    `${manifest}encrypted_archive=${encryptedArchive}\n` +
      `encrypted_config_archive=${encryptedConfigArchive}\n` +
      `config_files=${CONFIG_FILES.join(",")}\n`,
  );
  await Deno.rename(tempDir, finalDir);
  console.log(`✅ Encrypted backup written to ${encryptedArchive}`);
  console.log(
    `✅ Encrypted configuration written to ${encryptedConfigArchive}`,
  );
  await pruneExpiredBackups(join(backupRoot, envName));
} finally {
  await run(
    "ssh",
    ["-n", remoteHost, "sudo", "rm", "-f", remoteArchive, remoteSnapshot],
    { check: false },
  );
  if (await exists(tempDir)) {
    await Deno.remove(tempDir, { recursive: true });
  }
  await Deno.remove(stagingDir, { recursive: true });
}

async function createConfigurationArchive(
  stagingDir: string,
  archivePath: string,
): Promise<void> {
  const configRoot = join(stagingDir, "config");

  for (const relativePath of CONFIG_FILES) {
    const destination = join(configRoot, relativePath);
    const content = await Deno.readTextFile(relativePath);
    await Deno.mkdir(dirname(destination), { recursive: true });
    await Deno.writeTextFile(destination, content);
  }

  await run("tar", ["-czf", archivePath, "-C", stagingDir, "config"]);
}

async function pruneExpiredBackups(envRoot: string): Promise<void> {
  const names = [];
  try {
    for await (const entry of Deno.readDir(envRoot)) {
      if (entry.isDirectory && !entry.name.endsWith(".tmp")) {
        names.push(entry.name);
      }
    }
  } catch (error) {
    // The backup itself already succeeded, so a failure to prune must not fail
    // the task. On macOS, listing an iCloud folder raises EPERM until the
    // terminal is granted Full Disk Access, even though writing works.
    console.warn(
      `⚠️  Skipped retention: could not list ${envRoot} ` +
        `(${(error as Error).message}).`,
    );
    if (error instanceof Deno.errors.PermissionDenied) {
      console.warn(
        "⚠️  Grant your terminal Full Disk Access in System Settings > " +
          "Privacy & Security to enable automatic pruning.",
      );
    }
    return;
  }

  const expired = selectExpiredBackups(names, DEFAULT_RETENTION);
  for (const name of expired) {
    await Deno.remove(join(envRoot, name), { recursive: true });
    console.log(`🗑️  Pruned expired backup ${name}`);
  }
  console.log(
    `✅ Retention: kept ${names.length - expired.length} backup(s) ` +
      `(${DEFAULT_RETENTION.daily} daily, ${DEFAULT_RETENTION.weekly} weekly, ` +
      `${DEFAULT_RETENTION.monthly} monthly).`,
  );
}

function applyBackupEnv(env: Record<string, string>): void {
  applyEnv(
    Object.fromEntries(
      Object.entries(env).filter(([key, value]) =>
        value !== "" && Deno.env.get(key) === undefined
      ),
    ),
  );
}
