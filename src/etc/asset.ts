import { ASSET_VERSION } from "@etc/const.ts";
import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { Context } from "@etc/types.ts";
import { DAY, SECOND } from "@std/datetime/constants";
import { serveFile } from "@std/http";
import { HEADER } from "@std/http/unstable-header";
import { basename, join } from "@std/path";

const VERSION_PARAM = "v";
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

export function assetPath(path: string) {
  return ASSET_VERSION ? `${path}?${VERSION_PARAM}=${ASSET_VERSION}` : path;
}
