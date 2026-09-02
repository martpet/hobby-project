import { WEBSITE_TITLE } from "@shared/const.ts";
import { Assets } from "@shared/jsx/Assets.tsx";
import { Link } from "@shared/jsx/Link.tsx";
import { Context } from "@shared/types.ts";
import { ComponentChildren, VNode } from "preact";

export interface DocumentProps {
  head?: VNode;
  title?: string;
  children?: ComponentChildren;
}

export function Document(
  { head, title, children }: DocumentProps,
  { assets }: Context,
) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="color-scheme" content="dark light" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Link href="/assets/logo.png" rel="icon" type="image/png" />
        <Link href="/assets/styles.css" rel="stylesheet" />
        <Assets groups={assets} />
        {head}
        <title>{title && `${title} | `}{WEBSITE_TITLE}</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
