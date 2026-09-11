import { dirname, join } from "@std/path";
import { exists } from "@std/fs";
import { verifyChecksum } from "./checksum.ts";
import { resolveEncryptionPassword } from "./password.ts";
import { run } from "../utils/run.ts";

// Recovers the env files from a backup's `config.tar.gz.enc`. Separate from
// `restore` because these are plaintext secrets: they are written to a
// directory you name rather than into the repository, and an existing file is
// never overwritten.
//
// Usage: deno task restore-config <config.tar.gz.enc> [target-dir]

const encryptedArchive = Deno.args[0];
if (encryptedArchive === undefined) {
  throw new Error(
    "Usage: deno task restore-config <config.tar.gz.enc> [target-dir].",
  );
}
if (!encryptedArchive.endsWith("config.tar.gz.enc")) {
  throw new Error(
    "Expected a config.tar.gz.enc archive. Use `deno task restore-db` for the " +
      "database.",
  );
}

const targetRoot = Deno.args[1] ?? "./restored-config";
if (await exists(targetRoot)) {
  throw new Error(
    `"${targetRoot}" already exists. Remove it or name another directory so ` +
      "recovered secrets never overwrite existing files.",
  );
}

const password = await resolveEncryptionPassword();
const tempDir = await Deno.makeTempDir({ prefix: "hobproj-config-" });
const decryptedArchive = join(tempDir, "config.tar.gz");

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
  await verifyChecksum(decryptedArchive, manifestPath, "config_sha256");

  await Deno.mkdir(targetRoot, { recursive: true });
  await run("tar", [
    "-xzf",
    decryptedArchive,
    "-C",
    targetRoot,
    "--strip-components=1",
  ]);
  await Deno.chmod(targetRoot, 0o700);

  const recovered: string[] = [];
  for await (const path of walk(targetRoot)) {
    await Deno.chmod(path, 0o600);
    recovered.push(path);
  }
  recovered.sort();

  console.log(`✅ Recovered ${recovered.length} env file(s) to ${targetRoot}:`);
  for (const path of recovered) {
    console.log(`   ${path}`);
  }
  console.log(
    "⚠️  These are plaintext secrets. Move them into place, then delete the " +
      "directory.",
  );
} finally {
  await Deno.remove(tempDir, { recursive: true });
}

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const path = join(dir, entry.name);
    if (entry.isDirectory) {
      yield* walk(path);
    } else if (entry.isFile) {
      yield path;
    }
  }
}
