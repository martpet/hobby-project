import { WEBSITE_TITLE } from "@etc/const.ts";
import { ComponentChildren, JSX } from "preact";

export interface DocProps {
  head?: JSX.Element;
  title?: string;
  children?: ComponentChildren;
  bodyClass?: string;
}

export function Doc({ head, children, title, bodyClass }: DocProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="color-scheme" content="dark light" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/assets/logo.png" type="image/png" />
        <link rel="stylesheet" href="/assets/base.css" />
        {head}
        <title>{WEBSITE_TITLE}{title && ` – ${title}`}</title>
      </head>
      <body class={bodyClass}>{children}</body>
    </html>
  );
}
