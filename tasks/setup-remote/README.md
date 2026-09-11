# Hobproj remote setup

This directory contains the tasks that provision and configure the "hobproj"
Raspberry Pi: installing dependencies, creating the app's directory layout and
systemd units, configuring Caddy and the Cloudflare Tunnel, and managing the
handful of provider-issued secrets the app needs.

## How it works

`installer.ts` is an idempotent, root-run configuration script. Every step
checks the current state first and only changes what's missing or different;
already-correct steps are reported as skipped, never reapplied. It's compiled
to a standalone binary and installed on the Pi by `publish-installer.ts`, then
run over SSH by `setup-remote.ts`.

`setup-remote.ts` doesn't recompile the installer itself — it just checks the
compiled binary already exists remotely and errors out with instructions if
not. This keeps destructive-step confirmation prompts interactive (they need
to reach a real terminal over `ssh -t`), while still letting the installer be
rebuilt independently whenever `installer.ts` changes.

The 5 provider-issued secrets the app needs (Cloudflare tunnel token/zone
ID/API token, MaxMind GeoIP account ID/license key) are provisioned
separately from `installer.ts`/`setup-remote`, via `set-secret.ts`. See
[Managing secrets](#managing-secrets) below.

## Bootstrapping a brand-new Pi

Before running anything here, the Pi needs to already have:

- SSH key-based access for your laptop user (no password prompts).
- Passwordless `sudo` for that user (`sudo -n true` must succeed).
- The USB/external drive formatted and labeled to match
  `USB_FILESYSTEM_LABEL` in `.env.setup`.
- A Linux user account for every developer listed in `DEPLOY_STAGING_USERS` /
  `DEPLOY_PROD_USERS` (the installer only adds existing users to the deploy
  groups; it doesn't create login accounts).

None of that is scripted here since it only happens once per physical
machine. Everything else — installing Deno, mounting storage, installing
packages, creating the `hobproj` system user, directory layout, systemd
units, Caddy, sudoers, the firewall — is handled by `installer.ts`.

With that in place, run, in order:

```sh
deno task set-secret cloudflare_tunnel_token
deno task set-secret cloudflare_zone_id
deno task set-secret cloudflare_api_token
deno task set-secret geoip_account_id
deno task set-secret geoip_license_key

deno task publish-installer
deno task setup-remote
```

Then deploy the app:

```sh
deno task deploy staging
deno task deploy prod
```

Each deployment gets a `DEPLOYMENT_ID`, which is the version identity used for
health checks, asset cache-busting, and the server-cache namespace. A clean
working tree uses the short Git revision. Staging deployments may include
uncommitted source changes; those deployments receive a timestamped
`<git-revision>-dirty-<utc-timestamp>` ID so browsers and the server cache do
not reuse the previous version's assets or responses. Production deployments
require a clean working tree, keeping the deployed version directly
traceable to a committed revision.

The order of the two blocks above matters:

- The secrets must exist before `setup-remote` runs, because `installer.ts`'s
  first step (`ensureSecretsPresent`) fails fast with clear instructions if
  any are missing.
- The installer binary must be published before `setup-remote` runs, because
  `setup-remote` only checks for it — it doesn't build it.

`setup-remote` also always (re)compiles and installs both deployer binaries
(`publish-deployer staging` / `publish-deployer prod`) as its last step, so
there's no separate publish step needed for those on first setup.

## Running it again later

Day to day, `setup-remote` is idempotent and safe to re-run any time you
change `.env.setup` or `tasks/.env.tasks` (ports, allowed subnet, deploy
users, app origins, etc.):

```sh
deno task setup-remote
```

Only rebuild and republish the installer binary first if `installer.ts`
itself changed:

```sh
deno task publish-installer
deno task setup-remote
```

`set-secret` is independent of both — run it whenever a secret needs to be
set for the first time or rotated (see below). It does not require
`setup-remote` to be re-run afterwards, except that a brand-new Pi needs all
5 secrets present before `setup-remote` will get past its first step.

## Managing secrets

The 5 provider-issued secrets never live in a repository env file or in any
plaintext file on the Pi. Each is encrypted at rest with `systemd-creds`,
using a key that exists only on that specific machine (see `secrets.ts`):

```txt
/etc/hobproj/credstore.encrypted/cloudflare_tunnel_token.cred
/etc/hobproj/credstore.encrypted/cloudflare_zone_id.cred
/etc/hobproj/credstore.encrypted/cloudflare_api_token.cred
/etc/hobproj/credstore.encrypted/geoip_account_id.cred
/etc/hobproj/credstore.encrypted/geoip_license_key.cred
```

Set or rotate one with:

```sh
deno task set-secret <name>
```

for example:

```sh
deno task set-secret cloudflare_tunnel_token
```

It prompts for the value with hidden input and pipes it directly over SSH
into `systemd-creds encrypt` on the Pi — the value never touches a local
file. Rotating `cloudflare_tunnel_token` also restarts `cloudflared.service`
on the Pi to pick up the new value immediately; the other 4 secrets are read
fresh on every use (by the `geoipupdate` timer or by the deployer), so
nothing else needs restarting.

Because the encryption key lives only on the Pi, these secrets are
unrecoverable if the Pi (or its SD card) is lost. If that happens, re-issue
new values from the Cloudflare and MaxMind dashboards and run `set-secret`
again for each — this trade-off was chosen deliberately since none of these
5 values needs to survive Pi loss.

## Adding a developer

To let another developer deploy to staging and/or prod:

1. Make sure they already have a Linux user account and SSH access on the
   Pi.
2. Add their username to `DEPLOY_STAGING_USERS` and/or `DEPLOY_PROD_USERS` in
   `.env.setup`, comma-separated:

   ```env
   DEPLOY_STAGING_USERS=martin,newuser
   DEPLOY_PROD_USERS=martin,newuser
   ```

3. Run:

   ```sh
   deno task setup-remote
   ```

They don't need any of the 5 provider secrets locally — those stay on the
Pi. Their laptop only needs the usual local deploy config (`tasks/.env.tasks`,
`tasks/deploy/.env.deploy`) and SSH access to deploy.

## Permissions

There are two separate permission levels on the Pi:

### Server administrators

The user running these provisioning tasks needs SSH access and passwordless
administrator `sudo`:

```sh
sudo -n true
```

That is required for:

```sh
deno task set-secret <name>
deno task publish-installer
deno task publish-deployer staging
deno task publish-deployer prod
deno task setup-remote
```

These tasks install root-owned binaries and configuration, create systemd
units, manage packages and users, and write sudoers rules. This administrator
access is configured on the Pi outside this repository; `setup-remote` does not
grant it.

### Deploy-only developers

Users listed in `DEPLOY_STAGING_USERS` and/or `DEPLOY_PROD_USERS` do not get
general administrator access. The installer adds them to narrowly-scoped
deploy groups that can invoke only the corresponding administrator-owned
deployer binary:

```sh
deno task deploy staging
deno task deploy prod
```

Being in `DEPLOY_STAGING_USERS` permits staging deploys; being in
`DEPLOY_PROD_USERS` permits production deploys. These users cannot publish
binaries, run `setup-remote`, change server configuration, or manage the
systemd-creds secrets unless they are separately granted administrator `sudo`
access on the Pi.
