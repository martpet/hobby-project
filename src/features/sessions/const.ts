import { DAY, MINUTE, WEEK } from "@std/datetime";

export const SESSION_IDLE_TIMEOUT = DAY;
export const SESSION_ABSOLUTE_TIMEOUT = WEEK;
export const SESSION_ACTIVITY_INTERVAL = MINUTE * 5;
export const SESSION_EXPIRY_WARNING_THRESHOLD = DAY;
