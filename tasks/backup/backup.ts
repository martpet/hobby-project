import { getRequiredEnv } from "@shared/environment.ts";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { loadBackupEnv } from "./load-env.ts";
import { fileSha256 } from "./checksum.ts";
import { resolveEncryptionPassword } from "./password.ts";
import { pruneExpiredBackups } from "./prune.ts";
import { run } from "../utils/run.ts";
import { createSsh } from "../utils/ssh.ts";
import { createScp } from "../utils/scp.ts";

type EnvName = "staging" | "prod";

// This task backs up one remote environment's SQLite database. Local env
// files are handled separately by `deno task backup-config`.
const envName = Deno.args[0] as EnvName | undefined;
if (envName !== "staging" && envName !== "prod") {
  throw new Error("Usage: deno task backup <staging|prod>.");
}

await loadBackupEnv();

const remoteHost = getRequiredEnv("REMOTE_HOST");
const ssh = createSsh(remoteHost);
const scp = createScp(remoteHost);
const backupRoot = getRequiredEnv("BACKUP_LOCAL_PATH");
const encryptionPassword = await resolveEncryptionPassword();
const timestamp = new Date().toISOString().replaceAll(":", "-");
const finalDir = join(backupRoot, envName, timestamp);
const tempDir = `${finalDir}.tmp`;
const remoteArchive = `/tmp/hobproj-${envName}-${timestamp}.tar.gz`;
const localArchive = join(tempDir, "database.tar.gz");
const encryptedArchiveTemp = join(tempDir, "database.tar.gz.enc");
const dbPath = `/mnt/store/${envName}/db`;
const remoteSnapshot = `/tmp/hobproj-${envName}-${timestamp}.sqlite`;

try {
  await Deno.mkdir(tempDir, { recursive: true });

  // SQLite's online backup creates a consistent snapshot without stopping the
  // application. Validate it before transferring the archive to the laptop.
  console.log(`Creating an online SQLite snapshot for ${envName}...`);
  await ssh([
    "sudo",
    "sqlite3",
    `${dbPath}/kv.sqlite`,
  ], {
    input: `.backup ${remoteSnapshot}\n`,
  });
  await ssh([
    "sudo",
    "sqlite3",
    remoteSnapshot,
  ], {
    input: "PRAGMA integrity_check;\n",
    stdout: "piped",
  });
  await ssh([
    "sudo",
    "tar",
    "--ignore-failed-read",
    "-czf",
    remoteArchive,
    "-C",
    "/tmp",
    remoteSnapshot.split("/").at(-1)!,
  ]);
  await ssh(["sudo", "chmod", "0644", remoteArchive]);
  await scp.download(remoteArchive, localArchive);

  // Record the checksum and metadata beside the encrypted archive so restore
  // can verify that the downloaded snapshot was not changed or truncated.
  const archiveBytes = await Deno.readFile(localArchive);
  const archiveHash = await fileSha256(localArchive);
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

  // Publish atomically: incomplete `.tmp` directories are never mistaken for
  // completed backups by retention or restore tooling.
  await Deno.remove(localArchive);
  const encryptedArchive = join(finalDir, "database.tar.gz.enc");
  await Deno.writeTextFile(
    join(tempDir, "manifest.txt"),
    `${manifest}encrypted_archive=${encryptedArchive}\n`,
  );
  await Deno.rename(tempDir, finalDir);
  console.log(`✅ Encrypted backup written to ${encryptedArchive}`);
  await pruneExpiredBackups(join(backupRoot, envName));
} finally {
  // Remote snapshots and local temporary files are disposable, even when a
  // transfer, encryption, or validation step fails.
  await ssh(
    ["sudo", "rm", "-f", remoteArchive, remoteSnapshot],
    { check: false },
  );
  if (await exists(tempDir)) {
    await Deno.remove(tempDir, { recursive: true });
  }
}
