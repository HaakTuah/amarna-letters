// What the tests of core-path.mjs stand on (core-path-test.mjs and core-path-hooks-test.mjs): the manifest's "Core:" line in both of its forms. Tests only.
import { CORE } from "./core-address.mjs";
import { scratchDir } from "./scratch-core.mjs";

// The workflows a project calls whose first step reads where the core's copy stands.
export const CALLED = ["copies.yml", "core-moved.yml", "licences.yml", "look.yml", "nuget.yml", "pr-description.yml", "signatures.yml", "versions.yml"];
export const A = "a".repeat(40);
export const copied = (at = "core/") => `# Core manifest\n\nCore: ${CORE} at ${A}, copied whole under ${at} (never edited here).\n`;
export const carried = (lib = "lib/", at = "lib/core/") => `# Core manifest\n\nCore: ${CORE}, carried by ${lib} under ${at} (never edited here).\nFloor copy: floor-copy/\n`;
// (a scratch folder: the script is run in it as from a project's root, and the hooks' cases make their projects in it)
export const tmp = scratchDir("core-path-test-");
