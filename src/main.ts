import { flashMid } from "@features/flash/middleware.ts";
import { sessionMid } from "@features/sessions/middleware.ts";
import { cacheMid } from "@middleware/cache/middleware.ts";
import { csrfMid } from "@middleware/csrf.ts";
import { errorMid } from "@middleware/error.tsx";
import { httpsMid } from "@middleware/https.ts";
import { jsxMid } from "@middleware/jsx.ts";
import { secureHeadersMid } from "@middleware/secure-headers.ts";
import { trailingSlashMid } from "@middleware/trailing-slash.ts";
import { PORT } from "@shared/const.ts";
import { buildContext } from "@shared/context.ts";
import { router } from "@shared/router.ts";
import { routes } from "./routes.ts";

// Outermost first. Order matters:
// - `errorMid` wraps everything so any throw becomes a 500 page.
// - `httpsMid`/`secureHeadersMid` run before the cache so redirects are never
//   cached and stored responses already carry the security headers.
// - `csrfMid` rejects before the cache so a forged POST can't evict entries.
// - `cacheMid` sits above `sessionMid`: hits skip the KV lookup entirely,
//   while `cacheControlMid` (its inner layer) still sees the resolved session.
// - `trailingSlashMid` needs the router's 404 but must stay under the cache
//   so the redirect itself is cacheable.
// - `flashMid` is last because it clears the cookie only on HTML responses,
//   which it can only know once the handler has run.
const middlewares = [
  errorMid,
  httpsMid,
  secureHeadersMid,
  csrfMid,
  cacheMid,
  trailingSlashMid,
  sessionMid,
  flashMid,
];

// `reduceRight` so the first entry ends up outermost. `jsxMid` sits between
// the chain and the router, turning returned VNodes into HTML responses so
// every middleware above it only ever sees a `Response`.
const composed = middlewares.reduceRight(
  (a, b) => b(a),
  jsxMid(router(routes)),
);

Deno.serve({ port: PORT }, (req, info) => {
  return composed(buildContext(req, info));
});
