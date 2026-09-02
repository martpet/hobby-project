import { Context } from "@shared/context.ts";
import { PropsWithChildren, Suspense } from "preact/compat";

const renderedOnce = new WeakSet<Context>();

export function Deferred(props: PropsWithChildren) {
  return (
    <Suspense fallback={null}>
      <RenderOnceReady>{props.children}</RenderOnceReady>
    </Suspense>
  );
}

function RenderOnceReady(props: PropsWithChildren, c: Context) {
  if (!renderedOnce.has(c)) {
    renderedOnce.add(c);
    throw Promise.resolve();
  }

  return props.children;
}
