// Types for scripts/licences.mjs, for the web build and its test.
export function policy(): { allowedFor(name: string, shipped?: boolean): Set<string> };
export function licenceOk(expression: unknown, allow: Set<string>): boolean;
export function registryName(resolved: string | undefined): string | undefined;
export function registryOverrides(npmrc: string): string[];
export function shippedPaths(packages: Record<string, Record<string, unknown>>, workspaces: string[]): Set<string>;
export function packageDir(id: string, packages: Record<string, Record<string, unknown>>, workspaces: string[], base?: string): string | undefined;
export function notices(ids: string[]): string;
