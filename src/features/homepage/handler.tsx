import { respondMethodNotAllowed } from "@/shared/response/method-not-allowed.tsx";
import { Context } from "@/shared/types.ts";
import { Homepage } from "./jsx/Homepage.tsx";

export function handleHomepage(c: Context) {
  if (c.method !== "GET") {
    return respondMethodNotAllowed(c, "GET");
  }

  c.isResCacheable = !c.user;

  return <Homepage />;
}
