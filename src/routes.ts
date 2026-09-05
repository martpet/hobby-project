import { accountRoutes } from "@features/account/routes.ts";
import { homepageRoutes } from "@features/homepage/routes.ts";
import { passkeyRoutes } from "@features/passkeys/routes.ts";
import { sessionRoutes } from "@features/sessions/routes.ts";
import { handleAsset } from "@shared/asset/handler.ts";
import { Route } from "@shared/router.ts";

export const routes: Route[] = [
  // Site-wide assets in `src/assets/`; features serve their own.
  {
    pattern: new URLPattern({ pathname: "/assets/:file" }),
    method: "GET",
    handler: (c) => handleAsset(c, import.meta),
  },
  ...homepageRoutes,
  ...accountRoutes,
  ...sessionRoutes,
  ...passkeyRoutes,
];
