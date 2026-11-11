// Types for licences.mjs, for a project that imports it from TypeScript (its tests, its build's notices).
export interface LicenceConfig {
  lockfiles?: string[];
  ships: string[];
  data?: string[];
  fonts?: string[];
  audit?: string;
  ignoreScriptsIn?: string[];
  scan?: { served?: string[]; tools?: string[]; skip?: string[] };
}
export function floorList(file?: string | URL): { any: string[]; data: string[]; fonts: string[]; publicDomain: boolean };
export function policy(config?: Partial<LicenceConfig>): {
  allowedFor(name: string, shipped?: boolean, kind?: string | null): Set<string>;
  tools: string[];
};
export function licenceOk(expression: unknown, allow: Set<string>): boolean;
export function registryName(resolved: string | undefined): string | undefined;
export function shippedPaths(
  packages: Record<string, Record<string, unknown>>,
  workspaces: string[],
  manifest: (dir: string) => Record<string, unknown>,
): Set<string>;
export function registryOverrides(npmrc: string): string[];
export function scriptsOff(npmrc: string): boolean;
export function loadConfig(path: string): LicenceConfig;
export function check(config: LicenceConfig, root: string): { failures: string[]; summary: string };
