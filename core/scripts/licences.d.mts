// Types for licences.mjs, for a project that imports it from TypeScript (its tests, its build's notices).
export interface LicenceConfig {
  lockfiles?: string[];
  ships: string[];
  data?: string[];
  fonts?: string[];
  audit?: string;
  notices?: string;
  ignoreScriptsIn?: string[];
  scan?: { served?: string[]; tools?: string[]; skip?: string[] };
  accepted?: ({ package: string; licence: string; ships: boolean; yes: string; notice?: string } | { entry: string; version?: string; licence: string; ships: boolean; yes: string })[];
}
export function floorList(file?: string | URL): { any: string[]; data: string[]; fonts: string[]; publicDomain: boolean };
export function policy(config?: Partial<LicenceConfig>): {
  allowedFor(name: string, shipped?: boolean, kind?: string | null): Set<string>;
  tools: string[];
  never: RegExp;
};
export function licenceOk(expression: unknown, allow: Set<string>): boolean;
export function lockPathOk(path: string): boolean;
export function lockInstalled(path: string): boolean;
export function registryName(resolved: string | undefined): string | undefined;
export function registryVersion(resolved: string | undefined): string | undefined;
export function shippedPaths(
  packages: Record<string, Record<string, unknown>>,
  workspaces: string[],
  manifest: (dir: string) => Record<string, unknown>,
): Set<string>;
export function registryOverrides(npmrc: string): string[];
export function scriptsOff(npmrc: string): boolean;
export function loadConfig(path: string): LicenceConfig;
export function actionLists(config: LicenceConfig): string[];
export function check(config: LicenceConfig, root: string): { failures: string[]; summary: string };
