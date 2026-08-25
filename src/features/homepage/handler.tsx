import { isAuthenticatedContext } from "@etc/context.ts";
import { respondMethodNotAllowed } from "@etc/responses/method-not-allowed.tsx";
import { Context } from "@etc/types.ts";
import { Homepage } from "./jsx/Homepage.tsx";

export function handleHomepage(c: Context) {
  if (c.method !== "GET") {
    return respondMethodNotAllowed(c, "GET");
  }

  c.isResCacheable = !isAuthenticatedContext(c);

  return <Homepage user={c.user} />;
}
