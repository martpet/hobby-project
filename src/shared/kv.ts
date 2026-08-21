const path = Deno.env.get("KV_PATH");

export const kv = await Deno.openKv(path);
