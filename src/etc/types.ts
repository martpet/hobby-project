import { FlashKey } from "@features/flash/types.ts";
import { Session } from "@features/sessions/types.ts";
import { User } from "@features/users/types.ts";
import { Method } from "@std/http/unstable-method";
import { SetRequired } from "type-fest";

export type Handler<T = Response> = (c: Context) => T | Promise<T>;
export type Middleware<T = Response> = (next: Handler<T>) => Handler;

export interface Context {
  req: Request;
  url: URL;
  method: Method;
  ip: string;
  locale: string;
  shouldCache?: boolean;
  session?: Session;
  user?: User;
  flash?: FlashKey;
}

export type AuthenticatedContext = SetRequired<Context, "user" | "session">;
