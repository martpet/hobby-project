import { assetPath } from "@etc/asset/path.ts";
import { ScriptHTMLAttributes } from "preact";

interface ScriptProps extends Omit<ScriptHTMLAttributes, "src"> {
  src: string;
}

export function Script({ src, ...attr }: ScriptProps) {
  return <script {...attr} src={assetPath(src)} />;
}
