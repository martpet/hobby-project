import { run } from "../utils/run.ts";

export async function fileSha256(path: string): Promise<string> {
  const { stdout } = await run("shasum", ["-a", "256", path], {
    stdout: "piped",
  });
  return stdout.split(/\s+/)[0];
}

// Backups are only trustworthy if the archive matches what was written, so
// both restore paths verify before extracting anything. `config_sha256` was
// added later, so a backup predating it is reported but still recoverable:
// refusing to recover from an otherwise valid backup would be worse than
// not verifying it, and a wrong password already fails at decryption.
export async function verifyChecksum(
  archivePath: string,
  manifestPath: string,
  key: "archive_sha256" | "config_sha256",
): Promise<void> {
  const manifest = await Deno.readTextFile(manifestPath);
  const expected = manifest.match(new RegExp(`^${key}=(\\S+)$`, "m"))?.[1];
  if (expected === undefined) {
    if (key === "archive_sha256") {
      throw new Error(`Backup manifest does not contain ${key}.`);
    }
    console.warn(
      `⚠️  This backup predates ${key}, so its contents cannot be verified.`,
    );
    return;
  }

  const actual = await fileSha256(archivePath);
  if (actual !== expected) {
    throw new Error("Backup archive checksum does not match its manifest.");
  }
}
