// Licences (SECURITY.md, point 10). Run as `node scripts/licences.mjs`, it checks every package in the lockfile, the ones
// packages pull in included, against the list in .github/licences.yml and fails on one off it or naming no licence (the
// pull-request check, .github/workflows/licences.yml). The web build imports `notices` to write the third-party notices
// shipped with the game (src/web/vite.config.ts). Node's own modules only, so the check needs no install.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

/** A YAML list in .github/licences.yml, by key (`key: []` is an empty list). */
function list(yml, key) {
  if (new RegExp(`^${key}: \\[\\]$`, "mu").test(yml)) return [];
  const block = new RegExp(`^${key}:\\n((?:[ \\t]+- .+\\n?)+)`, "mu").exec(yml);
  if (!block) throw new Error(`.github/licences.yml has no ${key} list`);
  return block[1].split("\n").map((l) => l.replace(/^\s*- /u, "").trim()).filter(Boolean);
}

/**
 * The policy in .github/licences.yml: the licences any package may have, widened by the data licences for the packages
 * named as data or assets and by the font licences for those named as fonts, never across. "Public Domain", which has no
 * SPDX id, counts for any package (point 10); the action cannot be told so and fails such a package until it is named.
 */
export function policy() {
  const yml = readFileSync(join(root, ".github/licences.yml"), "utf8");
  const any = new Set([...list(yml, "allow-licenses"), "Public Domain"]);
  const data = new Set(list(yml, "data-packages"));
  const fonts = new Set(list(yml, "font-packages"));
  const exempt = list(yml, "allow-dependencies-licenses").map((purl) => purl.replace(/^pkg:npm\//u, "")).sort();
  if (exempt.join() !== [...data, ...fonts].sort().join())
    throw new Error(".github/licences.yml: allow-dependencies-licenses must name exactly the data-packages and font-packages");
  const forData = new Set([...any, ...list(yml, "data-licenses")]);
  const forFonts = new Set([...any, ...list(yml, "font-licenses")]);
  return { allowedFor: (name) => (data.has(name) ? forData : fonts.has(name) ? forFonts : any) };
}

/**
 * Whether an SPDX expression is allowed: parsed with its brackets, AND binding tighter than OR, so one side of an OR is
 * enough and every part of an AND is needed. An exception (WITH) or anything unparsable is refused.
 */
export function licenceOk(expression, allow) {
  if (typeof expression !== "string" || !expression.trim()) return false;
  if (allow.has(expression.trim())) return true;
  const tokens = expression.match(/\(|\)|[^\s()]+/gu) ?? [];
  let at = 0;
  const or = () => {
    let ok = and();
    while (tokens[at] === "OR") { at++; ok = and() || ok; }
    return ok;
  };
  const and = () => {
    let ok = atom();
    while (tokens[at] === "AND") { at++; ok = atom() && ok; }
    return ok;
  };
  const atom = () => {
    const token = tokens[at++];
    if (token === "(") {
      const ok = or();
      if (tokens[at++] !== ")") throw new Error("unbalanced");
      return ok;
    }
    if (token === undefined || [")", "AND", "OR", "WITH"].includes(token)) throw new Error("unexpected token");
    if (tokens[at] === "WITH") { at += 2; return false; }
    return allow.has(token);
  };
  try {
    const ok = or();
    return at === tokens.length && ok;
  } catch {
    return false;
  }
}

/**
 * Every package the lockfile installs, by its own name (an alias, `"x": "npm:y@1"`, is y). A link to one of the declared
 * workspaces is the owner's own code, which carries no licence; any other link (a `file:` package) is checked by its
 * target's licence and never takes a named package's data or font licences, so a local package cannot slip past.
 */
function lockfilePackages() {
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  const workspaces = new Set(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).workspaces);
  return Object.entries(lock.packages)
    .filter(([path, entry]) => path.includes("node_modules/") && !(entry.link && workspaces.has(entry.resolved)))
    .map(([path, entry]) => {
      const target = entry.link ? lock.packages[entry.resolved] ?? {} : entry;
      const name = target.name ?? path.slice(path.lastIndexOf("node_modules/") + 13);
      return { name, version: target.version, license: target.license, local: Boolean(entry.link) };
    });
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
  const { allowedFor } = policy();
  const packages = [...new Set(dirs)]
    .map((dir) => ({ dir, ...JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const off = packages.filter((p) => !licenceOk(p.license, allowedFor(p.name)));
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
  const { allowedFor } = policy();
  const all = lockfilePackages();
  const off = all.filter((p) => !licenceOk(p.license, allowedFor(p.local ? "" : p.name)));
  for (const p of off) console.error(`off the list: ${p.name}@${p.version} (${p.license ?? "no licence"})`);
  console.log(`${all.length} packages checked, ${off.length} off the list (SECURITY.md, point 10; .github/licences.yml)`);
  process.exit(off.length ? 1 : 0);
}
