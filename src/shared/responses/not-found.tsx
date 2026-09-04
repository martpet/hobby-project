import { DEFAULT_MAX_AGE } from "@shared/cache-control.ts";
import { Context } from "@shared/context.ts";
import { requestAcceptsHtml } from "@shared/header.ts";
import { NotFoundPage } from "@shared/jsx/pages/NotFound.tsx";
import { render } from "@shared/render.ts";
import { STATUS_CODE, STATUS_TEXT } from "@std/http";
import { HEADER } from "@std/http/unstable-header";

// `private` so browsers absorb repeat hits on a dead URL, while shared caches
// (CDN, app cache) don't accumulate an entry for every URL a bot probes.
const CACHE_CONTROL = `private, max-age=${DEFAULT_MAX_AGE}`;

export function respondNotFound(c: Context) {
  const status = STATUS_CODE["NotFound"];
  const headers = { [HEADER.CacheControl]: CACHE_CONTROL };

  if (requestAcceptsHtml(c)) {
    return render(c, <NotFoundPage />, { status, headers });
  }

  return new Response(STATUS_TEXT[status], { status, headers });
}
