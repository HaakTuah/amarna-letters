// Licences (SECURITY.md, point 10). Run as `node scripts/licences.mjs`, it checks every package in the lockfile, the ones
// packages pull in included, against the list in .github/licences.yml and fails on one off it or naming no licence (the
// pull-request check, .github/workflows/licences.yml). The web build imports `notices` to write the third-party notices
// shipped with the game (src/web/vite.config.ts). Node's own modules only, so the check needs no install.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
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
 * The policy in .github/licences.yml, in two lists by what reaches players (SECURITY.md, point 10): `allowedFor(name,
 * shipped)` gives the strict list for what ships and the wider one for tools that only run, each widened by the data
 * licences for the packages named as data or assets and by the font licences for those named as fonts, never across.
 * "Public Domain", which has no SPDX id, counts in both; the action cannot be told so and fails such a package until it
 * is named.
 */
export function policy() {
  const yml = readFileSync(join(root, ".github/licences.yml"), "utf8");
  const tools = new Set([...list(yml, "allow-licenses"), "Public Domain"]);
  const shipped = new Set([...list(yml, "shipped-licenses"), "Public Domain"]);
  const loose = [...shipped].filter((l) => !tools.has(l));
  if (loose.length) throw new Error(`.github/licences.yml: shipped-licenses not in allow-licenses: ${loose.join(", ")}`);
  const data = new Set(list(yml, "data-packages"));
  const fonts = new Set(list(yml, "font-packages"));
  const exempt = list(yml, "allow-dependencies-licenses").map((purl) => purl.replace(/^pkg:npm\//u, "")).sort();
  if (exempt.join() !== [...data, ...fonts].sort().join())
    throw new Error(".github/licences.yml: allow-dependencies-licenses must name exactly the data-packages and font-packages");
  const widen = (base, key) => new Set([...base, ...list(yml, key)]);
  const sets = {
    shipped: { any: shipped, data: widen(shipped, "data-licenses"), fonts: widen(shipped, "font-licenses") },
    tools: { any: tools, data: widen(tools, "data-licenses"), fonts: widen(tools, "font-licenses") },
  };
  return {
    allowedFor: (name, isShipped = true) => {
      const set = isShipped ? sets.shipped : sets.tools;
      return data.has(name) ? set.data : fonts.has(name) ? set.fonts : set.any;
    },
  };
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
 * Every package the lockfile installs. A link to one of the declared workspaces is the owner's own code, which carries no
 * licence; any other link (a `file:` package) is checked by its target's licence. Only a package fetched from the npm
 * registry under its own name may take a named package's data or font licences (`registryName`): a lockfile's `name`
 * field is the PR author's to write, the registry address of what npm installs is not. `shipped` marks what the
 * workspaces' `dependencies` pull in (`shippedPaths`); everything else is a tool that only runs.
 */
function lockfilePackages() {
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  const workspaces = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).workspaces;
  const shipped = shippedPaths(lock.packages, workspaces);
  return Object.entries(lock.packages)
    .filter(([path, entry]) => path.includes("node_modules/") && !(entry.link && workspaces.includes(entry.resolved)))
    .map(([path, entry]) => {
      const target = entry.link ? lock.packages[entry.resolved] ?? {} : entry;
      const name = path.slice(path.lastIndexOf("node_modules/") + 13);
      return { name, version: target.version, license: target.license, registryName: entry.link ? undefined : registryName(entry.resolved), shipped: shipped.has(path) };
    });
}

/**
 * The lockfile paths of everything the workspaces' runtime dependencies pull in, worked out from the workspaces' own
 * package.json files (not the lockfile's `dev` flags, which a PR could edit), each name resolved the way Node resolves
 * it: the nearest node_modules folder up the tree. Peer and optional dependencies count, since they may be bundled.
 */
export function shippedPaths(packages, workspaces) {
  const deps = (manifest) => Object.keys({ ...manifest.dependencies, ...manifest.optionalDependencies, ...manifest.peerDependencies });
  const resolve = (from, name) => {
    for (let dir = from; ; dir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/node_modules/")) : "") {
      const path = dir ? `${dir}/node_modules/${name}` : `node_modules/${name}`;
      if (packages[path]) return path;
      if (!dir || !dir.includes("/node_modules/")) return packages[`node_modules/${name}`] ? `node_modules/${name}` : undefined;
    }
  };
  const seen = new Set();
  const queue = workspaces.flatMap((ws) => deps(JSON.parse(readFileSync(join(root, ws, "package.json"), "utf8"))).map((name) => resolve(ws, name)));
  while (queue.length) {
    const path = queue.pop();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const entry = packages[path];
    const real = entry.link ? entry.resolved : path;
    const manifest = entry.link ? JSON.parse(readFileSync(join(root, real, "package.json"), "utf8")) : entry;
    queue.push(...deps(manifest).map((name) => resolve(real, name)));
  }
  return seen;
}

/** The package a registry tarball address names (`https://registry.npmjs.org/<name>/-/<file>.tgz`), or undefined. */
export function registryName(resolved) {
  const match = /^https:\/\/registry\.npmjs\.org\/((?:@[^/]+\/)?[^/@]+)\/-\/[^/]+\.tgz$/u.exec(resolved ?? "");
  return match?.[1];
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
 * The folder of the package a bundled module (`id`, an absolute path) comes from, or undefined for the owner's own code:
 * under node_modules, that package's folder; elsewhere, the target of the nearest lockfile link holding it (a `file:`
 * package, which the build reaches by its real path), unless that link is one of the declared `workspaces`.
 */
export function packageDir(id, packages, workspaces, base = root) {
  const at = id.lastIndexOf("/node_modules/");
  if (at >= 0) {
    const rest = id.slice(at + 14).split("/");
    return id.slice(0, at + 14) + rest.slice(0, rest[0].startsWith("@") ? 2 : 1).join("/");
  }
  const top = base.split(sep).join("/");
  const [link] = Object.values(packages)
    .filter((entry) => entry.link)
    .map((entry) => ({ target: entry.resolved, dir: posix.join(top, entry.resolved) }))
    .filter(({ dir }) => id.startsWith(`${dir}/`))
    .sort((a, b) => b.dir.length - a.dir.length);
  return link && !workspaces.includes(link.target) ? link.dir : undefined;
}

/**
 * The third-party notices for the packages the bundled modules `ids` come from (`packageDir`), with the licence each
 * ships; throws on one whose licence is off the strict list, so a build never ships one.
 */
export function notices(ids) {
  const { allowedFor } = policy();
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")).packages;
  const workspaces = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).workspaces;
  const fetchedAs = (dir) => registryName(lock[relative(root, dir).split(sep).join("/")]?.resolved) ?? "";
  const packages = [...new Set(ids.map((id) => packageDir(id, lock, workspaces)).filter((dir) => dir !== undefined))]
    .map((dir) => ({ dir, ...JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const off = packages.filter((p) => !licenceOk(p.license, allowedFor(fetchedAs(p.dir))));
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

/**
 * The lines of a committed `.npmrc` that are not one of a few settings known to leave where npm fetches from alone: npm
 * reads keys in many spellings (quoted, scoped, from variables), so anything else, a registry or `replace-registry-host`
 * above all, fails the check, and `registryName` only vouches for what npm really fetches.
 */
export function registryOverrides(npmrc) {
  const harmless = /^(fund|audit|update-notifier|engine-strict|save-exact|progress|loglevel)\s*=\s*[\w.-]*$/u;
  return npmrc.split(/\r?\n/u).map((l) => l.trim()).filter((l) => l && !/^[#;]/u.test(l) && !harmless.test(l));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { allowedFor } = policy();
  const all = lockfilePackages();
  const off = all.filter((p) => !licenceOk(p.license, allowedFor(p.registryName ?? "", p.shipped)));
  for (const p of off) console.error(`off the ${p.shipped ? "shipped" : "tools"} list: ${p.name}@${p.version} (${p.license ?? "no licence"})`);
  const npmrcs = execFileSync("git", ["ls-files", "-z", "--", ":(glob)**/.npmrc"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const overrides = npmrcs.flatMap((f) => registryOverrides(readFileSync(join(root, f), "utf8")).map((l) => `${f}: ${l}`));
  for (const o of overrides) console.error(`npm setting not allowed (packages are named by the npm registry they come from): ${o}`);
  const shippedCount = all.filter((p) => p.shipped).length;
  console.log(`${all.length} packages checked (${shippedCount} shipped or may be, ${all.length - shippedCount} tools that only run), ${off.length} off their list (SECURITY.md, point 10; .github/licences.yml)`);
  process.exit(off.length || overrides.length ? 1 : 0);
}
