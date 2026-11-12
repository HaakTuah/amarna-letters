#!/usr/bin/env node
// The exact-versions check (floor rule 7: "every package, tool and script at one exact version, never a range"), for a
// project whose packages come from npm. For each lock file the licence check's config names ("lockfiles"), it takes
// every package of the project's own that the lock file knows (the root and its workspaces) and holds each dependency
// it asks for (dependencies, devDependencies, optionalDependencies, peerDependencies) to two tests: what the package
// list says is one version as SemVer writes one (three numbers, a pre-release and a build after them at most), and it
// is, letter for letter, the version the lock file installs for it. A range, a tag, an alias, a git or web address or a
// path fails the first, whatever a lock file is made to say; a version other than the installed one fails the second.
// Nothing here reads npm's grammar of ranges: only what one exact version looks like, which SemVer fixes. One thing
// passes besides: a dependency the lock file links to another of the project's own packages (a workspace), whatever its
// list says. The root's "overrides" are held to the first test alone, each value one version or a "$name" that points
// to a dependency the root lists at one, and each said outright where its key picks among versions. What it does not
// hold: a lock file out of step with its lists, which `npm ci` refuses.
//
// Usage, from the project's root:  node core/scripts/exact-versions.mjs <the licence check's config>
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";

const KINDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const own = (key) => key === "" || !`/${key}/`.includes("/node_modules/");
// One version as SemVer 2.0.0 writes it (the pattern semver.org gives), and nothing that npm reads otherwise though it
// has that shape: no longer than npm reads a version, no number of more than 15 digits among its first three (npm reads
// a larger one as a tag, past what a number can hold), and not ending as a packed file's name does (npm reads that as
// a file). What is left was compared with npm's own reader on made-up texts, as the pull request that brought it says.
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/u;
const exact = (text) => {
  if (typeof text !== "string" || text.length > 256) return false;
  const parts = SEMVER.exec(text);
  return parts !== null && parts.slice(1, 4).every((number) => number.length <= 15) && !/\.(?:tgz|tar.gz|tar)$/iu.test(text); // (npm's own pattern, any one letter between "tar" and "gz")
};
const inside = (key) => !key.startsWith("/") && !`/${key}/`.includes("/../") && !/[\\:]/u.test(key); // (a folder of the project's, by its key)
const show = (value) => JSON.stringify(value) ?? String(value); // (a name or version printed so that it stays on its line)

// The root's "overrides": every value, however deep, one exact version, or a "$name" that points to a dependency the
// root itself lists at one exact version. A key that picks among versions (it has an "@" after its first letter) must
// say its value outright, as a text or as the "." of its list: left unsaid, npm takes the key's own pick as the value.
function overrides(value, list, file, at, problems, picks = false) {
  let points = false; // (a "$name": every list of the root's that holds the name holds it at one exact version, and one does)
  if (typeof value === "string" && value.startsWith("$")) {
    const lists = KINDS.map((kind) => list[kind]).filter((deps) => deps !== null && typeof deps === "object" && !Array.isArray(deps) && Object.hasOwn(deps, value.slice(1)));
    points = lists.length > 0 && lists.every((deps) => exact(deps[value.slice(1)]));
  }
  if (typeof value === "string") {
    if (!exact(value) && !points) problems.push(`${file}: overrides ${show(at)}: ${show(value)} is not one exact version`);
  } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (picks && !Object.hasOwn(value, ".")) problems.push(`${file}: overrides ${show(at)}: a key that picks among versions needs its value said, as a text or as "."`);
    for (const [name, inner] of Object.entries(value)) {
      const here = at === "" ? name : `${at} > ${name}`;
      if (name === "." && typeof inner !== "string") problems.push(`${file}: overrides ${show(here)}: ${show(inner)} is not one exact version`);
      else overrides(inner, list, file, here, problems, name.indexOf("@", 1) !== -1);
    }
  } else problems.push(`${file}: overrides ${show(at)}: ${show(value)} is not one exact version`);
}

// The entry npm installs for `name` as seen from the package at `from`: the nearest node_modules going up.
function installed(packages, from, name) {
  for (let dir = from; ; dir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "") {
    const key = posix.join(dir, "node_modules", name);
    if (Object.hasOwn(packages, key)) return packages[key];
    if (dir === "") return undefined;
  }
}

export function check(lockfile, read) {
  const problems = [];
  let lock;
  try { lock = JSON.parse(read(lockfile)); } catch (e) { return [`${lockfile}: cannot be read as JSON (${e.message})`]; }
  const packages = lock?.packages;
  if (packages === null || typeof packages !== "object" || Array.isArray(packages)) return [`${lockfile}: holds no "packages" (lockfileVersion 2 or later is needed)`];
  const root = posix.dirname(lockfile);
  if (!Object.hasOwn(packages, "")) problems.push(`${lockfile}: holds no entry for the project's own root (""), whose list would go unread`);
  for (const key of Object.keys(packages).filter(own)) {
    if (!inside(key)) { problems.push(`${lockfile}: the package ${show(key)} is no folder of the project's`); continue; }
    const file = posix.join(root, key, "package.json");
    let list;
    try { list = JSON.parse(read(file)); } catch (e) { problems.push(`${file}: cannot be read as JSON (${e.message})`); continue; }
    if (key === "" && list?.overrides !== undefined) overrides(list.overrides, list, file, "", problems);
    for (const kind of KINDS) {
      const deps = list?.[kind];
      if (deps === undefined) continue;
      if (deps === null || typeof deps !== "object" || Array.isArray(deps)) { problems.push(`${file}: "${kind}" is no list of names and versions`); continue; }
      for (const [name, spec] of Object.entries(deps)) {
        const entry = installed(packages, key, name);
        const linked = entry !== null && typeof entry === "object" && entry.link === true && typeof entry.resolved === "string";
        if (linked && own(entry.resolved) && inside(entry.resolved) && Object.hasOwn(packages, entry.resolved)) continue; // (one of the project's own)
        if (!exact(spec)) {
          problems.push(`${file}: ${kind} ${show(name)}: ${show(spec)} is not one exact version`);
        } else if (entry === undefined) {
          if (kind === "peerDependencies" || kind === "optionalDependencies") continue; // (a lock file may leave these out)
          problems.push(`${file}: ${kind} ${show(name)}: ${show(spec)} is not in ${lockfile}`);
        } else if (entry === null || typeof entry !== "object" || spec !== entry.version) {
          problems.push(`${file}: ${kind} ${show(name)}: ${show(spec)} is not the version the lock file installs (${show(entry?.version ?? null)})`);
        }
      }
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const configPath = process.argv[2];
  if (!configPath) { console.error("usage: node core/scripts/exact-versions.mjs <the licence check's config>"); process.exit(2); }
  let lockfiles;
  try { lockfiles = JSON.parse(readFileSync(configPath, "utf8")).lockfiles ?? []; } catch (e) { console.error(`FAIL: ${configPath} cannot be read (${e.message})`); process.exit(1); }
  if (!Array.isArray(lockfiles) || lockfiles.some((f) => typeof f !== "string")) { console.error(`FAIL: "lockfiles" in ${configPath} is no list of paths`); process.exit(1); }
  const problems = lockfiles.flatMap((f) => check(posix.normalize(f), (p) => readFileSync(p, "utf8")));
  for (const p of problems) console.error(`FAIL: ${p}`);
  console.log(problems.length ? `${problems.length} dependencies not at one exact version (floor rule 7)` : `ok   every dependency of ${lockfiles.length} lock file${lockfiles.length === 1 ? "" : "s"} is at the one exact version it installs`);
  process.exit(problems.length ? 1 : 0);
}
