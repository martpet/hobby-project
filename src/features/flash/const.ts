import { FlashMessage } from "./types.ts";

export const FLASH = {
  "LoggedOut": {
    type: "success",
    msg: "You were logged out",
  },
  "SessionRevoked": {
    type: "success",
    msg: "Session successfully revoked",
  },
  "SessionExpired": {
    type: "info",
    msg: "Your session has expired. Please, log in again.",
  },
} as const satisfies Record<string, FlashMessage>;
