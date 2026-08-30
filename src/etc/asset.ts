import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { Context } from "@etc/types.ts";
import { serveFile } from "@std/http";
import { basename, join } from "@std/path";

export function handleAsset(c: Context, meta: ImportMeta) {
  const fileName = basename(c.url.pathname);
  const filePath = join(meta.dirname!, "assets", fileName);

  if (!["GET", "HEAD"].includes(c.method)) {
    return respondMethodNotAllowed(c, ["GET", "HEAD"]);
  }

  return serveFile(c.req, filePath);
}
