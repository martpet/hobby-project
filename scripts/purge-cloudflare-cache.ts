import { loadEnv } from "./helpers/load-env.ts";
import { purgeCloudflareCache } from "./helpers/purge-cache.ts";

const envName = await loadEnv();

console.log(`🧹 Manually purging the ${envName} Cloudflare cache...`);
await purgeCloudflareCache(envName);
console.log(`✅ Manual Cloudflare cache purge for ${envName} completed.`);
