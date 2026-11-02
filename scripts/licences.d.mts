// Types for scripts/licences.mjs, for the web build and its test.
export function policy(): { allowedFor(name: string): Set<string> };
export function licenceOk(expression: unknown, allow: Set<string>): boolean;
export function notices(dirs: string[]): string;
