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
  "AccountDeleted": {
    type: "success",
    msg: "Your account has been deleted",
  },
} as const satisfies Record<string, FlashMessage>;
