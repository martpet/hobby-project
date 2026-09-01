import { getEnv } from "@shared/environment.ts";

const kvPath = getEnv("KV_PATH");

export const kv = await Deno.openKv(kvPath);
