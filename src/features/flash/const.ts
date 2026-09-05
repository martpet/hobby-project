import { FlashMessage } from "./types.ts";

// Only the key travels in the cookie; the message text lives here so it can
// be changed without invalidating cookies already in the wild.
export const FLASH = {
  "LOGGED_OUT": {
    type: "success",
    msg: "Signed Out",
  },
  "SESSION_REVOKED": {
    type: "success",
    msg: "Session Revoked",
  },
  "SESSION_EXPIRED": {
    type: "warning",
    msg: "Your session expired",
  },
  "REAUTHENTICATED": {
    type: "success",
    msg: "Successfully reauthenticated",
  },
  "ACCOUNT_DELETED": {
    type: "success",
    msg: "Account Deleted",
  },
} as const satisfies Record<string, FlashMessage>;
