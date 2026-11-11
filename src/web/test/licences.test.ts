// This game's own side of the licence check (SECURITY.md, rule 10): the package a bundled module comes from and the
// audit's notices, for the notices the build ships (scripts/notices.mjs), and what ships worked out from the workspaces.
// The core's lists and readers are tested in the core (core/scripts/licences-test.mjs).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { shippedPaths } from "../../../core/scripts/licences.mjs";
import { assetNotices, packageDir } from "../../../scripts/notices.mjs";

const root = new URL("../../../", import.meta.url);
describe("licences", () => {
  it("finds the package a bundled module comes from, a local file: package by its real path, never a workspace", () => {
    const lock = {
      "": { workspaces: ["src/web"] },
      "node_modules/@amarna/web": { resolved: "src/web", link: true },
      "node_modules/gpl-lib": { resolved: "vendor/gpl-lib", link: true },
      "node_modules/inner": { resolved: "src/web/vendor/inner", link: true },
      "vendor/gpl-lib": { version: "1.0.0", license: "GPL-3.0-only" },
    };
    const at = (id: string) => packageDir(id, lock, ["src/web"], "/repo/");
    expect(at("/repo/vendor/gpl-lib/index.js")).toBe("/repo/vendor/gpl-lib");
    expect(at("/repo/src/web/vendor/inner/a/b.js")).toBe("/repo/src/web/vendor/inner");
    expect(at("/repo/src/web/src/main.tsx")).toBeUndefined();
    expect(at("/repo/vendor/gpl-library/index.js")).toBeUndefined();
    expect(at("/repo/node_modules/@scope/pkg/dist/x.js")).toBe("/repo/node_modules/@scope/pkg");
    expect(at("/repo/vendor/gpl-lib/node_modules/dep/i.js?commonjs")).toBe("/repo/vendor/gpl-lib/node_modules/dep");
  });

  it("credits everything of anyone else's that ships, and fails on one without its notice", () => {
    const entries = [
      { name: "Sample sounds", kind: "asset", ships: true, notice: "Sounds: sample sounds, CC0 1.0." },
      { name: "The icons", kind: "own", ships: true },
      { name: "A tool", kind: "tool", ships: false },
    ];
    expect(assetNotices(entries)).toEqual(["Sounds: sample sounds, CC0 1.0."]);
    expect(() => assetNotices([...entries, { name: "Sample art", kind: "asset", ships: true }])).toThrow(/Sample art/u);
  });

  it("works out what ships from the workspaces' runtime dependencies, not the lockfile's own flags", () => {
    const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
    const lock = read("package-lock.json").packages;
    const shipped = shippedPaths(lock, read("package.json").workspaces, (dir) => read(dir ? `${dir}/package.json` : "package.json"));
    for (const path of ["node_modules/react", "node_modules/react-dom", "node_modules/zod", "node_modules/@anthropic-ai/sdk"]) expect(shipped.has(path)).toBe(true);
    for (const path of ["node_modules/vite", "node_modules/vitest", "node_modules/typescript", "node_modules/caniuse-lite"]) expect(shipped.has(path)).toBe(false);
  });
});
