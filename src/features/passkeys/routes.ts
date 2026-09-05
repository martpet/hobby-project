import { handleAsset } from "@shared/asset/handler.ts";
import { Route } from "@shared/router.ts";

export const passkeyRoutes: Route[] = [
  {
    pattern: new URLPattern({ pathname: "/passkeys/assets/:file" }),
    method: "GET",
    handler: (c) => handleAsset(c, import.meta),
  },
];
