import { FlashMessage } from "./types.ts";

// Only the key travels in the cookie; the message text lives here so it can
// be changed without invalidating cookies already in the wild.
export const FLASH = {
  "LoggedOut": {
    type: "success",
    msg: "Signed Out",
  },
  "SessionRevoked": {
    type: "success",
    msg: "Session Revoked",
  },
  "SessionExpired": {
    type: "warning",
    msg: "Session Expired",
  },
  "Reauthenticated": {
    type: "success",
    msg: "Reauthenticated",
  },
  "AccountDeleted": {
    type: "success",
    msg: "Account Deleted",
  },
} as const satisfies Record<string, FlashMessage>;
