# Hobproj backups

This directory contains the backup, restore, retention, and scheduled-backup
tasks.

## How it works

Backups are pulled from the laptop over SSH and written to the iCloud-synced
folder configured by `BACKUP_LOCAL_PATH` in `.env.backup`.

The database is captured with SQLite's online `.backup` command, so the app
keeps serving traffic and no maintenance window is needed. `sqlite3` is
installed on the Pi by `setup-remote`.

The database and env files are encrypted separately with AES-256 before they
reach the iCloud folder.

## Run a backup

```sh
deno task backup staging
deno task backup prod
deno task backup-config
```

`backup staging` and `backup prod` back up only the corresponding remote
database. `backup-config` backs up the laptop's local env files independently;
it does not require an environment name or contact the Pi.

The password is read from the Keychain automatically. The first read after a
reboot or lock may show a macOS prompt for the `security` command; choose
**Always Allow**.

To use a different password for one run, set it explicitly. An environment value
always wins over the Keychain:

```sh
BACKUP_ENCRYPTION_PASSWORD=... deno task backup-config
```

## Scheduled backups

A LaunchAgent runs the prod database backup and the local configuration backup
daily at 12:00:

```sh
deno task schedule-backup
deno task schedule-backup status
deno task schedule-backup uninstall
```

It reads the password without prompting because a LaunchAgent runs in the
logged-in session, where the login Keychain is already unlocked. A LaunchDaemon
runs as root and cannot read that password.

The job only runs while you are logged in. A run missed while the Mac is asleep
or off starts shortly after the next wake.

Set `BACKUP_SCHEDULE_HOUR` to use a different hour, then reinstall. Output goes
to `~/Library/Logs/hobproj-backup.log`.

## Backup layout

Each database backup writes one timestamped directory for its environment. Local
configuration snapshots are stored separately because they are not specific to
staging or prod:

```text
Hobproj Backups/
├── staging/
│   └── 2026-09-10T16-48-12.273Z/
│       ├── database.tar.gz.enc
│       └── manifest.txt
├── prod/
│   └── ...
└── config/
    └── 2026-09-10T16-48-12.273Z/
        ├── config.tar.gz.enc
        └── manifest.txt
```

Each `manifest.txt` is plaintext and holds the SHA-256 checksum that its restore
command verifies before extracting.

The environment-independent `config/config.tar.gz.enc` contains every local env
file needed to rebuild from a lost laptop:

```text
.env
tasks/.env.tasks
tasks/deploy/.env.deploy
tasks/setup-remote/.env.setup
tasks/backup/.env.backup
```

Plaintext env files are never written into the backup folder. They are staged in
a temporary directory and removed after encryption.

## Retention

After each successful backup, older database and configuration backups are
pruned independently, keeping the newest of each period: 7 daily, 4 weekly, and
6 monthly. This is about 14 backups in each tree in steady state.

A backup survives if it is the newest of its day, week, or month and that period
is still in range. Directories ending in `.tmp` are never touched.

## Restore the database

Restore reads the password the same way. It restores only to the disposable path
configured by `RESTORE_TARGET_PATH`:

```sh
deno task restore /path/to/database.tar.gz.enc
```

It verifies the checksum against the manifest, extracts the database, and runs
`PRAGMA integrity_check` on the result.

Never set `RESTORE_TARGET_PATH` to a live database directory.

## Recover the env files

The database and env files restore separately. To recover the env files from a
lost laptop, pass the configuration archive from the `config/` tree and a
directory that does not exist:

```sh
deno task restore-config \
  /path/to/config.tar.gz.enc \
  ./restored-config
```

The command refuses to run if the target directory already exists, so recovered
secrets never overwrite existing files. The files retain their repository layout
and are written with owner-only permissions.

They are plaintext secrets: move them into place, then delete the temporary
recovery directory.

The 5 provider-issued secrets (Cloudflare tunnel token/zone ID/API token,
MaxMind account ID/license key) are **not** part of this archive — they live
only on the Pi, encrypted with `systemd-creds`. See
[`tasks/setup-remote/README.md`](../setup-remote/README.md#managing-secrets)
for how to provision or rotate them with `deno task set-secret <name>`; if
the Pi itself is lost, re-issue the values from the Cloudflare/MaxMind
dashboards.

## The backup password

One strong password encrypts every archive. If it is lost, the backups cannot be
restored.

Keep the password in a password manager and in the macOS Keychain, outside the
encrypted archives. The tasks read a generic Keychain item named
`hobproj-backup`:

```sh
security add-generic-password -a "$USER" -s "hobproj-backup" -w
```

If the item already exists, replace it:

```sh
security delete-generic-password -a "$USER" -s "hobproj-backup"
security add-generic-password -a "$USER" -s "hobproj-backup" -w
```

The password must not be stored in an env file committed to the repository or
inside an encrypted archive.

## Grant Full Disk Access

The terminal needs Full Disk Access. Without it, macOS may block reading files
created by the scheduled agent, so a manual restore of a scheduled backup can
fail even though the data is intact. It can also block listing the iCloud
folder, which disables automatic pruning.

1. Open **System Settings > Privacy & Security > Full Disk Access**.
2. Press **+** and add the terminal app used for backups (Terminal, iTerm, or VS
   Code).
3. Enable its switch.
4. Quit and reopen that app; the permission applies only to newly started
   processes.

Verify it worked:

```sh
ls "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Hobproj Backups"
```

The command should list the backup folders instead of printing an error. A
successful backup then ends with a retention line rather than a
`Skipped retention` warning.
