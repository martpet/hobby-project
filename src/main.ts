import { sessionMid } from "@/features/sessions/middleware.ts";
import { cacheMid } from "@/middleware/cache.ts";
import { csrfMid } from "@/middleware/csrf.ts";
import { errorMid } from "@/middleware/error.tsx";
import { jsxMid } from "@/middleware/jsx.ts";
import { trailingSlashMid } from "@/middleware/trailing-slash.ts";
import { createContext } from "@/shared/utils/context.ts";
import { handler } from "./handler.ts";

const port = Number(Deno.env.get("APP_PORT")) || undefined;

const middlewares = [
  errorMid,
  csrfMid,
  cacheMid,
  trailingSlashMid,
  sessionMid,
];

const composed = middlewares.reduceRight((a, b) => b(a), jsxMid(handler));

Deno.serve({ port }, (req, info) => {
  return composed(createContext(req, info));
});
