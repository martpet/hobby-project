import { kv } from "@etc/kv.ts";
import { ulid } from "@std/ulid";
import { SetOptional } from "type-fest";
import { User } from "./types.ts";

const USERS_BY_ID = "users_by_id";
export const USERS_BY_USERNAME = "users_by_username";

function getUserKeys(user: User) {
  return [
    [USERS_BY_ID, user.id],
    [USERS_BY_USERNAME, user.username],
  ];
}

export function getUserById(id: User["id"]) {
  return kv.get<User>([USERS_BY_ID, id]);
}

export function getUserByUsername(username: User["username"]) {
  return kv.get<User>([USERS_BY_USERNAME, username]);
}

export function setUser(
  partialUser: SetOptional<User, "id">,
  atomic: Deno.AtomicOperation,
) {
  const user: User = {
    ...partialUser,
    id: partialUser.id ?? ulid(),
  };

  for (const key of getUserKeys(user)) {
    atomic.set(key, user);
  }

  return user;
}
