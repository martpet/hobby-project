import { STATUS_CODE } from "@std/http";

type RedirectStatusCodeKey =
  | "MultipleChoices"
  | "MovedPermanently"
  | "Found"
  | "SeeOther"
  | "TemporaryRedirect"
  | "PermanentRedirect";

export function respondRedirect(
  location: string,
  key: RedirectStatusCodeKey = "Found",
) {
  const status = STATUS_CODE[key];

  return new Response(null, { status, headers: { location } });
}
