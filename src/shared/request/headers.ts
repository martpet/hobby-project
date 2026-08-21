import { Context } from "@/shared/types.ts";

export function acceptHtml(c: Context) {
  return c.req.headers.get("accept")?.includes("text/html");
}
