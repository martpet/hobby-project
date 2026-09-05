import { VERSION_PARAM } from "@shared/asset/path.ts";
import { Context } from "@shared/context.ts";
import { DAY, SECOND } from "@std/datetime/constants";
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

  // Only versioned URLs are immutable; a bare `/assets/x.js` (dev) still
  // revalidates via the ETag `serveFile` set.
  if (c.url.searchParams.has(VERSION_PARAM)) {
    res.headers.set(HEADER.CacheControl, IMMUTABLE_CACHE_CONTROL);
  }

  return res;
}
