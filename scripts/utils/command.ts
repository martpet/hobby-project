export async function command(cmd: string, args: string[]) {
  const command = new Deno.Command(cmd, {
    args,
    stdout: "inherit",
    stderr: "inherit",
  });

  const process = command.spawn();
  const status = await process.status;

  if (!status.success) {
    throw new Error(`${cmd} exited with code ${status.code}`);
  }
}
