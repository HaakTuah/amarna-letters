// Licences (SECURITY.md, point 10). Run as `node scripts/licences.mjs`, it checks every package in the lockfile, the ones
// packages pull in included, against the list in .github/licences.yml and fails on one off it or naming no licence (the
// pull-request check, .github/workflows/licences.yml). The web build imports `notices` to write the third-party notices
// shipped with the game (src/web/vite.config.ts). Node's own modules only, so the check needs no install.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

/** The licences allowed: the `allow-licenses` list in .github/licences.yml. */
export function allowed() {
  const yml = readFileSync(join(root, ".github/licences.yml"), "utf8");
  const block = /^allow-licenses:\n((?:[ \t]+- .+\n?)+)/mu.exec(yml);
  if (!block) throw new Error(".github/licences.yml has no allow-licenses list");
  return new Set(block[1].split("\n").map((l) => l.replace(/^\s*- /u, "").trim()).filter(Boolean));
}

/** Whether an SPDX expression is allowed: one side of an OR is enough, every part of an AND is needed. */
export function licenceOk(expression, allow = allowed()) {
  if (typeof expression !== "string" || !expression.trim()) return false;
  const bare = expression.trim().replace(/^\((.*)\)$/u, "$1");
  if (/ OR /u.test(bare)) return bare.split(/ OR /u).some((part) => licenceOk(part, allow));
  if (/ AND /u.test(bare)) return bare.split(/ AND /u).every((part) => licenceOk(part, allow));
  return allow.has(bare);
}

/** Every package the lockfile installs (the workspaces' own code, linked, is the owner's and carries no licence). */
function lockfilePackages() {
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  return Object.entries(lock.packages)
    .filter(([path, entry]) => path.includes("node_modules/") && !entry.link)
    .map(([path, entry]) => ({ name: path.slice(path.lastIndexOf("node_modules/") + 13), version: entry.version, license: entry.license }));
}

/**
 * The licence text a package ships (LICENSE, LICENCE, COPYING, with or without an extension), or undefined; without the
 * licences of what the package's own tools bundle (Vite's LICENSE.md lists them), which the game does not ship.
 */
function licenceText(dir) {
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.|-|$)/iu.test(f));
  return file ? readFileSync(join(dir, file), "utf8").split(/^#+ Licenses of bundled dependencies/mu)[0].trim() : undefined;
}

/** What the game ships that no package brings, and where each comes from: credited here though none requires it. */
const ASSETS = [
  "Music and sounds (audio/): rendered from VS Chamber Orchestra: Community Edition (Versilian Studios, Sam Gossner, Simon\n" +
    "Dalzell, Elan Hickler) and the Versilian Community Sample Library (Versilian Studios and contributors), both CC0 1.0\n" +
    "(https://github.com/sgossner/VSCO-2-CE, https://github.com/sgossner/VCSL).",
  "The map's land, lakes, rivers and deserts: Natural Earth (naturalearthdata.com), public domain.",
  "The map's relief and snow: the Terrain Tiles of the AWS Open Data registry (from SRTM, GMTED2010 and ETOPO1), public domain.",
];

/**
 * The third-party notices for the packages in `dirs` (each a package's folder under node_modules), with the licence each
 * ships; throws on one whose licence is off the list, so a build never ships one.
 */
export function notices(dirs) {
  const allow = allowed();
  const packages = [...new Set(dirs)]
    .map((dir) => ({ dir, ...JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const off = packages.filter((p) => !licenceOk(p.license, allow));
  if (off.length) throw new Error(`Licences off the list (SECURITY.md, point 10): ${off.map((p) => `${p.name} (${p.license ?? "none"})`).join(", ")}`);
  const rule = "-".repeat(80);
  return [
    "Amarna Letters: third-party notices",
    "",
    "The game itself is not offered under any licence: all rights reserved. It ships the following, each under its own",
    "licence, whose notice is kept here as that licence asks.",
    "",
    rule,
    "Assets",
    rule,
    "",
    ...ASSETS.flatMap((a) => [a, ""]),
    ...packages.flatMap((p) => [rule, `${p.name} ${p.version} (${p.license})`, rule, "", licenceText(p.dir) ?? `Licensed under ${p.license}; the package ships no licence text.`, ""]),
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const allow = allowed();
  const all = lockfilePackages();
  const off = all.filter((p) => !licenceOk(p.license, allow));
  for (const p of off) console.error(`off the list: ${p.name}@${p.version} (${p.license ?? "no licence"})`);
  console.log(`${all.length} packages checked, ${off.length} off the list (SECURITY.md, point 10; .github/licences.yml)`);
  process.exit(off.length ? 1 : 0);
}
