import { createContext } from "@etc/context.ts";
import { flashMid } from "@features/flash/middleware.ts";
import { sessionMid } from "@features/sessions/middleware.ts";
import { cacheMid } from "@middleware/cache.ts";
import { csrfMid } from "@middleware/csrf.ts";
import { errorMid } from "@middleware/error.tsx";
import { httpsMid } from "@middleware/https.ts";
import { jsxMid } from "@middleware/jsx.ts";
import { secureHeadersMid } from "@middleware/secure-headers.ts";
import { trailingSlashMid } from "@middleware/trailing-slash.ts";
import { handler } from "./handler.ts";

const port = Number(Deno.env.get("APP_PORT")) ?? undefined;

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

const composed = middlewares.reduceRight((a, b) => b(a), jsxMid(handler));

Deno.serve({ port }, (req, info) => {
  return composed(createContext(req, info));
});
