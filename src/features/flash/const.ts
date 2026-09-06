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
  "PASSKEY_ADDED": {
    type: "success",
    msg: "Passkey Added",
  },
  "PASSKEY_DELETED": {
    type: "success",
    msg: "Passkey Deleted",
  },
  "PASSKEY_RENAMED": {
    type: "success",
    msg: "Passkey Renamed",
  },
  "PASSKEY_LAST_ONE": {
    type: "warning",
    msg: "You can't delete your last passkey — delete the account instead",
  },
  "PASSKEY_NAME_TAKEN": {
    type: "danger",
    msg: "Another passkey already has that name",
  },
} as const satisfies Record<string, FlashMessage>;
