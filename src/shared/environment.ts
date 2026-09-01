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
  return Boolean(Deno.env.get(key));
}
