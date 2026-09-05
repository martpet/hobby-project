import { Middleware } from "@shared/types.ts";
import { appCacheMid } from "./app-cache-mid.ts";
import { cacheControlMid } from "./cache-control-mid.ts";
import { conditionalMid } from "./conditional-mid.ts";

// The cache middleware registered in `main.ts`, outermost first:
// `conditionalMid` (304 for a matching `If-None-Match`) wraps `appCacheMid`
// (server-side store, so it stores full responses and hits get revalidated
// too) which wraps `cacheControlMid` (downstream headers, so stored responses
// already carry their `Cache-Control`/`Vary`).
export const cacheMid: Middleware = (next) =>
  conditionalMid(appCacheMid(cacheControlMid(next)));
