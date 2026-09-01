import { Context } from "@shared/types.ts";
import { DAY, HOUR, MINUTE, SECOND } from "@std/datetime";

export function dateTimeFormat(c: Context, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(c.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...opts,
  });
}

const RTF_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", DAY * 365],
  ["month", DAY * 30],
  ["day", DAY],
  ["hour", HOUR],
  ["minute", MINUTE],
  ["second", SECOND],
];

export function timeAgo(
  c: Context,
  deltaMs: number,
  opts?: Intl.RelativeTimeFormatOptions,
): string {
  const rtf = new Intl.RelativeTimeFormat(c.locale, {
    numeric: "auto",
    ...opts,
  });

  for (const [unit, ms] of RTF_UNITS) {
    if (Math.abs(deltaMs) >= ms) {
      return rtf.format(Math.round(deltaMs / ms), unit);
    }
  }
  return rtf.format(0, "second");
}
