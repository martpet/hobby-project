import { delay } from "@std/async/delay";

interface HealthCheckOptions {
  readonly service: string;
  readonly port: string;
  readonly expectedGitSha: string;
  readonly attempts?: number;
}

export async function checkHealth({
  service,
  port,
  expectedGitSha,
  attempts = 10,
}: HealthCheckOptions) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        headers: { "X-Forwarded-Proto": "https" },
        signal: AbortSignal.timeout(2_000),
      });
      const health = await response.text();

      if (response.ok && health === `{"gitSha":"${expectedGitSha}"}`) {
        return;
      }
    } catch {
      // systemd can report the process active before Deno binds its listener.
    }

    console.log(
      `Waiting for ${service} health check (attempt ${attempt}/${attempts})...`,
    );
    await delay(1_000);
  }

  throw new Error(
    `Health check failed: expected deployed SHA ${expectedGitSha}.`,
  );
}
