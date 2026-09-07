export function remoteHealthCheckScript(
  remoteService: string,
  remoteAppPort: string,
  expectedGitSha: string,
) {
  if (
    !/^\d+$/.test(remoteAppPort) ||
    Number(remoteAppPort) === 0 ||
    Number(remoteAppPort) > 65535
  ) {
    throw new Error(`REMOTE_APP_PORT must be a valid port number.`);
  }

  // systemd can report the process active before Deno binds its listener.
  // The forwarded protocol bypasses the app's HTTPS redirect for loopback.
  // Ends by falling through rather than `exit 0`, so callers can keep running
  // (e.g. to clean up) after a successful check.
  return `
    health_ok=false

    for attempt in $(seq 1 10); do
      if health=$(curl --connect-timeout 1 --max-time 2 --fail --silent --header 'X-Forwarded-Proto: https' http://127.0.0.1:${remoteAppPort}/health); then
        if [ "$health" = '{"gitSha":"${expectedGitSha}"}' ]; then
          health_ok=true
          break
        fi
      fi

      echo "Waiting for ${remoteService} health check (attempt \${attempt}/10)..."
      sleep 1
    done

    if [ "$health_ok" != true ]; then
      echo "Health check failed: expected deployed SHA ${expectedGitSha}."
      sudo systemctl status ${remoteService} --no-pager || true
      false
    fi
  `;
}
