import { VERSION_PARAM } from "@shared/asset/path.ts";
import { respondMethodNotAllowed } from "@shared/responses/method-not-allowed.tsx";
import { Context } from "@shared/types.ts";
import { DAY, SECOND } from "@std/datetime/constants";
import { serveFile } from "@std/http";
import { HEADER } from "@std/http/unstable-header";
import { basename, join } from "@std/path";

const MAX_AGE = (DAY * 365) / SECOND;

export async function handleAsset(c: Context, meta: ImportMeta) {
  const fileName = basename(c.url.pathname);
  const filePath = join(meta.dirname!, "assets", fileName);

  if (!["GET", "HEAD"].includes(c.method)) {
    return respondMethodNotAllowed(c, ["GET", "HEAD"]);
  }

  const res = await serveFile(c.req, filePath);

  if (c.url.searchParams.has(VERSION_PARAM)) {
    res.headers.set(
      HEADER.CacheControl,
      `public, max-age=${MAX_AGE}, immutable`,
    );
  }

  return res;
}
