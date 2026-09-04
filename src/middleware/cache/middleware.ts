import { Middleware } from "@shared/types.ts";
import { appCacheMid } from "./app-cache.ts";
import { cacheControlMid } from "./cache-control.ts";

// The cache middleware registered in `main.ts`. `appCacheMid` (server-side
// store) wraps `cacheControlMid` (downstream headers) so responses stored in
// the app cache already carry their `Cache-Control`/`Vary` headers.
export const cacheMid: Middleware = (next) =>
  appCacheMid(cacheControlMid(next));
