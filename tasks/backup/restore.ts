import { getRequiredEnv } from "@shared/environment.ts";
import { dirname, join } from "@std/path";
import { applyEnv, loadEnvFile } from "../utils/env-file.ts";
import { resolveEncryptionPassword } from "./password.ts";
import { run } from "../utils/run.ts";

const encryptedArchive = Deno.args[0];
if (encryptedArchive === undefined) {
  throw new Error("Usage: deno task restore <database.tar.gz.enc>.");
}

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

const password = await resolveEncryptionPassword();
const targetRoot = getRequiredEnv("RESTORE_TARGET_PATH");
const tempDir = await Deno.makeTempDir({ prefix: "hobproj-restore-" });
const decryptedArchive = join(tempDir, "database.tar.gz");

try {
  await run("openssl", [
    "enc",
    "-d",
    "-aes-256-cbc",
    "-pbkdf2",
    "-pass",
    "env:BACKUP_ENCRYPTION_PASSWORD",
    "-in",
    encryptedArchive,
    "-out",
    decryptedArchive,
  ], { env: { BACKUP_ENCRYPTION_PASSWORD: password } });

  const manifest = await Deno.readTextFile(
    join(dirname(encryptedArchive), "manifest.txt"),
  );
  const expectedHash = manifest.match(/^archive_sha256=(\S+)$/m)?.[1];
  if (expectedHash === undefined) {
    throw new Error("Backup manifest does not contain archive_sha256.");
  }
  const actualHash = (await run(
    "shasum",
    ["-a", "256", decryptedArchive],
    { stdout: "piped" },
  )).stdout.split(/\s+/)[0];
  if (actualHash !== expectedHash) {
    throw new Error("Backup archive checksum does not match its manifest.");
  }

  await Deno.mkdir(targetRoot, { recursive: true });
  await run("tar", [
    "-xzf",
    decryptedArchive,
    "-C",
    targetRoot,
  ]);

  const entries = [];
  for await (const entry of Deno.readDir(targetRoot)) {
    if (entry.isFile && entry.name.endsWith(".sqlite")) {
      entries.push(entry.name);
    }
  }
  if (entries.length !== 1) {
    throw new Error("Restored archive must contain exactly one SQLite file.");
  }
  const databasePath = join(targetRoot, entries[0]);
  await run("sqlite3", [databasePath, "PRAGMA integrity_check;"]);
  console.log(`✅ Restored database passed integrity check: ${databasePath}`);
} finally {
  await Deno.remove(tempDir, { recursive: true });
}
