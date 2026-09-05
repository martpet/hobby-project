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

const composed = middlewares.reduceRight(
  (a, b) => b(a),
  jsxMid(router(routes)),
);

Deno.serve({ port: PORT }, (req, info) => {
  return composed(buildContext(req, info));
});
