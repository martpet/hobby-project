import { handleAsset } from "@shared/asset/handler.ts";
import { Route } from "@shared/router.ts";
import { handlePasskeyAddFinish } from "./handlers/add/finish.ts";
import { handlePasskeyAddStart } from "./handlers/add/start.ts";
import { handlePasskeyDelete } from "./handlers/delete.ts";
import { handlePasskeyRename } from "./handlers/rename.ts";

export const passkeyRoutes: Route[] = [
  {
    pattern: new URLPattern({ pathname: "/passkeys/assets/:file" }),
    method: "GET",
    handler: (c) => handleAsset(c, import.meta),
  },
  {
    pattern: new URLPattern({ pathname: "/passkeys/add/start" }),
    method: "POST",
    handler: handlePasskeyAddStart,
  },
  {
    pattern: new URLPattern({ pathname: "/passkeys/add/finish" }),
    method: "POST",
    handler: handlePasskeyAddFinish,
  },
  {
    pattern: new URLPattern({ pathname: "/passkeys/:passkeyId/delete" }),
    method: "POST",
    handler: handlePasskeyDelete,
  },
  {
    pattern: new URLPattern({ pathname: "/passkeys/:passkeyId/rename" }),
    method: "POST",
    handler: handlePasskeyRename,
  },
];
