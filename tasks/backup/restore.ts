import { getRequiredEnv } from "@shared/environment.ts";
import { dirname, join } from "@std/path";
import { loadBackupEnv } from "./load-env.ts";
import { verifyChecksum } from "./checksum.ts";
import { resolveEncryptionPassword } from "./password.ts";
import { run } from "../utils/run.ts";

const encryptedArchive = Deno.args[0];
if (encryptedArchive === undefined) {
  throw new Error("Usage: deno task restore-db <database.tar.gz.enc>.");
}
if (encryptedArchive.endsWith("config.tar.gz.enc")) {
  throw new Error(
    "That is the configuration archive. Use `deno task restore-config` " +
      "to recover env files.",
  );
}

await loadBackupEnv();

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

  const manifestPath = join(dirname(encryptedArchive), "manifest.txt");
  await verifyChecksum(decryptedArchive, manifestPath, "archive_sha256");

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
