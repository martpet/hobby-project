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
  return `
    for attempt in $(seq 1 10); do
      if health=$(curl --connect-timeout 1 --max-time 2 --fail --silent --header 'X-Forwarded-Proto: https' http://127.0.0.1:${remoteAppPort}/health); then
        if [ "$health" = '{"gitSha":"${expectedGitSha}"}' ]; then
          exit 0
        fi
      fi

      echo "Waiting for ${remoteService} health check (attempt \${attempt}/10)..."
      sleep 1
    done

    echo "Health check failed: expected deployed SHA ${expectedGitSha}."
    sudo systemctl status ${remoteService} --no-pager
    exit 1
  `;
}
