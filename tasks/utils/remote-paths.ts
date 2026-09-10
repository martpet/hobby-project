import { join } from "@std/path";

export function getRemotePaths(runtimeRoot: string, stateRoot: string) {
  return {
    app: join(runtimeRoot, "app"),
    deployer: join(runtimeRoot, "deployer"),
    installer: join(runtimeRoot, "installer"),
    upload: join(stateRoot, "deploy"),
    cache: join(stateRoot, "cache"),
  };
}
