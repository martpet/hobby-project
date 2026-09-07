export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getEnv(key: string): string | undefined {
  return Deno.env.get(key);
}

export function getBooleanEnv(key: string): boolean {
  const value = Deno.env.get(key)?.trim().toLowerCase();

  return Boolean(value) && value !== "0" && value !== "false";
}

const ENV_NAMES = ["dev", "staging", "prod"] as const;

export type EnvName = (typeof ENV_NAMES)[number];

export function getEnvName(): EnvName {
  const value = getRequiredEnv("ENV_NAME");

  if (!(ENV_NAMES as readonly string[]).includes(value)) {
    throw new Error(
      `Invalid ENV_NAME '${value}'. Must be one of: ${ENV_NAMES.join(", ")}.`,
    );
  }

  return value as EnvName;
}
