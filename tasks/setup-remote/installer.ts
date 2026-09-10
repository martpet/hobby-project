// Idempotent, root-run remote configuration binary for "hobproj" servers.
// Compiled and installed via `publish-installer.ts`, then run via `sudo` by
// `task.ts`. Every step checks the current state first and only changes
// something that is missing or different; already-correct steps are
// reported as skipped, never reapplied. This mirrors the architecture of
// `deployer.ts`, but for one-time/occasional server provisioning rather
// than app deploys.
import { run } from "../utils/run.ts";

interface Config {
  readonly usbLabel: string;
  readonly usbMountPath: string;
  readonly sshAllowedSubnet: string;
  readonly deployStagingUsers: string[];
  readonly deployProdUsers: string[];
  readonly stagingAppPort: string;
  readonly prodAppPort: string;
  readonly stagingAppOrigin: string;
  readonly prodAppOrigin: string;
  readonly compileTarget: string;
  readonly cloudflareTunnelToken: string;
  readonly cloudflareZoneId: string;
  readonly cloudflareApiToken: string;
  readonly geoipAccountId: string;
  readonly geoipLicenseKey: string;
  readonly remoteAppRoot: string;
  readonly remoteUploadRoot: string;
  readonly remoteCacheRoot: string;
  readonly remoteDeployerRoot: string;
}

interface StepResult {
  readonly label: string;
  readonly changed: boolean;
  readonly detail?: string;
}

const ENVS = ["staging", "prod"] as const;
type Env = (typeof ENVS)[number];

const ETC_ROOT = "/etc/hobproj";
const GEOIP_DIR = "/var/lib/GeoIP";
const GEOIP_DB_PATH = `${GEOIP_DIR}/GeoLite2-City.mmdb`;
const SUDOERS_PATH = "/etc/sudoers.d/hobproj-deploy";
const CLOUDFLARED_DIR = "/etc/cloudflared";
const CLOUDFLARED_TOKEN_PATH = `${CLOUDFLARED_DIR}/token`;
const denoPath = "/usr/local/bin/deno";

const results: StepResult[] = [];

try {
  const config = await loadConfig();

  results.push(await ensureDenoInstalled());
  results.push(await ensureStorageMounted(config));
  results.push(await ensureAptPackage("geoipupdate"));
  results.push(await ensureCloudflaredRepoAndPackage());
  results.push(await ensureUsersAndGroups(config));
  results.push(...await ensureDirectoryLayout(config));
  results.push(...await ensureEtcHobprojEnvFiles(config));
  results.push(...await ensureDeployerConfigFiles(config));
  results.push(...await ensureSystemdAppUnits(config));
  results.push(await ensureSudoers());
  results.push(...await ensureGeoip(config));
  results.push(await ensureCloudflareTunnel(config));
  results.push(await ensureFirewall(config));

  printSummary(results);
} catch (error) {
  console.error("\n❌ Remote setup failed.", error);
  printSummary(results);
  Deno.exit(1);
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
    stagingAppOrigin: required("STAGING_APP_ORIGIN"),
    prodAppOrigin: required("PROD_APP_ORIGIN"),
    compileTarget: required("COMPILE_TARGET"),
    cloudflareTunnelToken: required("CLOUDFLARE_TUNNEL_TOKEN"),
    cloudflareZoneId: required("CLOUDFLARE_ZONE_ID"),
    cloudflareApiToken: required("CLOUDFLARE_API_TOKEN"),
    geoipAccountId: required("GEOIP_ACCOUNT_ID"),
    geoipLicenseKey: required("GEOIP_LICENSE_KEY"),
    remoteAppRoot: required("REMOTE_APP_PATH"),
    remoteUploadRoot: required("REMOTE_UPLOAD_PATH"),
    remoteCacheRoot: required("REMOTE_CACHE_PATH"),
    remoteDeployerRoot: required("REMOTE_DEPLOYER_PATH"),
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

let aptUpdated = false;

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
    await ensureDirectory(config.remoteAppRoot, "root", "hobproj", "710"),
  );
  results.push(
    await ensureDirectory(config.remoteUploadRoot, "root", "root", "711"),
  );
  results.push(
    await ensureDirectory(config.remoteCacheRoot, "root", "hobproj", "710"),
  );
  results.push(
    await ensureDirectory(config.remoteDeployerRoot, "root", "hobproj", "750"),
  );
  results.push(await ensureDirectory(ETC_ROOT, "root", "hobproj", "750"));
  results.push(await ensureDirectory(GEOIP_DIR, "root", "root", "755"));
  results.push(await ensureDirectory(CLOUDFLARED_DIR, "root", "root", "755"));

  for (const env of ENVS) {
    results.push(
      await ensureDirectory(
        `${config.remoteAppRoot}/${env}`,
        "hobproj",
        "hobproj",
        "700",
      ),
    );
    results.push(
      await ensureDirectory(
        `${config.remoteAppRoot}/${env}/db`,
        "hobproj",
        "hobproj",
        "700",
      ),
    );
    results.push(
      await ensureDirectory(
        `${config.remoteUploadRoot}/${env}`,
        "hobproj",
        `hobproj-deploy-${env}`,
        "2730",
      ),
    );
    results.push(
      await ensureDirectory(
        `${config.remoteCacheRoot}/${env}`,
        "hobproj",
        "hobproj",
        "700",
      ),
    );
    results.push(
      await ensureDirectory(
        `${config.remoteDeployerRoot}/${env}`,
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
    "SERVER_CACHE_ENABLED=1",
    "KV_PATH=./db/kv.sqlite",
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

  const ports: Record<Env, string> = {
    staging: config.stagingAppPort,
    prod: config.prodAppPort,
  };
  const origins: Record<Env, string> = {
    staging: config.stagingAppOrigin,
    prod: config.prodAppOrigin,
  };

  for (const env of ENVS) {
    const envContent = [
      `ENV_NAME=${env}`,
      `APP_PORT=${ports[env]}`,
      `APP_ORIGIN=${origins[env]}`,
      `HOME=${config.remoteCacheRoot}/${env}`,
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
  const commonDeployerEnv = [
    `COMPILE_TARGET=${config.compileTarget}`,
    "BINARY=./bin",
    `ALLOW_READ=./db,${GEOIP_DIR}`,
    "ALLOW_WRITE=./db",
    `CLOUDFLARE_ZONE_ID=${config.cloudflareZoneId}`,
    `CLOUDFLARE_API_TOKEN=${config.cloudflareApiToken}`,
    "",
  ].join("\n");

  const results = [
    await ensureFile(
      `${config.remoteDeployerRoot}/.env.deployer`,
      commonDeployerEnv,
      "root",
      "hobproj",
      "640",
    ),
  ];

  const ports: Record<Env, string> = {
    staging: config.stagingAppPort,
    prod: config.prodAppPort,
  };

  for (const env of ENVS) {
    const envDeployerEnv = [
      `ENV_NAME=${env}`,
      `APP_PATH=${config.remoteAppRoot}/${env}`,
      `UPLOAD_PATH=${config.remoteUploadRoot}/${env}`,
      `APP_PORT=${ports[env]}`,
      `SERVICE=hobproj.${env}`,
      `SERVER_CACHE_PATH=${config.remoteCacheRoot}/${env}/.local/share/bin.tmp/web_cache`,
      `DENO_DIR=${config.remoteCacheRoot}/${env}/deno`,
      "",
    ].join("\n");

    results.push(
      await ensureFile(
        `${config.remoteDeployerRoot}/${env}/.env.deployer`,
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

  for (const env of ENVS) {
    const appPath = `${config.remoteAppRoot}/${env}`;
    const runtimePath = `${config.remoteCacheRoot}/${env}`;
    const unit = [
      "[Unit]",
      `Description=Hobproj ${
        env === "prod" ? "production" : env
      } web application`,
      "After=network-online.target",
      "Wants=network-online.target",
      `RequiresMountsFor=${appPath}`,
      "",
      "[Service]",
      "Type=simple",
      "User=hobproj",
      "Group=hobproj",
      `WorkingDirectory=${appPath}`,
      `ExecStart=${appPath}/bin`,
      `EnvironmentFile=${ETC_ROOT}/common.env`,
      `EnvironmentFile=${ETC_ROOT}/${env}.env`,
      `EnvironmentFile=${appPath}/.git-sha`,
      "Restart=always",
      "RestartSec=5s",
      "StandardOutput=journal",
      "StandardError=journal",
      `SyslogIdentifier=hobproj-${env}`,
      "NoNewPrivileges=true",
      "PrivateTmp=true",
      "ProtectHome=true",
      "ProtectSystem=strict",
      `ReadWritePaths=${appPath}/db ${runtimePath}`,
      "",
      "[Install]",
      "WantedBy=multi-user.target",
      "",
    ].join("\n");

    const unitPath = `/etc/systemd/system/hobproj.${env}.service`;
    const result = await ensureFile(unitPath, unit, "root", "root", "644");
    results.push({
      label: `systemd unit hobproj.${env}`,
      changed: result.changed,
    });
    if (result.changed) anyChanged = true;

    const { code: enabledCode } = await run(
      "systemctl",
      ["is-enabled", `hobproj.${env}`],
      { stdout: "piped", check: false },
    );
    if (enabledCode !== 0) {
      await run("systemctl", ["enable", `hobproj.${env}`]);
      anyChanged = true;
    }
  }

  if (anyChanged) {
    await run("systemctl", ["daemon-reload"]);
  }

  return results;
}

// ---------------------------------------------------------------------------
// sudoers
// ---------------------------------------------------------------------------

async function ensureSudoers(): Promise<StepResult> {
  const content = [
    "%hobproj-deploy-staging ALL=(hobproj) NOPASSWD: /opt/hobproj-deployer/staging/deployer *",
    "%hobproj-deploy-prod ALL=(hobproj) NOPASSWD: /opt/hobproj-deployer/prod/deployer *",
    "hobproj ALL=(root) NOPASSWD: /usr/bin/systemctl restart hobproj.staging",
    "hobproj ALL=(root) NOPASSWD: /usr/bin/systemctl restart hobproj.prod",
    "",
  ].join("\n");

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

async function ensureGeoip(config: Config): Promise<StepResult[]> {
  const results: StepResult[] = [];

  const confContent = [
    `AccountID ${config.geoipAccountId}`,
    `LicenseKey ${config.geoipLicenseKey}`,
    "EditionIDs GeoLite2-City",
    "",
  ].join("\n");
  results.push(
    await ensureFile("/etc/GeoIP.conf", confContent, "root", "root", "600"),
  );

  const serviceUnit = [
    "[Unit]",
    "Description=Update MaxMind GeoIP databases",
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    "Type=oneshot",
    "ExecStart=/usr/bin/geoipupdate",
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
    await run("geoipupdate", []);
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

// ---------------------------------------------------------------------------
// Cloudflare Tunnel
// ---------------------------------------------------------------------------

async function ensureCloudflareTunnel(config: Config): Promise<StepResult> {
  const currentToken = await readTextIfExists(CLOUDFLARED_TOKEN_PATH);
  const tokenChanged =
    currentToken?.trim() !== config.cloudflareTunnelToken.trim();

  if (tokenChanged) {
    await ensureFile(
      CLOUDFLARED_TOKEN_PATH,
      config.cloudflareTunnelToken.trim() + "\n",
      "root",
      "root",
      "600",
    );
  }

  const unit = [
    "[Unit]",
    "Description=Cloudflare Tunnel client",
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    "TimeoutStartSec=15",
    "Type=notify",
    `ExecStart=/usr/bin/cloudflared --no-autoupdate tunnel run --token-file ${CLOUDFLARED_TOKEN_PATH}`,
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

  const changed = tokenChanged || unitResult.changed || enabledCode !== 0 ||
    activeCode !== 0;

  if (changed) {
    await run("systemctl", ["daemon-reload"]);
    await run("systemctl", ["enable", "--now", "cloudflared"]);
    if (tokenChanged && activeCode === 0) {
      await run("systemctl", ["restart", "cloudflared"]);
    }
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
