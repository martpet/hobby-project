import { assetGroups, scriptSrc } from "@shared/asset/registry.ts";
import { AssetGroupKey, ScriptSrcKey } from "@shared/asset/types.ts";
import { ImportMap } from "@shared/jsx/ImportMap.tsx";
import { Link } from "@shared/jsx/Link.tsx";
import { Script } from "@shared/jsx/Script.tsx";

interface AssetsProps {
  groups: Set<AssetGroupKey>;
}

export function Assets({ groups }: AssetsProps) {
  const modules = new Set<ScriptSrcKey>();
  const modulepreloads = new Set<ScriptSrcKey>();
  const imports = new Set<ScriptSrcKey>();

  for (const groupKey of groups) {
    const group = assetGroups[groupKey];

    for (const key of group.modules ?? []) modules.add(key);
    for (const key of group.modulepreloads ?? []) modulepreloads.add(key);
    for (const key of group.imports ?? []) imports.add(key);
  }

  return (
    <>
      {[...modules].map((key) => <Script src={scriptSrc[key]} type="module" />)}

      {[...modulepreloads].map((key) => (
        <Link href={scriptSrc[key]} rel="modulepreload" />
      ))}

      {imports.size > 0 && (
        <ImportMap
          imports={Object.fromEntries(
            [...imports].map((key) => [key, scriptSrc[key]]),
          )}
        />
      )}
    </>
  );
}
