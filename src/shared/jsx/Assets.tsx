import { SCRIPTS_REGISTRY } from "@shared/asset/registry.ts";
import { Context } from "@shared/context.ts";
import { ImportMap } from "@shared/jsx/ImportMap.tsx";
import { Link } from "@shared/jsx/Link.tsx";
import { Script } from "@shared/jsx/Script.tsx";

// Emits the scripts components registered on `c.head` during render. Must be
// rendered inside `<Deferred>` so those sets are complete (see Deferred.tsx).
// Order matters: the import map has to precede any module script that
// resolves a bare specifier through it, or the browser rejects the map.
export function Assets(_props: unknown, { head }: Context) {
  return (
    <>
      {[...head.modulepreloads].map((key) => (
        <Link href={SCRIPTS_REGISTRY[key]} rel="modulepreload" />
      ))}
      {head.importmap.size > 0 && (
        <ImportMap
          imports={Object.fromEntries(
            [...head.importmap].map((key) => [key, SCRIPTS_REGISTRY[key]]),
          )}
        />
      )}
      {[...head.modules].map((key) => (
        <Script src={SCRIPTS_REGISTRY[key]} type="module" />
      ))}
    </>
  );
}
