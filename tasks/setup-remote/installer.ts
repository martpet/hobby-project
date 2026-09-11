// Idempotent, root-run remote configuration binary for "hobproj" servers.
// Compiled and installed via `publish-installer.ts`, then run via `sudo` by
// `setup-remote.ts`. Every step checks the current state first and only changes
// something that is missing or different; already-correct steps are
// reported as skipped, never reapplied. This mirrors the architecture of
// `deployer.ts`, but for one-time/occasional server provisioning rather
// than app deploys.
import { run } from "../utils/run.ts";
import { remotePaths, STATE_ROOT } from "../utils/remote-paths.ts";
import { credentialPath, SECRETS } from "./secrets.ts";
import { parseBooleanEnvValue } from "@shared/environment.ts";

interface Config {
  readonly usbLabel: string;
  readonly usbMountPath: string;
  readonly sshAllowedSubnet: string;
  readonly deployStagingUsers: string[];
  readonly deployProdUsers: string[];
  readonly stagingAppPort: string;
  readonly prodAppPort: string;
  readonly stagingBluePort: string;
  readonly stagingGreenPort: string;
  readonly prodBluePort: string;
  readonly prodGreenPort: string;
  readonly stagingKeepIdleRunning: boolean;
  readonly prodKeepIdleRunning: boolean;
  readonly stagingAppOrigin: string;
  readonly prodAppOrigin: string;
  readonly persistentDataRoot: string;
}

interface StepResult {
  readonly label: string;
  readonly changed: boolean;
  readonly detail?: string;
}

const ENVS = ["staging", "prod"] as const;
type Env = (typeof ENVS)[number];

const COLORS = ["blue", "green"] as const;
type Color = (typeof COLORS)[number];

const ETC_ROOT = "/etc/hobproj";
const GEOIP_DIR = "/var/lib/GeoIP";
const GEOIP_DB_PATH = `${GEOIP_DIR}/GeoLite2-City.mmdb`;
const SUDOERS_PATH = "/etc/sudoers.d/hobproj-deploy";
const CLOUDFLARED_DIR = "/etc/cloudflared";
const CADDY_FILE = "/etc/caddy/Caddyfile";
const denoPath = "/usr/local/bin/deno";

let aptUpdated = false;

const results: StepResult[] = [];

try {
  const config = await loadConfig();
  await ensureSecretsPresent();

  results.push(await ensureDenoInstalled());
  results.push(await ensureStorageMounted(config));
  results.push(await ensureAptPackage("geoipupdate"));
  results.push(await ensureAptPackage("sqlite3"));
  results.push(await ensureCloudflaredRepoAndPackage());
  results.push(await ensureCaddyRepoAndPackage());
  results.push(await ensureUsersAndGroups(config));
  results.push(...await ensureDirectoryLayout(config));
  results.push(...await ensureEtcHobprojEnvFiles(config));
  results.push(...await ensureDeployerConfigFiles(config));
  results.push(...await ensureSystemdAppUnits(config));
  results.push(...await ensureLegacyUnitsRemoved());
  results.push(...await ensureCaddyConfig(config));
  results.push(await ensureSudoers());
  results.push(...await ensureGeoip());
  results.push(await ensureCloudflareTunnel());
  results.push(await ensureFirewall(config));

  printSummary(results);
} catch (error) {
  console.error("\n❌ Remote setup failed.", error);
  printSummary(results);
  Deno.exit(1);
}

// The 5 provider-issued secrets (Cloudflare, MaxMind) are provisioned
// separately with `deno task set-secret <name>`, never uploaded in this
// installer's config file. This only checks they already exist.
async function ensureSecretsPresent(): Promise<void> {
  const missing = [];
  for (const secret of SECRETS) {
    if (!await pathExists(credentialPath(secret.name))) {
      missing.push(secret);
    }
  }
  if (missing.length === 0) return;

  const lines = missing
    .map((secret) => `  deno task set-secret ${secret.name}  # ${secret.label}`)
    .join("\n");
  throw new Error(
    `Missing ${missing.length} secret(s). Run the following from the ` +
      `laptop, then re-run setup-remote:\n${lines}`,
  );
}

async function loadConfig(): Promise<Config> {
  const configPath = "./.env.setup-remote";
  const text = await Deno.readTextFile(configPath);
  const env: Record<string, string> = {};

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }

  function required(key: string): string {
    const value = env[key];
    if (!value) throw new Error(`Missing required config key: ${key}`);
    return value;
  }

  return {
    usbLabel: required("USB_FILESYSTEM_LABEL"),
    usbMountPath: required("USB_MOUNT_PATH"),
    sshAllowedSubnet: required("SSH_ALLOWED_SUBNET"),
    deployStagingUsers: splitUsers(env.DEPLOY_STAGING_USERS),
    deployProdUsers: splitUsers(env.DEPLOY_PROD_USERS),
    stagingAppPort: required("STAGING_APP_PORT"),
    prodAppPort: required("PROD_APP_PORT"),
    stagingBluePort: required("STAGING_BLUE_PORT"),
    stagingGreenPort: required("STAGING_GREEN_PORT"),
    prodBluePort: required("PROD_BLUE_PORT"),
    prodGreenPort: required("PROD_GREEN_PORT"),
    stagingKeepIdleRunning: parseBooleanEnvValue(
      env.STAGING_KEEP_IDLE_RUNNING,
    ),
    prodKeepIdleRunning: parseBooleanEnvValue(env.PROD_KEEP_IDLE_RUNNING),
    stagingAppOrigin: required("STAGING_APP_ORIGIN"),
    prodAppOrigin: required("PROD_APP_ORIGIN"),
    persistentDataRoot: required("USB_MOUNT_PATH"),
  };
}

function splitUsers(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u !== "");
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfExists(path: string): Promise<string | undefined> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return undefined;
  }
}

async function statOwnerGroupMode(path: string): Promise<string | undefined> {
  const { code, stdout } = await run("stat", ["-c", "%U:%G:%a", path], {
    stdout: "piped",
    check: false,
  });
  return code === 0 ? stdout : undefined;
}

// Writes `content` to `path` with the given owner/group/mode, but only if
// the content or metadata actually differ from what's already there.
async function ensureFile(
  path: string,
  content: string,
  owner: string,
  group: string,
  mode: string,
): Promise<StepResult> {
  const currentContent = await readTextIfExists(path);
  const currentMeta = await statOwnerGroupMode(path);
  const desiredMeta = `${owner}:${group}:${mode}`;

  if (currentContent === content && currentMeta === desiredMeta) {
    return { label: path, changed: false };
  }

  const tmpPath = `${path}.setup-tmp`;
  await Deno.writeTextFile(tmpPath, content);
  await run("install", ["-o", owner, "-g", group, "-m", mode, tmpPath, path]);
  return { label: path, changed: true };
}

async function ensureDirectory(
  path: string,
  owner: string,
  group: string,
  mode: string,
): Promise<StepResult> {
  const exists = await pathExists(path);
  const currentMeta = exists ? await statOwnerGroupMode(path) : undefined;
  const desiredMeta = `${owner}:${group}:${mode}`;

  if (exists && currentMeta === desiredMeta) {
    return { label: path, changed: false };
  }

  await run("install", ["-d", "-o", owner, "-g", group, "-m", mode, path]);
  return { label: path, changed: true };
}

async function confirm(message: string): Promise<boolean> {
  console.log(`\n⚠️  ${message}`);
  await Deno.stdout.write(new TextEncoder().encode("Type 'yes' to continue: "));
  const buffer = new Uint8Array(1024);
  const n = await Deno.stdin.read(buffer);
  const answer = n
    ? new TextDecoder().decode(buffer.subarray(0, n)).trim()
    : "";
  return answer.toLowerCase() === "yes";
}

function printSummary(steps: StepResult[]) {
  console.log("\n📋 Setup summary:");
  for (const step of steps) {
    const icon = step.changed ? "✏️ " : "✓ ";
    const suffix = step.detail ? ` (${step.detail})` : "";
    console.log(`  ${icon}${step.label}${suffix}`);
  }
  const changedCount = steps.filter((s) => s.changed).length;
  const summary = changedCount === 0
    ? `All ${steps.length} steps were already correct.`
    : changedCount === steps.length
    ? `All ${steps.length} steps made changes.`
    : `${changedCount} of ${steps.length} steps made changes; the rest were already correct.`;
  console.log(`\n${summary}`);
}

// ---------------------------------------------------------------------------
// Deno install
// ---------------------------------------------------------------------------

async function ensureDenoInstalled(): Promise<StepResult> {
  if (await pathExists(denoPath)) {
    return { label: "Deno runtime", changed: false };
  }

  const arch = (await run("uname", ["-m"], { stdout: "piped" })).stdout.trim();
  const target = arch === "aarch64"
    ? "aarch64-unknown-linux-gnu"
    : "x86_64-unknown-linux-gnu";
  const zipUrl =
    `https://github.com/denoland/deno/releases/latest/download/deno-${target}.zip`;
  const tmpDir = await Deno.makeTempDir();

  await run("curl", ["-fsSL", "-o", `${tmpDir}/deno.zip`, zipUrl]);
  await run("unzip", ["-o", `${tmpDir}/deno.zip`, "-d", tmpDir]);
  await run("install", [
    "-o",
    "root",
    "-g",
    "root",
    "-m",
    "0755",
    `${tmpDir}/deno`,
    denoPath,
  ]);
  await Deno.remove(tmpDir, { recursive: true });

  return { label: "Deno runtime", changed: true, detail: "installed" };
}

// ---------------------------------------------------------------------------
// Persistent storage
// ---------------------------------------------------------------------------

async function ensureStorageMounted(config: Config): Promise<StepResult> {
  const { code: mountCode } = await run(
    "findmnt",
    ["--noheadings", "--output", "TARGET", config.usbMountPath],
    { stdout: "piped", check: false },
  );

  if (mountCode === 0) {
    return {
      label: `Storage mounted at ${config.usbMountPath}`,
      changed: false,
    };
  }

  const { stdout: blkidOut } = await run(
    "bash",
    ["-c", `blkid -o export | grep -B4 'LABEL=${config.usbLabel}' || true`],
    { stdout: "piped", check: false },
  );

  if (!blkidOut.includes(`LABEL=${config.usbLabel}`)) {
    console.log(
      `\nNo disk labeled '${config.usbLabel}' was found. Listing candidate disks:`,
    );
    await run("lsblk", ["-o", "NAME,SIZE,TYPE,FSTYPE,LABEL,MOUNTPOINT"]);

    const disk = prompt(
      "\nEnter the device to format and use for persistent storage (e.g. /dev/sda1), or leave blank to skip:",
    );

    if (!disk) {
      throw new Error(
        "Persistent storage is not mounted and no device was provided.",
      );
    }

    const confirmed = await confirm(
      `This will ERASE ALL DATA on '${disk}' and format it as ext4 labeled '${config.usbLabel}'.`,
    );

    if (!confirmed) {
      throw new Error("USB formatting was not confirmed. Aborting.");
    }

    await run("mkfs.ext4", ["-F", "-L", config.usbLabel, disk]);

    const uuid = (await run("bash", [
      "-c",
      `blkid -s UUID -o value ${disk}`,
    ], { stdout: "piped" })).stdout.trim();

    await run("install", [
      "-d",
      "-o",
      "root",
      "-g",
      "root",
      "-m",
      "0755",
      config.usbMountPath,
    ]);

    const fstabLine =
      `UUID=${uuid} ${config.usbMountPath} ext4 defaults,noatime,nofail 0 2\n`;
    const fstab = await Deno.readTextFile("/etc/fstab");
    if (!fstab.includes(uuid)) {
      await Deno.writeTextFile("/etc/fstab", fstab + fstabLine);
    }

    await run("mount", [config.usbMountPath]);

    return {
      label: `Storage mounted at ${config.usbMountPath}`,
      changed: true,
      detail: "formatted",
    };
  }

  // Labeled filesystem exists but isn't mounted yet (e.g. after fresh fstab
  // entry or reboot without automount) — just mount it.
  await run("install", [
    "-d",
    "-o",
    "root",
    "-g",
    "root",
    "-m",
    "0755",
    config.usbMountPath,
  ]);
  await run("mount", [config.usbMountPath]);
  return {
    label: `Storage mounted at ${config.usbMountPath}`,
    changed: true,
    detail: "mounted",
  };
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

async function ensureAptUpdated(): Promise<void> {
  if (aptUpdated) return;
  await run("apt-get", ["update"]);
  aptUpdated = true;
}

async function ensureAptPackage(name: string): Promise<StepResult> {
  const { code } = await run("dpkg", ["-s", name], {
    stdout: "piped",
    check: false,
  });
  if (code === 0) {
    return { label: `Package "${name}"`, changed: false };
  }

  await ensureAptUpdated();
  await run("apt-get", ["install", "-y", name]);
  return { label: `Package "${name}"`, changed: true, detail: "installed" };
}

async function ensureCloudflaredRepoAndPackage(): Promise<StepResult> {
  const { code } = await run("dpkg", ["-s", "cloudflared"], {
    stdout: "piped",
    check: false,
  });
  if (code === 0) {
    return { label: 'Package "cloudflared"', changed: false };
  }

  const keyringPath = "/usr/share/keyrings/cloudflare-main.gpg";
  const listPath = "/etc/apt/sources.list.d/cloudflared.list";

  if (!await pathExists(keyringPath)) {
    await run(
      "bash",
      [
        "-c",
        `mkdir -p --mode=0755 /usr/share/keyrings && ` +
        `curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o ${keyringPath}`,
      ],
    );
  }

  if (!await pathExists(listPath)) {
    const codename = (await run(
      "bash",
      ["-c", ". /etc/os-release && echo $VERSION_CODENAME"],
      {
        stdout: "piped",
      },
    )).stdout.trim();
    const line =
      `deb [signed-by=${keyringPath}] https://pkg.cloudflare.com/cloudflared ${codename} main\n`;
    await Deno.writeTextFile(listPath, line);
  }

  await run("apt-get", ["update"]);
  aptUpdated = true;
  await run("apt-get", ["install", "-y", "cloudflared"]);

  return { label: 'Package "cloudflared"', changed: true, detail: "installed" };
}

async function ensureCaddyRepoAndPackage(): Promise<StepResult> {
  const { code } = await run("dpkg", ["-s", "caddy"], {
    stdout: "piped",
    check: false,
  });
  if (code === 0) {
    return { label: 'Package "caddy"', changed: false };
  }

  const keyringPath = "/usr/share/keyrings/caddy-stable-archive-keyring.gpg";
  const listPath = "/etc/apt/sources.list.d/caddy-stable.list";

  if (!await pathExists(keyringPath)) {
    await run(
      "bash",
      [
        "-c",
        `curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | ` +
        `gpg --dearmor -o ${keyringPath}`,
      ],
    );
  }

  if (!await pathExists(listPath)) {
    await run(
      "bash",
      [
        "-c",
        `curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' ` +
        `-o ${listPath}`,
      ],
    );
  }

  await run("apt-get", ["update"]);
  aptUpdated = true;
  await run("apt-get", ["install", "-y", "caddy"]);

  return { label: 'Package "caddy"', changed: true, detail: "installed" };
}

// ---------------------------------------------------------------------------
// Users & groups
// ---------------------------------------------------------------------------

async function groupExists(name: string): Promise<boolean> {
  const { code } = await run("getent", ["group", name], {
    stdout: "piped",
    check: false,
  });
  return code === 0;
}

async function userExists(name: string): Promise<boolean> {
  const { code } = await run("id", ["-u", name], {
    stdout: "piped",
    check: false,
  });
  return code === 0;
}

async function userGroups(name: string): Promise<string[]> {
  const { stdout } = await run("id", ["-nG", name], { stdout: "piped" });
  return stdout.split(/\s+/).filter(Boolean);
}

async function ensureUsersAndGroups(config: Config): Promise<StepResult> {
  let changed = false;

  for (
    const group of ["hobproj", "hobproj-deploy-staging", "hobproj-deploy-prod"]
  ) {
    if (!await groupExists(group)) {
      await run("groupadd", ["--system", group]);
      changed = true;
    }
  }

  if (!await userExists("hobproj")) {
    await run("useradd", [
      "--system",
      "--no-create-home",
      "--shell",
      "/usr/sbin/nologin",
      "--gid",
      "hobproj",
      "hobproj",
    ]);
    changed = true;
  }

  const memberships: [string, string][] = [
    ...config.deployStagingUsers.map((
      u,
    ): [string, string] => [u, "hobproj-deploy-staging"]),
    ...config.deployProdUsers.map((
      u,
    ): [string, string] => [u, "hobproj-deploy-prod"]),
    // Caddy reads the active-color-upstream snippets under `/etc/hobproj`,
    // which are root/hobproj-owned and not world-readable.
    ["caddy", "hobproj"],
  ];

  for (const [user, group] of memberships) {
    if (!await userExists(user)) {
      console.warn(
        `⚠️  Skipping group membership: user "${user}" does not exist.`,
      );
      continue;
    }
    const groups = await userGroups(user);
    if (!groups.includes(group)) {
      await run("usermod", ["-aG", group, user]);
      changed = true;
    }
  }

  return { label: "Users & groups", changed };
}

// ---------------------------------------------------------------------------
// Directory layout
// ---------------------------------------------------------------------------

async function ensureDirectoryLayout(config: Config): Promise<StepResult[]> {
  const results: StepResult[] = [];

  results.push(
    await ensureDirectory(remotePaths.app, "root", "hobproj", "710"),
  );
  results.push(
    await ensureDirectory(remotePaths.upload, "root", "root", "711"),
  );
  results.push(
    await ensureDirectory(STATE_ROOT, "root", "root", "711"),
  );
  results.push(
    await ensureDirectory(remotePaths.cache, "root", "hobproj", "710"),
  );
  results.push(
    await ensureDirectory(remotePaths.deployer, "root", "hobproj", "750"),
  );
  results.push(await ensureDirectory(ETC_ROOT, "root", "hobproj", "750"));
  results.push(await ensureDirectory(GEOIP_DIR, "root", "root", "755"));
  results.push(await ensureDirectory(CLOUDFLARED_DIR, "root", "root", "755"));

  for (const env of ENVS) {
    results.push(
      await ensureDirectory(
        `${remotePaths.app}/${env}`,
        "hobproj",
        "hobproj",
        "700",
      ),
    );
    results.push(
      await ensureDirectory(
        `${config.persistentDataRoot}/${env}`,
        "hobproj",
        "hobproj",
        "700",
      ),
    );
    results.push(
      await ensureDirectory(
        `${config.persistentDataRoot}/${env}/db`,
        "hobproj",
        "hobproj",
        "700",
      ),
    );
    for (const color of COLORS) {
      results.push(
        await ensureDirectory(
          `${remotePaths.app}/${env}/${color}`,
          "hobproj",
          "hobproj",
          "700",
        ),
      );
      results.push(
        await ensureDirectory(
          `${remotePaths.cache}/${env}/${color}`,
          "hobproj",
          "hobproj",
          "700",
        ),
      );
    }
    results.push(
      await ensureDirectory(
        `${ETC_ROOT}/${env}`,
        "hobproj",
        "hobproj",
        "750",
      ),
    );
    results.push(
      await ensureDirectory(
        `${remotePaths.upload}/${env}`,
        "hobproj",
        `hobproj-deploy-${env}`,
        "2730",
      ),
    );
    results.push(
      await ensureDirectory(
        `${remotePaths.cache}/${env}`,
        "hobproj",
        "hobproj",
        "700",
      ),
    );
    results.push(
      await ensureDirectory(
        `${remotePaths.deployer}/${env}`,
        "root",
        "hobproj",
        "750",
      ),
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// /etc/hobproj/*.env
// ---------------------------------------------------------------------------

async function ensureEtcHobprojEnvFiles(config: Config): Promise<StepResult[]> {
  const commonEnv = [
    "SERVER_CACHE_ENABLED=true",
    `MAXMIND_DB_PATH=${GEOIP_DB_PATH}`,
    "",
  ].join("\n");

  const results = [
    await ensureFile(
      `${ETC_ROOT}/common.env`,
      commonEnv,
      "root",
      "hobproj",
      "640",
    ),
  ];

  const origins: Record<Env, string> = {
    staging: config.stagingAppOrigin,
    prod: config.prodAppOrigin,
  };

  for (const env of ENVS) {
    const appPath = `${config.persistentDataRoot}/${env}`;
    // `KV_PATH` is absolute (rather than the previous `./db/kv.sqlite`)
    // because each color now has its own `WorkingDirectory`
    // (`${appPath}/<color>`), while the KV store itself stays shared at
    // `${appPath}/db` across both colors.
    const envContent = [
      `ENV_NAME=${env}`,
      `KV_PATH=${appPath}/db/kv.sqlite`,
      `APP_ORIGIN=${origins[env]}`,
      "",
    ].join("\n");

    results.push(
      await ensureFile(
        `${ETC_ROOT}/${env}.env`,
        envContent,
        "root",
        "hobproj",
        "640",
      ),
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// /opt/hobproj-deployer/**/.env.deployer
// ---------------------------------------------------------------------------

async function ensureDeployerConfigFiles(
  config: Config,
): Promise<StepResult[]> {
  // Cloudflare zone/token are no longer written here; the deployer reads
  // them itself via `systemd-creds decrypt` at deploy time.
  const commonDeployerEnv = [
    "BINARY=./bin",
    "",
  ].join("\n");

  const results = [
    await ensureFile(
      `${remotePaths.deployer}/.env.deployer`,
      commonDeployerEnv,
      "root",
      "hobproj",
      "640",
    ),
  ];

  const ports: Record<Env, Record<Color, string>> = {
    staging: { blue: config.stagingBluePort, green: config.stagingGreenPort },
    prod: { blue: config.prodBluePort, green: config.prodGreenPort },
  };
  const keepIdleRunning: Record<Env, boolean> = {
    staging: config.stagingKeepIdleRunning,
    prod: config.prodKeepIdleRunning,
  };

  for (const env of ENVS) {
    const appPath = `${remotePaths.app}/${env}`;
    const etcEnvRoot = `${ETC_ROOT}/${env}`;
    // Absolute (rather than the previous relative `./db`) since each
    // color's `WorkingDirectory` is now its own subdirectory, while the KV
    // store stays shared at `${appPath}/db` across both colors.
    const envDeployerEnv = [
      `ENV_NAME=${env}`,
      `APP_PATH=${appPath}`,
      `UPLOAD_PATH=${remotePaths.upload}/${env}`,
      `ALLOW_READ=${config.persistentDataRoot}/${env}/db,${GEOIP_DIR}`,
      `ALLOW_WRITE=${config.persistentDataRoot}/${env}/db`,
      `BLUE_PORT=${ports[env].blue}`,
      `GREEN_PORT=${ports[env].green}`,
      `SERVICE_BLUE=hobproj.${env}-blue`,
      `SERVICE_GREEN=hobproj.${env}-green`,
      `SERVER_CACHE_PATH_BLUE=${remotePaths.cache}/${env}/blue/.local/share/bin.tmp/web_cache`,
      `SERVER_CACHE_PATH_GREEN=${remotePaths.cache}/${env}/green/.local/share/bin.tmp/web_cache`,
      `DENO_DIR=${remotePaths.cache}/${env}/deno`,
      `ACTIVE_COLOR_FILE=${etcEnvRoot}/active-color`,
      `CADDY_SNIPPET_FILE=${etcEnvRoot}/active-upstream.caddy`,
      `KEEP_IDLE_RUNNING=${keepIdleRunning[env]}`,
      "",
    ].join("\n");

    results.push(
      await ensureFile(
        `${remotePaths.deployer}/${env}/.env.deployer`,
        envDeployerEnv,
        "root",
        "hobproj",
        "640",
      ),
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// systemd app units (written + enabled, never started here)
// ---------------------------------------------------------------------------

async function ensureSystemdAppUnits(config: Config): Promise<StepResult[]> {
  const results: StepResult[] = [];
  let anyChanged = false;

  const ports: Record<Env, Record<Color, string>> = {
    staging: { blue: config.stagingBluePort, green: config.stagingGreenPort },
    prod: { blue: config.prodBluePort, green: config.prodGreenPort },
  };

  for (const env of ENVS) {
    const appPath = `${remotePaths.app}/${env}`;

    for (const color of COLORS) {
      const colorPath = `${appPath}/${color}`;
      const colorHome = `${remotePaths.cache}/${env}/${color}`;
      const unit = [
        "[Unit]",
        `Description=Hobproj ${
          env === "prod" ? "production" : env
        } web application (${color})`,
        "After=network-online.target",
        "Wants=network-online.target",
        `ConditionPathIsMountPoint=${config.persistentDataRoot}`,
        `RequiresMountsFor=${config.persistentDataRoot}`,
        "",
        "[Service]",
        "Type=simple",
        "User=hobproj",
        "Group=hobproj",
        `WorkingDirectory=${colorPath}`,
        `ExecStart=${colorPath}/bin`,
        `EnvironmentFile=${ETC_ROOT}/common.env`,
        `EnvironmentFile=${ETC_ROOT}/${env}.env`,
        // Override the shared env file's values with this color's own port
        // and HOME. HOME is per-color (not per-env) because Deno's Cache
        // API storage is derived from it, and the two colors must never
        // share that on-disk cache — otherwise wiping one color's cache
        // before a build would also wipe the other, currently-live color's
        // cache.
        `Environment=APP_PORT=${ports[env][color]}`,
        `Environment=HOME=${colorHome}`,
        `EnvironmentFile=${colorPath}/.git-sha`,
        "Restart=always",
        "RestartSec=5s",
        // Give the graceful-shutdown SIGTERM handler in main.ts real time
        // to drain in-flight requests before systemd escalates to SIGKILL.
        "TimeoutStopSec=30s",
        "StandardOutput=journal",
        "StandardError=journal",
        `SyslogIdentifier=hobproj-${env}-${color}`,
        "NoNewPrivileges=true",
        "PrivateTmp=true",
        "ProtectHome=true",
        "ProtectSystem=strict",
        `ReadWritePaths=${config.persistentDataRoot}/${env}/db ${colorHome}`,
        "",
        "[Install]",
        "WantedBy=multi-user.target",
        "",
      ].join("\n");

      const unitPath = `/etc/systemd/system/hobproj.${env}-${color}.service`;
      const result = await ensureFile(unitPath, unit, "root", "root", "644");
      results.push({
        label: `systemd unit hobproj.${env}-${color}`,
        changed: result.changed,
      });
      if (result.changed) anyChanged = true;

      const { code: enabledCode } = await run(
        "systemctl",
        ["is-enabled", `hobproj.${env}-${color}`],
        { stdout: "piped", check: false },
      );
      if (enabledCode !== 0) {
        await run("systemctl", ["enable", `hobproj.${env}-${color}`]);
        anyChanged = true;
      }
    }
  }

  if (anyChanged) {
    await run("systemctl", ["daemon-reload"]);
  }

  return results;
}

// Removes the old pre-blue/green `hobproj.<env>.service` units (bound
// directly to the public port), which would otherwise keep running and
// hold that port, conflicting with Caddy now owning it.
async function ensureLegacyUnitsRemoved(): Promise<StepResult[]> {
  const results: StepResult[] = [];

  for (const env of ENVS) {
    const legacyUnit = `hobproj.${env}.service`;
    const legacyUnitPath = `/etc/systemd/system/${legacyUnit}`;

    if (!await pathExists(legacyUnitPath)) {
      results.push({ label: `legacy unit ${legacyUnit}`, changed: false });
      continue;
    }

    await run("systemctl", ["stop", legacyUnit], { check: false });
    await run("systemctl", ["disable", legacyUnit], { check: false });
    await Deno.remove(legacyUnitPath);
    await run("systemctl", ["daemon-reload"]);
    results.push({
      label: `legacy unit ${legacyUnit}`,
      changed: true,
      detail: "removed",
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Caddy (reverse proxy in front of the blue/green app instances)
// ---------------------------------------------------------------------------

// Generates the small per-env snippet Caddy `import`s, pointing at whichever
// color's port is currently active. Regenerated by the deployer on every
// cutover; only created here (if missing) so a fresh install has something
// valid to boot with.
function activeUpstreamSnippet(port: string): string {
  return [
    `reverse_proxy 127.0.0.1:${port} {`,
    // cloudflared already sets X-Forwarded-Proto based on the original
    // (HTTPS) request at Cloudflare's edge; Caddy's reverse_proxy would
    // otherwise overwrite it using the local (plain HTTP) connection it
    // received it over, breaking `httpsMid`'s redirect logic.
    "\theader_up X-Forwarded-Proto {http.request.header.X-Forwarded-Proto}",
    "}",
    "",
  ].join("\n");
}

async function ensureCaddyConfig(config: Config): Promise<StepResult[]> {
  const results: StepResult[] = [];

  const publicPorts: Record<Env, string> = {
    staging: config.stagingAppPort,
    prod: config.prodAppPort,
  };
  const ports: Record<Env, Record<Color, string>> = {
    staging: { blue: config.stagingBluePort, green: config.stagingGreenPort },
    prod: { blue: config.prodBluePort, green: config.prodGreenPort },
  };

  for (const env of ENVS) {
    const activeColorPath = `${ETC_ROOT}/${env}/active-color`;
    if (!await pathExists(activeColorPath)) {
      await ensureFile(activeColorPath, "blue\n", "hobproj", "hobproj", "644");
      results.push({
        label: `active color (${env})`,
        changed: true,
        detail: "defaulted to blue",
      });
    } else {
      results.push({ label: `active color (${env})`, changed: false });
    }

    const activeColor = (await Deno.readTextFile(activeColorPath))
      .trim() as Color;
    const snippetPath = `${ETC_ROOT}/${env}/active-upstream.caddy`;
    const snippetResult = await ensureFile(
      snippetPath,
      activeUpstreamSnippet(ports[env][activeColor]),
      "hobproj",
      "hobproj",
      "644",
    );
    results.push({
      label: `Caddy upstream snippet (${env})`,
      changed: snippetResult.changed,
    });
  }

  const caddyfile = ENVS.map((env) =>
    [
      `:${publicPorts[env]} {`,
      `\timport ${ETC_ROOT}/${env}/active-upstream.caddy`,
      "}",
      "",
    ].join("\n")
  ).join("\n");

  const caddyfileResult = await ensureFile(
    CADDY_FILE,
    caddyfile,
    "root",
    "root",
    "644",
  );
  results.push({ label: "Caddyfile", changed: caddyfileResult.changed });

  const { code: enabledCode } = await run(
    "systemctl",
    ["is-enabled", "caddy"],
    { stdout: "piped", check: false },
  );
  const { code: activeCode } = await run(
    "systemctl",
    ["is-active", "caddy"],
    { stdout: "piped", check: false },
  );

  if (enabledCode !== 0 || activeCode !== 0) {
    await run("systemctl", ["enable", "--now", "caddy"]);
  } else {
    // Always reload (not just when a file changed): reloading with
    // unchanged, already-valid config is a cheap no-op, and this keeps the
    // running Caddy config in sync even after a prior run left it stale
    // (e.g. a mid-provisioning failure applied the files but not the
    // reload).
    await run("caddy", ["validate", "--config", CADDY_FILE], {
      check: false,
    });
    await run("systemctl", ["reload", "caddy"]);
  }

  return results;
}

// ---------------------------------------------------------------------------
// sudoers
// ---------------------------------------------------------------------------

async function ensureSudoers(): Promise<StepResult> {
  const lines = [
    "%hobproj-deploy-staging ALL=(hobproj) NOPASSWD: /opt/hobproj-deployer/staging/deployer *",
    "%hobproj-deploy-prod ALL=(hobproj) NOPASSWD: /opt/hobproj-deployer/prod/deployer *",
  ];

  for (const env of ENVS) {
    for (const color of COLORS) {
      for (const action of ["start", "stop", "restart"]) {
        lines.push(
          `hobproj ALL=(root) NOPASSWD: /usr/bin/systemctl ${action} hobproj.${env}-${color}`,
        );
      }
    }
  }
  lines.push("hobproj ALL=(root) NOPASSWD: /usr/bin/systemctl reload caddy");
  // The deployer (running as `hobproj`) decrypts these 2 secrets itself at
  // deploy time for the Cloudflare cache purge; narrow, per-credential
  // rules rather than a wildcard.
  lines.push(
    `hobproj ALL=(root) NOPASSWD: /usr/bin/systemd-creds decrypt --name=cloudflare_zone_id ${
      credentialPath("cloudflare_zone_id")
    }`,
  );
  lines.push(
    `hobproj ALL=(root) NOPASSWD: /usr/bin/systemd-creds decrypt --name=cloudflare_api_token ${
      credentialPath("cloudflare_api_token")
    }`,
  );
  lines.push("");

  const content = lines.join("\n");

  const current = await readTextIfExists(SUDOERS_PATH);
  const currentMeta = await statOwnerGroupMode(SUDOERS_PATH);

  if (current === content && currentMeta === "root:root:440") {
    return { label: "sudoers drop-in", changed: false };
  }

  const tmpPath = "/etc/sudoers.d/.hobproj-deploy.setup-tmp";
  await Deno.writeTextFile(tmpPath, content);
  await run("chmod", ["440", tmpPath]);

  const { code } = await run("visudo", ["-c", "-f", tmpPath], {
    stdout: "piped",
    check: false,
  });
  if (code !== 0) {
    await Deno.remove(tmpPath);
    throw new Error("Generated sudoers file failed validation (visudo -c).");
  }

  await run("install", [
    "-o",
    "root",
    "-g",
    "root",
    "-m",
    "0440",
    tmpPath,
    SUDOERS_PATH,
  ]);
  return { label: "sudoers drop-in", changed: true };
}

// ---------------------------------------------------------------------------
// GeoIP
// ---------------------------------------------------------------------------

async function ensureGeoip(): Promise<StepResult[]> {
  const results: StepResult[] = [];

  // No AccountID/LicenseKey here: geoipupdate reads them from the
  // credentials directory at runtime instead (see the unit's ExecStart).
  const confContent = [
    "EditionIDs GeoLite2-City",
    "",
  ].join("\n");
  results.push(
    await ensureFile("/etc/GeoIP.conf", confContent, "root", "root", "644"),
  );

  const accountIdCred = credentialPath("geoip_account_id");
  const licenseKeyCred = credentialPath("geoip_license_key");
  const serviceUnit = [
    "[Unit]",
    "Description=Update MaxMind GeoIP databases",
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    "Type=oneshot",
    // The ID before ":" must match the name `set-secret` encrypted the
    // file with (`systemd-creds encrypt --name=...`); systemd validates
    // the two against each other on load.
    `LoadCredentialEncrypted=geoip_account_id:${accountIdCred}`,
    `LoadCredentialEncrypted=geoip_license_key:${licenseKeyCred}`,
    'ExecStart=/bin/sh -c "GEOIPUPDATE_ACCOUNT_ID_FILE=${CREDENTIALS_DIRECTORY}/geoip_account_id ' +
    'GEOIPUPDATE_LICENSE_KEY_FILE=${CREDENTIALS_DIRECTORY}/geoip_license_key exec /usr/bin/geoipupdate"',
    `ExecStartPost=/usr/bin/chmod 0644 ${GEOIP_DB_PATH}`,
    "User=root",
    "Group=root",
    "PrivateTmp=true",
    "ProtectHome=true",
    "ProtectSystem=strict",
    `ReadWritePaths=${GEOIP_DIR}`,
    "",
  ].join("\n");
  const serviceResult = await ensureFile(
    "/etc/systemd/system/geoipupdate.service",
    serviceUnit,
    "root",
    "root",
    "644",
  );
  results.push({
    label: "systemd unit geoipupdate.service",
    changed: serviceResult.changed,
  });

  const timerUnit = [
    "[Unit]",
    "Description=Update MaxMind GeoIP databases weekly",
    "",
    "[Timer]",
    "OnCalendar=weekly",
    "RandomizedDelaySec=6h",
    "Persistent=true",
    "Unit=geoipupdate.service",
    "",
    "[Install]",
    "WantedBy=timers.target",
    "",
  ].join("\n");
  const timerResult = await ensureFile(
    "/etc/systemd/system/geoipupdate.timer",
    timerUnit,
    "root",
    "root",
    "644",
  );
  results.push({
    label: "systemd unit geoipupdate.timer",
    changed: timerResult.changed,
  });

  let anyUnitChanged = serviceResult.changed || timerResult.changed;

  const { code: enabledCode } = await run(
    "systemctl",
    ["is-enabled", "geoipupdate.timer"],
    { stdout: "piped", check: false },
  );
  if (enabledCode !== 0) {
    anyUnitChanged = true;
  }

  if (anyUnitChanged) {
    await run("systemctl", ["daemon-reload"]);
    await run("systemctl", ["enable", "--now", "geoipupdate.timer"]);
  }

  if (!await pathExists(GEOIP_DB_PATH)) {
    // One-off bootstrap download outside the unit's LoadCredentialEncrypted=
    // sandbox: decrypt both secrets directly (installer already runs as
    // root) and pass them as env vars for this single invocation only.
    const accountId = await decryptCredential("geoip_account_id");
    const licenseKey = await decryptCredential("geoip_license_key");
    await run("geoipupdate", [], {
      env: {
        GEOIPUPDATE_ACCOUNT_ID: accountId,
        GEOIPUPDATE_LICENSE_KEY: licenseKey,
      },
    });
    await run("chmod", ["0644", GEOIP_DB_PATH]);
    results.push({
      label: "GeoLite2-City.mmdb",
      changed: true,
      detail: "downloaded",
    });
  } else {
    results.push({ label: "GeoLite2-City.mmdb", changed: false });
  }

  return results;
}

// Decrypts a credential file synchronously for local (root-only) one-off
// use, e.g. the geoipupdate bootstrap download that runs outside of any
// systemd unit's LoadCredentialEncrypted= sandbox.
async function decryptCredential(name: string): Promise<string> {
  const { stdout } = await run(
    "systemd-creds",
    ["decrypt", `--name=${name}`, credentialPath(name), "-"],
    { stdout: "piped" },
  );
  return stdout.trim();
}

// ---------------------------------------------------------------------------
// Cloudflare Tunnel
// ---------------------------------------------------------------------------

// Token rotation/restart is handled by `set-secret cloudflare_tunnel_token`
// (it restarts the service itself when the value changes); this only
// ensures the unit definition is in place and running.
async function ensureCloudflareTunnel(): Promise<StepResult> {
  const tokenCred = credentialPath("cloudflare_tunnel_token");

  // Leftover from before the switch to LoadCredentialEncrypted=; remove it
  // so the plaintext token doesn't linger on disk.
  await run("rm", ["-f", "/etc/cloudflared/token"], { check: false });

  const unit = [
    "[Unit]",
    "Description=Cloudflare Tunnel client",
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    "TimeoutStartSec=15",
    "Type=notify",
    `LoadCredentialEncrypted=cloudflare_tunnel_token:${tokenCred}`,
    "ExecStart=/usr/bin/cloudflared --no-autoupdate tunnel run --token-file " +
    "${CREDENTIALS_DIRECTORY}/cloudflare_tunnel_token",
    "Restart=on-failure",
    "RestartSec=5s",
    "",
    "[Install]",
    "WantedBy=multi-user.target",
    "",
  ].join("\n");

  const unitResult = await ensureFile(
    "/etc/systemd/system/cloudflared.service",
    unit,
    "root",
    "root",
    "644",
  );

  const { code: enabledCode } = await run("systemctl", [
    "is-enabled",
    "cloudflared",
  ], {
    stdout: "piped",
    check: false,
  });
  const { code: activeCode } = await run("systemctl", [
    "is-active",
    "cloudflared",
  ], {
    stdout: "piped",
    check: false,
  });

  const changed = unitResult.changed || enabledCode !== 0 ||
    activeCode !== 0;

  if (changed) {
    await run("systemctl", ["daemon-reload"]);
    await run("systemctl", ["enable", "--now", "cloudflared"]);
  }

  return { label: "Cloudflare Tunnel (cloudflared)", changed };
}

// ---------------------------------------------------------------------------
// Firewall (UFW)
// ---------------------------------------------------------------------------

async function ensureFirewall(config: Config): Promise<StepResult> {
  const { stdout: statusOut } = await run(
    "bash",
    ["-c", "ufw status verbose"],
    {
      stdout: "piped",
    },
  );

  const isActive = statusOut.includes("Status: active");
  const hasDefaults = statusOut.includes(
    "Default: deny (incoming), allow (outgoing)",
  );
  const hasSshRule = statusOut.includes(
    `22/tcp                     ALLOW IN    ${config.sshAllowedSubnet}`,
  );

  if (isActive && hasDefaults && hasSshRule) {
    return { label: "UFW firewall", changed: false };
  }

  const { stdout: sshClientEnv } = await run("bash", [
    "-c",
    'echo -n "${SSH_CLIENT:-}"',
  ], {
    stdout: "piped",
    check: false,
  });
  const clientIp = sshClientEnv.split(" ")[0];

  if (clientIp) {
    const { code } = await run(
      "bash",
      [
        "-c",
        `python3 -c "import ipaddress,sys; sys.exit(0 if ipaddress.ip_address('${clientIp}') in ipaddress.ip_network('${config.sshAllowedSubnet}') else 1)"`,
      ],
      { check: false, stdout: "piped" },
    );
    if (code !== 0) {
      console.warn(
        `⚠️  Current SSH client IP (${clientIp}) is not inside the configured subnet ` +
          `${config.sshAllowedSubnet}. Enabling UFW now could lock you out.`,
      );
      const proceed = await confirm(
        "Enable UFW anyway? Make sure you have console/out-of-band access before continuing.",
      );
      if (!proceed) {
        throw new Error("UFW setup was not confirmed.");
      }
    }
  }

  const proceed = clientIp ? true : await confirm(
    `About to enable UFW, allowing SSH only from ${config.sshAllowedSubnet}. ` +
      "Could not verify the current SSH client IP automatically.",
  );

  if (!proceed) {
    throw new Error("UFW setup was not confirmed.");
  }

  await run("ufw", ["default", "deny", "incoming"]);
  await run("ufw", ["default", "allow", "outgoing"]);
  await run("ufw", ["delete", "allow", "22/tcp"], { check: false });
  await run("ufw", [
    "allow",
    "from",
    config.sshAllowedSubnet,
    "to",
    "any",
    "port",
    "22",
    "proto",
    "tcp",
  ]);
  await run("bash", ["-c", "yes | ufw enable"]);

  return { label: "UFW firewall", changed: true, detail: "configured" };
}
