import { assetPath } from "@shared/asset/path.ts";
import { LinkHTMLAttributes } from "preact";

interface LinkProps extends Omit<LinkHTMLAttributes, "href"> {
  href: string;
}

export function Link({ href, ...attr }: LinkProps) {
  return <link {...attr} href={assetPath(href)} />;
}
