export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
