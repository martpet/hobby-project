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
  const filePath = join(meta.dirname!, "assets", c.params.file!);
  const res = await serveFile(c.req, filePath);

  if (c.url.searchParams.has(VERSION_PARAM)) {
    res.headers.set(HEADER.CacheControl, IMMUTABLE_CACHE_CONTROL);
  }

  return res;
}
