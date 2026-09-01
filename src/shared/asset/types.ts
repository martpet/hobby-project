import { assetGroups, linkHref, scriptSrc } from "@shared/asset/registry.ts";

export type ScriptSrcKey = keyof typeof scriptSrc;

export type LinkHrefKey = keyof typeof linkHref;

export type AssetGroupKey = keyof typeof assetGroups;

export interface AssetGroup {
  modules?: ScriptSrcKey[];
  modulepreloads?: ScriptSrcKey[];
  imports?: ScriptSrcKey[];
  styles?: LinkHrefKey[];
}
