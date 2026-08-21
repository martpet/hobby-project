import { Context } from "@/shared/types.ts";
import { Method } from "@std/http/unstable-method";

export function createContext(
  req: Request,
  info: Deno.ServeHandlerInfo<Deno.NetAddr>,
): Context {
  return {
    req,
    url: new URL(req.url),
    method: req.method as Method,
    ipAddress: info.remoteAddr.hostname,
  };
}
