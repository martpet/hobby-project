import { getRequiredEnv } from "@shared/environment.ts";
import { command } from "./utils/command.ts";
import { loadEnv } from "./utils/load-env.ts";

const envName = await loadEnv();
const badge = `[${envName.toUpperCase()}]`;
const outputBinary = `./dist/${envName}`;
const compileTarget = getRequiredEnv("DENO_COMPILE_TARGET");
const allowRead = Deno.env.get("DENO_ALLOW_READ");
const allowWrite = Deno.env.get("DENO_ALLOW_WRITE");

const args = [
  "--permission-set=build",
  `--output=${outputBinary}`,
  `--target=${compileTarget}`,
  // Static assets are read at runtime via `import.meta.dirname`, so the whole
  // `src/` tree is embedded (pattern support: https://github.com/denoland/deno/issues/35037)
  "--include=src/",
];

// Runtime permissions baked into the binary (KV path, GeoIP DB, cache dir).
// Come from the per-env `.env.<name>` loaded above.
if (allowRead) {
  args.push(`--allow-read=${allowRead}`);
}

if (allowWrite) {
  args.push(`--allow-write=${allowWrite}`);
}

console.time("✨ Total build time");
console.log(`🔨 Building binary for ${badge}...`);

try {
  await command("deno", ["compile", ...args, "src/main.ts"]);
  console.log(
    `✅ Build for ${badge} finished successfully! Output: '${outputBinary}'`,
  );
} catch (error) {
  console.error(`❌ Build failed!`, error);
  Deno.exit(1);
} finally {
  console.timeEnd("✨ Total build time");
}
