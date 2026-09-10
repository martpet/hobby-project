import { FlashMessage } from "./types.ts";

// Only the key travels in the cookie; the message text lives here so it can
// be changed without invalidating cookies already in the wild.
export const FLASH = {
  "LOGGED_OUT": {
    type: "success",
    msg: "Signed out",
  },
  "SESSION_REVOKED": {
    type: "success",
    msg: "Session revoked",
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
    msg: "Account deleted",
  },
  "PASSKEY_ADDED": {
    type: "success",
    msg: "Passkey added",
  },
  "PASSKEY_DELETED": {
    type: "success",
    msg: "Passkey deleted",
  },
  "PASSKEY_RENAMED": {
    type: "success",
    msg: "Passkey renamed",
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
