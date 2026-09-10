import type { EnvName } from "@shared/environment.ts";
import { load } from "@std/dotenv";
import { ensureDir, exists } from "@std/fs";
import { dirname, join } from "@std/path";
import { checkHealth } from "./check-health.ts";
import { purgeCloudflareCache } from "./purge-cloudflare-cache.ts";
import { run } from "../utils/run.ts";
import { extractSourceArchive } from "./source-archive.ts";

interface DeployConfig {
  readonly remoteAppPort: string;
  readonly remoteBinary: string;
  readonly remoteBinaryTemp: string;
  readonly remoteSourceArchive: string;
  readonly remoteAppPath: string;
  readonly remoteUploadPath: string;
  readonly remoteService: string;
  readonly serverCachePath: string;
  readonly denoDir: string;
  readonly gitSha: string;
  readonly gitShaEnvPath: string;
  readonly envName: EnvName;
  readonly cloudflareZoneId?: string;
  readonly cloudflareApiToken?: string;
  readonly compileTarget?: string;
  readonly allowRead?: string;
  readonly allowWrite?: string;
  readonly allowNet: string;
}

let previousBinary = "";
let previousGitShaEnvPath = "";
let installedBinary = false;
let installedGitShaEnv = false;
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

  previousBinary = `${config.remoteBinary}.prev`;
  previousGitShaEnvPath = `${config.gitShaEnvPath}.prev`;

  await deploy(config);
} catch (error) {
  console.error("Remote deployment failed.", error);
  Deno.exit(1);
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
  const remoteAppPath = getAbsoluteEnvPath(env, "APP_PATH");
  const remoteUploadPath = getAbsoluteEnvPath(env, "UPLOAD_PATH");
  const gitShaEnvPath = join(remoteAppPath, ".git-sha");
  const remoteAppPort = getEnvValue(env, "APP_PORT");
  const remoteBinary = join(remoteAppPath, getRelativeBinary(env));
  const envName = getEnvNameValue(env);

  return {
    remoteAppPort,
    remoteBinary,
    remoteBinaryTemp: `${remoteBinary}.tmp`,
    remoteSourceArchive: join(remoteUploadPath, `source-${gitSha}.tar.gz`),
    remoteAppPath,
    remoteUploadPath,
    remoteService: getEnvValue(env, "SERVICE"),
    serverCachePath: getEnvValue(env, "SERVER_CACHE_PATH"),
    denoDir: getAbsoluteEnvPath(env, "DENO_DIR"),
    gitSha,
    gitShaEnvPath,
    envName,
    cloudflareZoneId: env.CLOUDFLARE_ZONE_ID,
    cloudflareApiToken: env.CLOUDFLARE_API_TOKEN,
    compileTarget: env.COMPILE_TARGET,
    allowRead: env.ALLOW_READ,
    allowWrite: env.ALLOW_WRITE,
    allowNet: `0.0.0.0:${remoteAppPort}`,
  };
}

async function deploy(config: DeployConfig) {
  let sourceDir: string | undefined;

  try {
    sourceDir = await Deno.makeTempDir({
      dir: dirname(config.remoteBinary),
      prefix: ".deploy-src-",
    });
    await extractSourceArchive(config.remoteSourceArchive, sourceDir);
    await compileSource(config, sourceDir);

    if (await exists(config.remoteBinary)) {
      if (await exists(previousBinary)) {
        await Deno.remove(previousBinary);
      }
      await Deno.rename(config.remoteBinary, previousBinary);
    }

    await Deno.rename(config.remoteBinaryTemp, config.remoteBinary);
    installedBinary = true;

    if (await exists(previousGitShaEnvPath)) {
      await Deno.remove(previousGitShaEnvPath);
    }
    if (await exists(config.gitShaEnvPath)) {
      await Deno.copyFile(config.gitShaEnvPath, previousGitShaEnvPath);
    }
    await Deno.writeTextFile(
      config.gitShaEnvPath,
      `GIT_SHA=${config.gitSha}\n`,
    );
    installedGitShaEnv = true;

    await wipeServerCache(config);
    await run(sudoPath, [systemctlPath, "restart", config.remoteService]);
    await ensureServiceActive(config.remoteService);
    await ensureHealthy(config);
  } catch (error) {
    console.error(
      "Deployment validation failed; restoring the previous release.",
    );
    await rollback(config);
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

  async function compileSource(config: DeployConfig, sourceDir: string) {
    if (await exists(config.remoteBinaryTemp)) {
      await Deno.remove(config.remoteBinaryTemp);
    }

    const args = [
      "compile",
      `--output=${config.remoteBinaryTemp}`,
      "--allow-env",
      "--include=src/",
    ];

    if (config.compileTarget) {
      args.push(`--target=${config.compileTarget}`);
    }

    if (config.allowRead) {
      args.push(`--allow-read=${config.allowRead}`);
    }

    if (config.allowWrite) {
      args.push(`--allow-write=${config.allowWrite}`);
    }

    args.push(`--allow-net=${config.allowNet}`);
    args.push("src/main.ts");

    await ensureDir(dirname(config.remoteBinaryTemp));
    const options = {
      cwd: sourceDir,
      env: { DENO_DIR: config.denoDir },
    };
    await run(denoPath, args, options);
  }

  try {
    if (await exists(previousBinary)) {
      await Deno.remove(previousBinary);
    }
  } catch (error) {
    console.error(`Warning: could not remove ${previousBinary}.`, error);
  }

  try {
    if (await exists(previousGitShaEnvPath)) {
      await Deno.remove(previousGitShaEnvPath);
    }
  } catch (error) {
    console.error(`Warning: could not remove ${previousGitShaEnvPath}.`, error);
  }

  try {
    await purgeCloudflareCache(config.envName, {
      zoneId: config.cloudflareZoneId,
      apiToken: config.cloudflareApiToken,
    });
  } catch (error) {
    console.error(
      "Warning: deployment succeeded, but Cloudflare cache purge failed.",
      error,
    );
  }
}

async function wipeServerCache(config: DeployConfig) {
  try {
    if (await exists(config.serverCachePath)) {
      await Deno.remove(config.serverCachePath, { recursive: true });
    }
  } catch (error) {
    console.error("Warning: could not wipe the server cache.", error);
  }
}

async function rollback(config: DeployConfig) {
  let failed = false;
  const attempt = async (operation: Promise<unknown>) => {
    try {
      await operation;
    } catch (error) {
      console.error(error);
      failed = true;
    }
  };

  if (await exists(config.remoteBinaryTemp)) {
    await attempt(Deno.remove(config.remoteBinaryTemp));
  }

  if (await exists(previousBinary)) {
    await attempt(Deno.rename(previousBinary, config.remoteBinary));
  } else if (installedBinary) {
    if (await exists(config.remoteBinary)) {
      await attempt(Deno.remove(config.remoteBinary));
    }
  }

  if (await exists(previousGitShaEnvPath)) {
    await attempt(Deno.rename(previousGitShaEnvPath, config.gitShaEnvPath));
  } else if (installedGitShaEnv) {
    await attempt(Deno.remove(config.gitShaEnvPath));
  }

  await attempt(
    run(sudoPath, [systemctlPath, "restart", config.remoteService]),
  );
  await attempt(
    run(systemctlPath, ["is-active", "--quiet", config.remoteService]),
  );

  if (failed) {
    throw new Error("Rollback failed; manual recovery is required.");
  }

  console.log("Rollback completed successfully.");
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

async function ensureHealthy(config: DeployConfig) {
  try {
    await checkHealth({
      service: config.remoteService,
      port: config.remoteAppPort,
      expectedGitSha: config.gitSha,
    });
  } catch (error) {
    console.error(error);
    await run(systemctlPath, [
      "status",
      config.remoteService,
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

  const remoteBinary = getConfigValue(config, "remoteBinary");
  const remoteBinaryTemp = getConfigValue(config, "remoteBinaryTemp");
  const remoteAppPort = getConfigValue(config, "remoteAppPort");
  const remoteSourceArchive = getConfigValue(config, "remoteSourceArchive");
  const remoteAppPath = getConfigValue(config, "remoteAppPath");
  const remoteUploadPath = getConfigValue(config, "remoteUploadPath");
  const gitSha = getConfigValue(config, "gitSha");

  for (
    const [key, value] of Object.entries({
      remoteBinary,
      remoteBinaryTemp,
      remoteSourceArchive,
      remoteAppPath,
      remoteUploadPath,
      remoteService: getConfigValue(config, "remoteService"),
      serverCachePath: getConfigValue(config, "serverCachePath"),
      denoDir: getConfigValue(config, "denoDir"),
      gitSha,
      gitShaEnvPath: getConfigValue(config, "gitShaEnvPath"),
      envName: getConfigValue(config, "envName"),
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

  if (
    !remoteBinary.startsWith(`${remoteAppPath}/`) ||
    !remoteSourceArchive.startsWith(`${remoteUploadPath}/`)
  ) {
    throw new Error("Deployment paths escaped their configured directories.");
  }

  if (dirname(remoteBinaryTemp) !== dirname(remoteBinary)) {
    throw new Error(
      "Temporary and final remote binaries must share a directory.",
    );
  }

  if (
    !/^\d+$/.test(remoteAppPort) ||
    Number(remoteAppPort) === 0 ||
    Number(remoteAppPort) > 65535
  ) {
    throw new Error("remoteAppPort must be a valid port number.");
  }
}

function getConfigValue(config: object, key: keyof DeployConfig) {
  const value = (config as Record<keyof DeployConfig, unknown>)[key];

  if (typeof value !== "string") {
    throw new Error(`${key} must be a string.`);
  }

  return value;
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
