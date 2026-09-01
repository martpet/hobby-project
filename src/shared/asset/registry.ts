import { AssetGroup } from "@shared/asset/types.ts";

export const scriptSrc = {
  util: "/assets/util.js",
  login: "/session/assets/login.js",
  signup: "/account/assets/signup.js",
  simplewebauthn: "/passkeys/assets/simplewebauthn.js",
} as const;

export const linkHref = {} as const;

export const assetGroups = {
  login: {
    modules: ["login"],
    modulepreloads: ["util"],
    imports: ["util", "simplewebauthn"],
  },
  signup: {
    modules: ["signup"],
    modulepreloads: ["util"],
    imports: ["util", "simplewebauthn"],
  },
} as const satisfies Record<string, AssetGroup>;
