import { run } from "../utils/run.ts";

const deno = Deno.execPath();

// Keep the database backup independent: a configuration failure must not
// prevent the scheduled production database snapshot.
await run(deno, ["task", "backup-db", "prod"]);
await run(deno, ["task", "backup-config"]);
