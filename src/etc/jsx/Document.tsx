import { ASSET_VERSION, assetPath } from "@etc/asset.ts";
import { WEBSITE_TITLE } from "@etc/const.ts";
import { ComponentChildren, JSX } from "preact";

export interface DocumentProps {
  head?: JSX.Element;
  title?: string;
  children?: ComponentChildren;
}

const importMap = {
  imports: {
    "/assets/util.js": assetPath("/assets/util.js"),
    "/passkeys/assets/simplewebauthn.js": assetPath(
      "/passkeys/assets/simplewebauthn.js",
    ),
  },
};

export function Document({ head, children, title }: DocumentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="color-scheme" content="dark light" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          rel="icon"
          href={assetPath("/assets/logo.png")}
          type="image/png"
        />
        <link rel="stylesheet" href={assetPath("/assets/style.css")} />
        {ASSET_VERSION && (
          <script
            type="importmap"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(importMap, null, 2),
            }}
          />
        )}
        {head}
        <title>{WEBSITE_TITLE}{title && ` – ${title}`}</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
