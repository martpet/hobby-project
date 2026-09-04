import { FlashMessage } from "./types.ts";

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
  "PasskeyAccountMismatch": {
    type: "info",
    msg: "That passkey belongs to a different account.",
  },
  "AccountDeleted": {
    type: "success",
    msg: "Account Deleted",
  },
} as const satisfies Record<string, FlashMessage>;
