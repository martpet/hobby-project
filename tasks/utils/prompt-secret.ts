// Reads a line of input without echoing it to the terminal, so a secret
// value never appears in scrollback or a terminal recording. Falls back to a
// plain read when stdin isn't a TTY (e.g. piped input in a script).
export async function promptSecret(label: string): Promise<string> {
  const encoder = new TextEncoder();
  await Deno.stdout.write(encoder.encode(`${label}: `));

  if (!Deno.stdin.isTerminal()) {
    return await readLine();
  }

  Deno.stdin.setRaw(true);
  try {
    const bytes: number[] = [];
    const buf = new Uint8Array(1);
    while (true) {
      const n = await Deno.stdin.read(buf);
      if (n === null) break;
      const byte = buf[0];
      if (byte === 13 || byte === 10) break; // Enter
      if (byte === 3) throw new Error("Cancelled."); // Ctrl+C
      if (byte === 127 || byte === 8) { // Backspace/Delete
        bytes.pop();
        continue;
      }
      bytes.push(byte);
    }
    return new TextDecoder().decode(new Uint8Array(bytes)).trim();
  } finally {
    Deno.stdin.setRaw(false);
    await Deno.stdout.write(encoder.encode("\n"));
  }
}

async function readLine(): Promise<string> {
  const bytes: number[] = [];
  const buf = new Uint8Array(1);
  while (true) {
    const n = await Deno.stdin.read(buf);
    if (n === null) break;
    if (buf[0] === 10) break; // \n
    bytes.push(buf[0]);
  }
  return new TextDecoder().decode(new Uint8Array(bytes)).trim();
}
