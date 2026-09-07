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

export async function commandOutput(cmd: string, args: string[]) {
  const command = new Deno.Command(cmd, {
    args,
    stdout: "piped",
    stderr: "inherit",
  });

  const { success, code, stdout } = await command.output();

  if (!success) {
    throw new Error(`${cmd} exited with code ${code}`);
  }

  return new TextDecoder().decode(stdout).trim();
}
