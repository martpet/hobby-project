import type { EnvName } from "@shared/environment.ts";
import { load } from "@std/dotenv";
import { ensureDir, exists } from "@std/fs";
import { dirname, join } from "@std/path";
import { checkHealth } from "./check-health.ts";
import { purgeCloudflareCache } from "./purge-cloudflare-cache.ts";
import { run } from "../utils/run.ts";
import { credentialPath } from "../setup-remote/secrets.ts";
import { extractSourceArchive } from "./source-archive.ts";

type Color = "blue" | "green";
const COLORS: readonly Color[] = ["blue", "green"];

interface ColorConfig {
  readonly service: string;
  readonly port: string;
  readonly binary: string;
  readonly binaryTemp: string;
  readonly gitShaEnvPath: string;
  readonly serverCachePath: string;
  readonly allowNet: string;
}

interface DeployConfig {
  readonly gitSha: string;
  readonly envName: EnvName;
  readonly remoteUploadPath: string;
  readonly remoteSourceArchive: string;
  readonly activeColorFile: string;
  readonly caddySnippetFile: string;
  readonly keepIdleRunning: boolean;
  readonly denoDir: string;
  readonly allowRead?: string;
  readonly allowWrite?: string;
  readonly blue: ColorConfig;
  readonly green: ColorConfig;
}

const configFileName = ".env.deployer";
const configFileDescription =
  `merged ${configFileName} files from the deployer and parent directories`;
const denoPath = "/usr/local/bin/deno";
const sudoPath = "/usr/bin/sudo";
const systemctlPath = "/usr/bin/systemctl";

try {
  const gitSha = Deno.args[0];
  const config = await loadConfig(gitSha);
  validateConfig(config);

  await deploy(config);
} catch (error) {
  console.error("Remote deployment failed.", error);
  Deno.exit(1);
}

function otherColor(color: Color): Color {
  return color === "blue" ? "green" : "blue";
}

async function loadConfig(gitSha: string | undefined): Promise<DeployConfig> {
  if (gitSha === undefined) {
    throw new Error("Missing git SHA.");
  }

  const remotePath = dirname(Deno.execPath());
  const parentPath = dirname(remotePath);
  const env = await loadEnvFiles([
    join(parentPath, configFileName),
    join(remotePath, configFileName),
  ]);
  const remoteUploadPath = getAbsoluteEnvPath(env, "UPLOAD_PATH");
  const envName = getEnvNameValue(env);
  const remoteAppPath = getAbsoluteEnvPath(env, "APP_PATH");
  const binaryFileName = getRelativeBinary(env);

  function buildColorConfig(color: Color): ColorConfig {
    const colorPath = join(remoteAppPath, color);
    const binary = join(colorPath, binaryFileName);
    const port = getEnvValue(env, `${color.toUpperCase()}_PORT`);
    return {
      service: getEnvValue(env, `SERVICE_${color.toUpperCase()}`),
      port,
      binary,
      binaryTemp: `${binary}.tmp`,
      gitShaEnvPath: join(colorPath, ".git-sha"),
      serverCachePath: getEnvValue(
        env,
        `SERVER_CACHE_PATH_${color.toUpperCase()}`,
      ),
      allowNet: `0.0.0.0:${port}`,
    };
  }

  return {
    gitSha,
    envName,
    remoteUploadPath,
    remoteSourceArchive: join(remoteUploadPath, `source-${gitSha}.tar.gz`),
    activeColorFile: getAbsoluteEnvPath(env, "ACTIVE_COLOR_FILE"),
    caddySnippetFile: getAbsoluteEnvPath(env, "CADDY_SNIPPET_FILE"),
    keepIdleRunning: getBooleanEnvValue(env, "KEEP_IDLE_RUNNING"),
    denoDir: getAbsoluteEnvPath(env, "DENO_DIR"),
    allowRead: env.ALLOW_READ,
    allowWrite: env.ALLOW_WRITE,
    blue: buildColorConfig("blue"),
    green: buildColorConfig("green"),
  };
}

async function readActiveColor(config: DeployConfig): Promise<Color> {
  const raw = (await Deno.readTextFile(config.activeColorFile)).trim();
  if (raw !== "blue" && raw !== "green") {
    throw new Error(
      `Invalid active color '${raw}' in ${config.activeColorFile}.`,
    );
  }
  return raw;
}

async function deploy(config: DeployConfig) {
  const activeColor = await readActiveColor(config);
  const idleColor = otherColor(activeColor);
  const idle = config[idleColor];
  const active = config[activeColor];

  console.log(
    `Active color is '${activeColor}'; deploying to idle color '${idleColor}'.`,
  );

  const wasIdleActiveBeforeDeploy = (await run(
    systemctlPath,
    ["is-active", "--quiet", idle.service],
    { check: false, stdin: "null" },
  )).code === 0;
  let startedIdle = false;

  let sourceDir: string | undefined;

  try {
    sourceDir = await Deno.makeTempDir({
      dir: dirname(idle.binary),
      prefix: ".deploy-src-",
    });
    await extractSourceArchive(config.remoteSourceArchive, sourceDir);
    await compileSource(config, idle, sourceDir);

    await ensureDir(dirname(idle.binary));
    if (await exists(idle.binary)) {
      await Deno.remove(idle.binary);
    }
    await Deno.rename(idle.binaryTemp, idle.binary);

    await Deno.writeTextFile(
      idle.gitShaEnvPath,
      `GIT_SHA=${config.gitSha}\n`,
    );

    await wipeServerCache(idle.serverCachePath);

    if (wasIdleActiveBeforeDeploy) {
      await run(sudoPath, [systemctlPath, "restart", idle.service]);
    } else {
      await run(sudoPath, [systemctlPath, "start", idle.service]);
      startedIdle = true;
    }

    await ensureServiceActive(idle.service);
    await ensureHealthy(idle, config.gitSha);

    // The idle color is now healthy and serving nothing yet; only past
    // this point does live traffic move, so a failure above never touches
    // the still-active color.
    await cutOverTraffic(config, idleColor, idle);

    if (!config.keepIdleRunning) {
      await run(sudoPath, [systemctlPath, "stop", active.service]);
    }
  } catch (error) {
    console.error(
      "Deployment validation failed; the active color was never touched.",
    );
    if (startedIdle) {
      await run(sudoPath, [systemctlPath, "stop", idle.service], {
        check: false,
      });
    }
    throw error;
  } finally {
    try {
      if (await exists(config.remoteSourceArchive)) {
        await Deno.remove(config.remoteSourceArchive);
      }
    } catch (error) {
      console.error(
        `Warning: could not remove ${config.remoteSourceArchive}.`,
        error,
      );
    }

    if (sourceDir !== undefined) {
      try {
        await Deno.remove(sourceDir, { recursive: true });
      } catch (error) {
        console.error(`Warning: could not remove ${sourceDir}.`, error);
      }
    }
  }

  try {
    await purgeCloudflareCache(config.envName, {
      zoneId: await decryptSecretOrUndefined("cloudflare_zone_id"),
      apiToken: await decryptSecretOrUndefined("cloudflare_api_token"),
    });
  } catch (error) {
    console.error(
      "Warning: deployment succeeded, but Cloudflare cache purge failed.",
      error,
    );
  }
}

// Decrypts a systemd-creds secret via `sudo` (the deployer runs as the
// unprivileged `hobproj` user; a sudoers rule scoped to exactly this
// credential file allows it). Returns undefined rather than throwing if the
// secret hasn't been provisioned yet (`deno task set-secret <name>`),
// matching purgeCloudflareCache's "not set, skip purge" behavior.
//
// No trailing OUTPUT arg: sudoers matches the command line verbatim, so
// this must be identical to the rule `installer.ts` writes.
async function decryptSecretOrUndefined(
  name: string,
): Promise<string | undefined> {
  const { code, stdout } = await run(
    sudoPath,
    [
      "-n",
      "/usr/bin/systemd-creds",
      "decrypt",
      `--name=${name}`,
      credentialPath(name),
    ],
    { stdout: "piped", check: false },
  );
  return code === 0 ? stdout.trim() : undefined;
}

async function compileSource(
  config: DeployConfig,
  idle: ColorConfig,
  sourceDir: string,
) {
  if (await exists(idle.binaryTemp)) {
    await Deno.remove(idle.binaryTemp);
  }

  const args = [
    "compile",
    `--output=${idle.binaryTemp}`,
    "--allow-env",
    "--include=src/",
  ];

  if (config.allowRead) {
    args.push(`--allow-read=${config.allowRead}`);
  }

  if (config.allowWrite) {
    args.push(`--allow-write=${config.allowWrite}`);
  }

  args.push(`--allow-net=${idle.allowNet}`);
  args.push("src/main.ts");

  await ensureDir(dirname(idle.binaryTemp));
  const options = {
    cwd: sourceDir,
    env: { DENO_DIR: config.denoDir },
  };
  await run(denoPath, args, options);
}

// Points Caddy's per-env upstream at the idle color's port and reloads it
// (graceful; Caddy drains the previous upstream's in-flight connections
// itself), then records the new active color. Only called once the idle
// color has already passed its health check.
async function cutOverTraffic(
  config: DeployConfig,
  idleColor: Color,
  idle: ColorConfig,
) {
  const snippet = [
    `reverse_proxy 127.0.0.1:${idle.port} {`,
    "\theader_up X-Forwarded-Proto {http.request.header.X-Forwarded-Proto}",
    "}",
    "",
  ].join("\n");

  await Deno.writeTextFile(config.caddySnippetFile, snippet);
  await run(sudoPath, [systemctlPath, "reload", "caddy"]);
  await Deno.writeTextFile(config.activeColorFile, `${idleColor}\n`);
}

async function wipeServerCache(serverCachePath: string) {
  try {
    if (await exists(serverCachePath)) {
      await Deno.remove(serverCachePath, { recursive: true });
    }
  } catch (error) {
    console.error("Warning: could not wipe the server cache.", error);
  }
}

async function ensureServiceActive(remoteService: string) {
  const activeService = await run(
    systemctlPath,
    ["is-active", "--quiet", remoteService],
    { check: false, stdin: "null" },
  );
  if (activeService.code === 0) {
    return;
  }

  console.error(`Service '${remoteService}' is not running.`);
  await run(systemctlPath, ["status", remoteService, "--no-pager"], {
    check: false,
    stdin: "null",
  });
  throw new Error(`Service '${remoteService}' is not running.`);
}

async function ensureHealthy(idle: ColorConfig, gitSha: string) {
  try {
    await checkHealth({
      service: idle.service,
      port: idle.port,
      expectedGitSha: gitSha,
    });
  } catch (error) {
    console.error(error);
    await run(systemctlPath, [
      "status",
      idle.service,
      "--no-pager",
    ], {
      check: false,
      stdin: "null",
    });
    throw error;
  }
}

function validateConfig(config: unknown): asserts config is DeployConfig {
  if (typeof config !== "object" || config === null) {
    throw new Error("Deployment config must be an object.");
  }

  const gitSha = getConfigValue(config, "gitSha");
  const remoteUploadPath = getConfigValue(config, "remoteUploadPath");
  const remoteSourceArchive = getConfigValue(config, "remoteSourceArchive");

  for (
    const [key, value] of Object.entries({
      gitSha,
      envName: getConfigValue(config, "envName"),
      remoteUploadPath,
      remoteSourceArchive,
      activeColorFile: getConfigValue(config, "activeColorFile"),
      caddySnippetFile: getConfigValue(config, "caddySnippetFile"),
      denoDir: getConfigValue(config, "denoDir"),
    })
  ) {
    if (typeof value !== "string" || !/^[\w./@+-]+$/.test(value)) {
      throw new Error(`${key} contains unsupported characters.`);
    }
  }

  if (!/^[0-9a-f]{7,40}$/.test(gitSha)) {
    throw new Error(
      "gitSha must be a 7-40 character lowercase hexadecimal SHA.",
    );
  }

  if (!remoteSourceArchive.startsWith(`${remoteUploadPath}/`)) {
    throw new Error("Deployment paths escaped their configured directories.");
  }

  for (const color of COLORS) {
    const colorConfig = (config as Record<Color, unknown>)[color];
    if (typeof colorConfig !== "object" || colorConfig === null) {
      throw new Error(`${color} config must be an object.`);
    }

    const binary = getColorConfigValue(colorConfig, "binary", color);
    const binaryTemp = getColorConfigValue(colorConfig, "binaryTemp", color);
    const port = getColorConfigValue(colorConfig, "port", color);

    for (
      const [key, value] of Object.entries({
        service: getColorConfigValue(colorConfig, "service", color),
        port,
        binary,
        binaryTemp,
        gitShaEnvPath: getColorConfigValue(
          colorConfig,
          "gitShaEnvPath",
          color,
        ),
        serverCachePath: getColorConfigValue(
          colorConfig,
          "serverCachePath",
          color,
        ),
        allowNet: getColorConfigValue(colorConfig, "allowNet", color),
      })
    ) {
      if (typeof value !== "string" || !/^[\w./@+:-]+$/.test(value)) {
        throw new Error(`${color}.${key} contains unsupported characters.`);
      }
    }

    if (dirname(binaryTemp) !== dirname(binary)) {
      throw new Error(
        `${color}: temporary and final binaries must share a directory.`,
      );
    }

    if (!/^\d+$/.test(port) || Number(port) === 0 || Number(port) > 65535) {
      throw new Error(`${color}.port must be a valid port number.`);
    }
  }
}

function getColorConfigValue(colorConfig: object, key: string, color: Color) {
  const value = (colorConfig as Record<string, unknown>)[key];

  if (typeof value !== "string") {
    throw new Error(`${color}.${key} must be a string.`);
  }

  return value;
}

function getConfigValue(
  config: object,
  key: keyof Omit<DeployConfig, "blue" | "green">,
) {
  const value = (config as Record<string, unknown>)[key];

  if (typeof value !== "string") {
    throw new Error(`${key} must be a string.`);
  }

  return value;
}

function getBooleanEnvValue(
  env: Record<string, string>,
  key: string,
): boolean {
  const value = env[key]?.trim().toLowerCase();
  return value === "true" || value === "1";
}

function getEnvValue(env: Record<string, string>, key: string) {
  const value = env[key];

  if (value === undefined) {
    throw new Error(`Missing ${key} in ${configFileDescription}.`);
  }

  return value;
}

async function ensureConfigFile(path: string) {
  if (!await exists(path)) {
    throw new Error(`Missing config file: ${path}`);
  }
}

async function loadEnvFiles(paths: string[]) {
  const env: Record<string, string> = {};

  for (const path of paths) {
    await ensureConfigFile(path);
    Object.assign(env, await load({ envPath: path }));
  }

  return env;
}

function getEnvNameValue(env: Record<string, string>): EnvName {
  const value = getEnvValue(env, "ENV_NAME");
  if (value !== "dev" && value !== "staging" && value !== "prod") {
    throw new Error(
      `ENV_NAME in ${configFileDescription} must be dev, staging, or prod.`,
    );
  }

  return value;
}

function getRelativeBinary(env: Record<string, string>) {
  const value = getEnvValue(env, "BINARY");
  const fileName = value.slice(2);

  if (
    !value.startsWith("./") ||
    value.length === 2 ||
    fileName.includes("/") ||
    fileName === "." ||
    fileName === ".."
  ) {
    throw new Error(
      `BINARY in ${configFileDescription} must be ./<filename>.`,
    );
  }

  return value;
}

function getAbsoluteEnvPath(env: Record<string, string>, key: string) {
  const value = getEnvValue(env, key);
  if (!value.startsWith("/") || value === "/") {
    throw new Error(`${key} in ${configFileDescription} must be absolute.`);
  }

  return value.replace(/\/+$/, "");
}
