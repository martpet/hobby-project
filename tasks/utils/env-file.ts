import { load } from "@std/dotenv";
import { exists } from "@std/fs";

// Loads a single env file into a plain object. Exits with an error if the
// file doesn't exist.
export async function loadEnvFile(
  path: string,
): Promise<Record<string, string>> {
  if (!await exists(path)) {
    console.log(`Error: File '${path}' doesn't exist`);
    Deno.exit(1);
  }

  return await load({ envPath: path });
}

// Sets each entry of `env` on the process environment.
export function applyEnv(env: Record<string, string>): void {
  for (const [key, value] of Object.entries(env)) {
    Deno.env.set(key, value);
  }
}
