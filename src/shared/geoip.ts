import { Maxmind } from "@josh-hemphill/maxminddb-wasm";
import { getEnv } from "@shared/environment.ts";

const dbPath = getEnv("MAXMIND_DB_PATH");

export const maxmind = dbPath
  ? new Maxmind(await Deno.readFile(dbPath))
  : undefined;

export function lookupLocation(ip: string) {
  if (!maxmind) {
    return undefined;
  }

  try {
    const { city, country } = maxmind.lookup_city(ip);

    return [city?.names?.en, country?.names?.en].filter(Boolean).join(", ") ||
      undefined;
  } catch {
    return undefined;
  }
}
