import { WEBSITE_TITLE } from "@etc/const.ts";
import { ComponentChildren, JSX } from "preact";

export interface DocumentProps {
  head?: JSX.Element;
  title?: string;
  children?: ComponentChildren;
}

export function Document({ head, children, title }: DocumentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="color-scheme" content="dark light" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/assets/logo.png" type="image/png" />
        <link rel="stylesheet" href="/assets/style.css" />
        {head}
        <title>{WEBSITE_TITLE}{title && ` – ${title}`}</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
