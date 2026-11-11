// Types for scripts/notices.mjs, for the web build and its test.
export function packageDir(id: string, packages: Record<string, Record<string, unknown>>, workspaces: string[], base?: string): string | undefined;
export function assetNotices(entries: { name: string; kind?: string; ships?: boolean; notice?: string }[]): string[];
export function notices(ids: string[]): string;
