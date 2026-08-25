import { UserAgent } from "@std/http";

export interface Session {
  id: string;
  cookie: string;
  userId: string;
  expiresAt: number;
  lastActive: number;
  browser: UserAgent["browser"]["name"];
  os: UserAgent["os"]["name"];
  ip: string;
}
