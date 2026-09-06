import { VERSION_PARAM } from "@shared/asset/path.ts";
import { Context } from "@shared/context.ts";
import { IS_DEV } from "@shared/const.ts";
import { cacheNoStore } from "@shared/header/cache-control.ts";
import { DAY, SECOND } from "@std/datetime";
import { serveFile } from "@std/http";
import { formatCacheControl } from "@std/http/unstable-cache-control";
import { HEADER } from "@std/http/unstable-header";
import { join } from "@std/path";

const IMMUTABLE_CACHE_CONTROL = formatCacheControl({
  public: true,
  maxAge: (DAY * 365) / SECOND,
  immutable: true,
});

// Serves `<caller dir>/assets/<file>` where `file` is the `:file` route
// parameter. `serveFile` sets `ETag`/`Last-Modified` and answers conditional
// requests with 304 itself.
export async function handleAsset(c: Context, meta: ImportMeta) {
  // `:file` matches a single path segment and the URL is already normalised
  // by the time it is routed, so `file` can't contain `/` or `..` and the
  // result stays inside `assets/`.
  const filePath = join(meta.dirname!, "assets", c.params.file!);
  const res = await serveFile(c.req, filePath);

  if (IS_DEV) {
    // ETag revalidation alone still lets a browser reuse a cached response
    // without asking (heuristic freshness, bfcache, disk cache on a plain
    // reload), which is why editing a script sometimes required a hard
    // reload. `no-store` forces a real request every time so edits show up
    // on a normal reload.
    cacheNoStore(res.headers);
  } else if (c.url.searchParams.has(VERSION_PARAM)) {
    // Only versioned URLs are immutable; a bare `/assets/x.js` still
    // revalidates via the ETag `serveFile` set.
    res.headers.set(HEADER.CacheControl, IMMUTABLE_CACHE_CONTROL);
  }

  return res;
}
