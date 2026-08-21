import { kv } from "@/shared/kv.ts";
import { ulid } from "@std/ulid";
import { SetOptional } from "type-fest";
import { User } from "./types.ts";

export const USER_BY_ID = "user_by_id";
export const USER_BY_USERNAME = "user_by_username";

export function setUser(
  data: SetOptional<User, "id" | "createdAt">,
  atomic: Deno.AtomicOperation,
) {
  const user: User = {
    ...data,
    id: data.id || ulid(),
    createdAt: new Date(),
  };

  for (
    const key of [
      [USER_BY_ID, user.id],
      [USER_BY_USERNAME, user.username],
    ]
  ) atomic.set(key, user);

  return user.id;
}

export async function getUserById(id: User["id"]) {
  const entry = await kv.get<User>([USER_BY_ID, id]);
  return entry.value;
}

export async function getUserByUsername(username: User["username"]) {
  const entry = await kv.get<User>([USER_BY_USERNAME, username]);
  return entry.value;
}
