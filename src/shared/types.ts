import { Session } from "@/features/sessions/types.ts";
import { User } from "@/features/users/types.ts";
import { Method } from "@std/http/unstable-method";
import { SetRequired } from "type-fest";

export type Handler<T = Response> = (c: Context) => T | Promise<T>;
export type Middleware<T = Response> = (next: Handler<T>) => Handler;

export interface Context {
  req: Request;
  url: URL;
  method: Method;
  ipAddress: string;
  isResCacheable?: boolean;
  session?: Readonly<Session | null>;
  sessionChanges?: Partial<Session["data"]>;
  user?: Readonly<User | null>;
  alerts?: Alert[];
}

export type ContextWithUser = SetRequired<Context, "user">;

export interface Alert {
  type: "success" | "info" | "warning" | "error";
  content: string;
}
