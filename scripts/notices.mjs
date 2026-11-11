// The third-party notices the web build ships (SECURITY.md, rule 10; src/web/vite.config.ts): every package the build
// bundles, with the licence it ships, held to floor rule 10's list by the core's licence check, whose policy it uses
// with this game's config (scripts/licences.json). Node's own modules only.
import { readFileSync, readdirSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { licenceOk, loadConfig, policy, registryName } from "../core/scripts/licences.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

/**
 * The licence text a package ships (LICENSE, LICENCE, COPYING, with or without an extension), or undefined; without the
 * licences of what the package's own tools bundle (Vite's LICENSE.md lists them), which the game does not ship.
 */
function licenceText(dir) {
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.|-|$)/iu.test(f));
  return file ? readFileSync(join(dir, file), "utf8").split(/^#+ Licenses of bundled dependencies/mu)[0].trim() : undefined;
}

/**
 * What the game ships that no package brings (sounds, map data, pictures), each with its notice: the licence audit's
 * entries that ship (scripts/licences-audit.json, named by scripts/licences.json), credited though none requires it.
 */
const config = loadConfig(join(root, "scripts/licences.json"));
const ASSETS = JSON.parse(readFileSync(join(root, config.audit), "utf8")).entries.filter((e) => e.ships && e.notice).map((e) => e.notice);

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
 * ships; throws on one whose licence is off the list for what ships, so a build never ships one.
 */
export function notices(ids) {
  const { allowedFor } = policy(config);
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")).packages;
  const workspaces = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).workspaces;
  const fetchedAs = (dir) => registryName(lock[relative(root, dir).split(sep).join("/")]?.resolved) ?? "";
  const packages = [...new Set(ids.map((id) => packageDir(id, lock, workspaces)).filter((dir) => dir !== undefined))]
    .map((dir) => ({ dir, ...JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const off = packages.filter((p) => !licenceOk(p.license, allowedFor(fetchedAs(p.dir))));
  if (off.length) throw new Error(`Licences off the list (floor rule 10): ${off.map((p) => `${p.name} (${p.license ?? "none"})`).join(", ")}`);
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
