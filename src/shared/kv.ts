import { getEnv } from "@shared/environment.ts";

const kvPath = getEnv("KV_PATH");

// Unset → Deno's default per-project location; a path → SQLite file there.
// The `kv` unstable flag is enabled in deno.json.
export const kv = await Deno.openKv(kvPath);
