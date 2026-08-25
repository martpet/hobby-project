import { STATUS_CODE, STATUS_TEXT } from "@std/http";

export function respondBadRequest(input?: string | object) {
  const status = STATUS_CODE["BadRequest"];
  let body;

  if (typeof input === "string") {
    body = input;
  } else if (input === undefined) {
    body = STATUS_TEXT[status];
  } else {
    body = JSON.stringify(input);
  }

  return new Response(body, { status });
}
