import { FlashMessage } from "./types.ts";

export const FLASH = {
  "LoggedOut": {
    type: "success",
    msg: "You were signed out",
  },
  "SessionRevoked": {
    type: "success",
    msg: "Session successfully revoked",
  },
  "SessionExpired": {
    type: "info",
    msg: "Your session has expired. Please, log in again.",
  },
  "Reauthenticated": {
    type: "success",
    msg: "Successfully reauthenticated",
  },
  "PasskeyAccountMismatch": {
    type: "info",
    msg: "That passkey belongs to a different account.",
  },
  "AccountDeleted": {
    type: "success",
    msg: "Your account has been deleted",
  },
} as const satisfies Record<string, FlashMessage>;
