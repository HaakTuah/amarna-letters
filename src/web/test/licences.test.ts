// The licence policy (SECURITY.md, point 10; scripts/licences.mjs): SPDX expressions read with their brackets, and the
// data, asset and font licences allowed only for the packages named as such in .github/licences.yml.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { licenceOk, packageDir, policy, registryName, registryOverrides, shippedPaths } from "../../../scripts/licences.mjs";

const code = policy().allowedFor("some-library");
const data = policy().allowedFor("caniuse-lite");

describe("licences", () => {
  it("reads AND and OR with their brackets", () => {
    expect(licenceOk("(MIT OR GPL-3.0-only) AND (GPL-3.0-only)", code)).toBe(false);
    expect(licenceOk("MIT AND (BSD-2-Clause OR Apache-2.0)", code)).toBe(true);
    expect(licenceOk("(MIT OR CC0-1.0)", code)).toBe(true);
    expect(licenceOk("MIT OR GPL-3.0-only", code)).toBe(true);
    expect(licenceOk("GPL-3.0-only", code)).toBe(false);
  });

  it("refuses no licence, exceptions and broken expressions", () => {
    for (const bad of [undefined, "", "MIT AND", "(MIT", "MIT OR (", "Apache-2.0 WITH LLVM-exception"]) expect(licenceOk(bad, code)).toBe(false);
  });

  it("allows CC-BY only for named data packages, OFL only for named fonts, and the public domain for any", () => {
    expect(licenceOk("CC-BY-4.0", code)).toBe(false);
    expect(licenceOk("OFL-1.1", code)).toBe(false);
    expect(licenceOk("CC-BY-4.0", data)).toBe(true);
    expect(licenceOk("PDDL-1.0", data)).toBe(true);
    expect(licenceOk("OFL-1.1", data)).toBe(false);
    expect(licenceOk("Public Domain", code)).toBe(true);
  });

  it("names a package by its registry address, never by a name the lockfile could be given", () => {
    expect(registryName("https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001819.tgz")).toBe("caniuse-lite");
    expect(registryName("https://registry.npmjs.org/@scope/pkg/-/pkg-1.0.0.tgz")).toBe("@scope/pkg");
    for (const local of [undefined, "file:vendor/caniuse-lite.tgz", "vendor/caniuse-lite", "git+https://example.com/caniuse-lite.git", "https://example.com/caniuse-lite/-/caniuse-lite-1.0.0.tgz"])
      expect(registryName(local)).toBeUndefined();
  });

  it("refuses every npm setting but a few harmless ones, however its key is spelt", () => {
    const npmrc = ["registry=https://example.com/", "replace-registry-host=always", "@x:registry = https://example.com/", '"registry"=https://example.com/', '"replace-registry-host"=always', "${KEY}=https://example.com/"];
    expect(registryOverrides(npmrc.join("\n"))).toEqual(npmrc);
    expect(registryOverrides("fund=false\naudit=false\n# registry=https://example.com/\n; registry=x\n")).toEqual([]);
  });

  it("holds what ships to the strict list and lets tools that only run use any open-source licence", () => {
    const tool = policy().allowedFor("some-tool", false);
    for (const copyleft of ["GPL-3.0-only", "LGPL-2.1-or-later", "MPL-2.0"]) {
      expect(licenceOk(copyleft, tool)).toBe(true);
      expect(licenceOk(copyleft, code)).toBe(false);
    }
    for (const never of ["BUSL-1.1", "SSPL-1.0", "Elastic-2.0", "CC-BY-NC-4.0", "CC-BY-ND-4.0", undefined]) expect(licenceOk(never, tool)).toBe(false);
  });

  it("lets tools use every licence the Open Source Initiative approves, never one of its copyleft ones in what ships", () => {
    const tool = policy().allowedFor("some-tool", false);
    for (const osi of ["EUPL-1.2", "OSL-3.0", "CECILL-2.1", "MS-RL", "BSL-1.0", "Artistic-1.0-Perl"]) expect(licenceOk(osi, tool)).toBe(true);
    for (const copyleft of ["EUPL-1.2", "OSL-3.0", "CECILL-2.1", "MS-RL"]) expect(licenceOk(copyleft, code)).toBe(false);
  });

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

  it("works out what ships from the workspaces' runtime dependencies, not the lockfile's own flags", () => {
    const root = new URL("../../../", import.meta.url);
    const lock = JSON.parse(readFileSync(new URL("package-lock.json", root), "utf8")).packages;
    const shipped = shippedPaths(lock, JSON.parse(readFileSync(new URL("package.json", root), "utf8")).workspaces);
    for (const path of ["node_modules/react", "node_modules/react-dom", "node_modules/zod", "node_modules/@anthropic-ai/sdk"]) expect(shipped.has(path)).toBe(true);
    for (const path of ["node_modules/vite", "node_modules/vitest", "node_modules/typescript", "node_modules/caniuse-lite"]) expect(shipped.has(path)).toBe(false);
  });
});
