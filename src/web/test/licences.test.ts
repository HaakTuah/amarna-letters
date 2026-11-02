// The licence policy (SECURITY.md, point 10; scripts/licences.mjs): SPDX expressions read with their brackets, and the
// data, asset and font licences allowed only for the packages named as such in .github/licences.yml.
import { describe, expect, it } from "vitest";
import { licenceOk, policy, registryName } from "../../../scripts/licences.mjs";

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
});
