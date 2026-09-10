import { dirname, join } from "@std/path";
import { exists } from "@std/fs";
import { getRequiredEnv } from "@shared/environment.ts";
import { loadBackupEnv } from "./load-env.ts";
import { fileSha256 } from "./checksum.ts";
import { resolveEncryptionPassword } from "./password.ts";
import { pruneExpiredBackups } from "./prune.ts";
import { run } from "../utils/run.ts";

const CONFIG_FILES = [
  ".env",
  "tasks/.env.tasks",
  "tasks/deploy/.env.deploy",
  "tasks/setup-remote/.env.setup",
  "tasks/backup/.env.backup",
];

await loadBackupEnv();

const backupRoot = getRequiredEnv("BACKUP_LOCAL_PATH");
const encryptionPassword = await resolveEncryptionPassword();
const timestamp = new Date().toISOString().replaceAll(":", "-");
const finalDir = join(backupRoot, "config", timestamp);
const tempDir = `${finalDir}.tmp`;
const stagingDir = await Deno.makeTempDir({ prefix: "hobproj-config-" });
const configArchive = join(stagingDir, "config.tar.gz");
const encryptedArchiveTemp = join(tempDir, "config.tar.gz.enc");

try {
  await Deno.mkdir(tempDir, { recursive: true });
  await createConfigurationArchive(stagingDir, configArchive);

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
    encryptedArchiveTemp,
  ], { env: { BACKUP_ENCRYPTION_PASSWORD: encryptionPassword } });

  const configHash = await fileSha256(configArchive);
  const manifest = [
    "scope=local-configuration",
    `created_at=${new Date().toISOString()}`,
    `config_sha256=${configHash}`,
    `config_files=${CONFIG_FILES.join(",")}`,
    "",
  ].join("\n");
  await Deno.writeTextFile(join(tempDir, "manifest.txt"), manifest);

  const encryptedArchive = join(finalDir, "config.tar.gz.enc");
  await Deno.rename(tempDir, finalDir);
  console.log(`✅ Encrypted configuration written to ${encryptedArchive}`);
  await pruneExpiredBackups(join(backupRoot, "config"));
} finally {
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
