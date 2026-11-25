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
import { join, posix, resolve } from "node:path";
import { inProject, logged, parseBounded } from "./guards.mjs";
import { started } from "./started.mjs";

const KINDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const own = (key) => key === "" || !`/${key}/`.includes("/node_modules/");
// One version as SemVer 2.0.0 writes it (the pattern semver.org gives), and nothing that npm reads otherwise though it
// has that shape: no longer than npm reads a version, no number of more than 15 digits among its first three (npm reads
// a larger one as a tag, past what a number can hold), and not ending as a packed file's name does (npm reads that as
// a file). What is left was compared with npm's own reader on made-up texts, as the pull request that brought it says.
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/u;
export const exact = (text) => {
  if (typeof text !== "string" || text.length > 256) return false;
  const parts = SEMVER.exec(text);
  return parts !== null && parts.slice(1, 4).every((number) => number.length <= 15) && !/\.(?:tgz|tar.gz|tar)$/iu.test(text); // (npm's own pattern, any one letter between "tar" and "gz")
};
const inside = (key) => !key.startsWith("/") && !`/${key}/`.includes("/../") && !/[\\:]/u.test(key); // (a folder of the project's, by its key)
const show = (value) => JSON.stringify(value) ?? String(value); // (a name or version printed so that it stays on its line)

// Whether a "$name" points to a dependency every list of the root's that holds the name holds at one exact version, and
// one does.
function pointsAtExact(value, list) {
  if (typeof value !== "string" || !value.startsWith("$")) return false;
  const lists = KINDS.map((kind) => list[kind]).filter((deps) => deps !== null && typeof deps === "object" && !Array.isArray(deps) && Object.hasOwn(deps, value.slice(1)));
  return lists.length > 0 && lists.every((deps) => exact(deps[value.slice(1)]));
}

const notExactOverride = (file, at, value) => `${file}: overrides ${show(at)}: ${show(value)} is not one exact version. Mend: write one, such as 1.2.3, then write the lock file anew with npm: its install, given --package-lock-only`;

// The root's "overrides": every value, however deep, one exact version, or a "$name" that points to a dependency the
// root itself lists at one exact version. A key that picks among versions (it has an "@" after its first letter) must
// say its value outright, as a text or as the "." of its list: left unsaid, npm takes the key's own pick as the value.
function overrides(value, list, file, at, problems, picks = false) {
  if (typeof value === "string") {
    if (!exact(value) && !pointsAtExact(value, list)) problems.push(notExactOverride(file, at, value));
  } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    overridesOf(value, list, file, at, problems, picks);
  } else problems.push(notExactOverride(file, at, value));
}

// The entries of one object of the overrides, each held to the same.
function overridesOf(value, list, file, at, problems, picks) {
  if (picks && !Object.hasOwn(value, ".")) problems.push(`${file}: overrides ${show(at)}: a key that picks among versions has no value of its own. Mend: give it one, one exact version as a text, or "." for the version the project names`);
  for (const [name, inner] of Object.entries(value)) {
    const here = at === "" ? name : `${at} > ${name}`;
    if (name === "." && typeof inner !== "string") problems.push(`${file}: overrides ${show(here)}: ${show(inner)} is not one exact version. Mend: write one, such as 1.2.3`);
    else overrides(inner, list, file, here, problems, name.indexOf("@", 1) !== -1);
  }
}

// The entry npm installs for `name` as seen from the package at `from`: the nearest node_modules going up.
function installed(packages, from, name) {
  for (let dir = from; ; dir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "") {
    const key = posix.join(dir, "node_modules", name);
    if (Object.hasOwn(packages, key)) return packages[key];
    if (dir === "") return undefined;
  }
}

// Whether an entry is a link to another package of the project's own.
function ownLink(entry, packages) {
  const linked = entry !== null && typeof entry === "object" && entry.link === true && typeof entry.resolved === "string";
  return linked && own(entry.resolved) && inside(entry.resolved) && Object.hasOwn(packages, entry.resolved);
}

// What a dependency's spec says of its entry in the lock file, as the problems it has: none, or one.
function dependencyProblems({ file, kind, name, spec, entry, lockfile }) {
  if (!exact(spec)) return [`${file}: ${kind} ${show(name)}: ${show(spec)} is not one exact version. Mend: write the one exact version the lock file installs${entry && typeof entry === "object" && typeof entry.version === "string" ? `, ${entry.version}` : ""}, then write the lock file anew with npm: its install, given --package-lock-only`];
  if (entry === undefined) {
    if (kind === "peerDependencies" || kind === "optionalDependencies") return []; // (a lock file may leave these out)
    return [`${file}: ${kind} ${show(name)}: ${show(spec)} is not in ${lockfile}. Mend: write the lock file anew with npm: its install, given --package-lock-only`];
  }
  if (entry === null || typeof entry !== "object" || spec !== entry.version) return [`${file}: ${kind} ${show(name)}: ${show(spec)} is not the version the lock file installs (${show(entry?.version ?? null)}). Mend: write the lock file anew with npm: its install, given --package-lock-only, or write the version it installs`];
  return [];
}

// The problems of one kind of dependencies of a package's list.
function kindProblems(file, kind, deps, lockfile, packages, key) {
  if (deps === undefined) return [];
  if (deps === null || typeof deps !== "object" || Array.isArray(deps)) return [`${file}: "${kind}" is no list of names and versions. Mend: write it as an object of each name to its version`];
  const problems = [];
  for (const [name, spec] of Object.entries(deps)) {
    const entry = installed(packages, key, name);
    if (ownLink(entry, packages)) continue; // (one of the project's own)
    problems.push(...dependencyProblems({ file, kind, name, spec, entry, lockfile }));
  }
  return problems;
}

// The problems of one package of the project's own that the lock file knows.
function packageProblems(lockfile, root, packages, key, read) {
  if (!inside(key)) return [`${lockfile}: the package ${show(key)} is no folder of the project's. Mend: make it a folder inside the project, or take it out of the project's workspaces, then write the lock file anew with npm: its install, given --package-lock-only`];
  const file = posix.join(root, key, "package.json");
  let list;
  try { list = parseBounded(read(file)); } catch (e) { return [`${file}: cannot be read as JSON (${logged(e.message)}). Mend: correct it to JSON`]; }
  const problems = [];
  if (key === "" && list?.overrides !== undefined) overrides(list.overrides, list, file, "", problems);
  for (const kind of KINDS) for (const problem of kindProblems(file, kind, list?.[kind], lockfile, packages, key)) problems.push(problem); // (one at a time: a spread of a long list overflows the stack)
  return problems;
}

export function check(lockfile, read) {
  const problems = [];
  let lock;
  try { lock = parseBounded(read(lockfile)); } catch (e) { return [`${lockfile}: cannot be read as JSON (${logged(e.message)}). Mend: write the lock file anew with npm, never by hand: its install, given --package-lock-only`]; }
  const packages = lock?.packages;
  if (packages === null || typeof packages !== "object" || Array.isArray(packages)) return [`${lockfile}: holds no "packages" (lockfileVersion 2 or later is needed). Mend: write the lock file anew with npm 7 or later, never by hand: its install, given --package-lock-only`];
  const root = posix.dirname(lockfile);
  if (!Object.hasOwn(packages, "")) problems.push(`${lockfile}: holds no entry for the project's own root (""), whose list would go unread. Mend: write the lock file anew with npm: its install, given --package-lock-only`);
  for (const key of Object.keys(packages).filter(own)) for (const problem of packageProblems(lockfile, root, packages, key, read)) problems.push(problem);
  return problems;
}

// What the command prints and exits with, given the licence check's config as the project's root holds it, read from
// `root`: { status, out, err } (the lines for stdout and stderr). Given `textAt`, which gives a file as the pull
// request's base held it (or null), a problem the base held word for word stood before: reported on stdout, never failed
// ("Nothing locks a project" in the core's AGENTS.md), as the licence check runs this beside itself (#1093, point 2).
// Given `noBase`, where the licence check found no base to read against, what stands cannot be told from what is new:
// every problem is reported, never failed, and the lookup's own warning says why.
export function report(configPath, root = ".", textAt = null, noBase = false) {
  const failed = (message, status = 1) => ({ status, out: [], err: [message] });
  if (!configPath) return failed("usage: node core/scripts/exact-versions.mjs <the licence check's config>", 2);
  let lockfiles;
  try { lockfiles = JSON.parse(readFileSync(resolve(root, configPath), "utf8")).lockfiles ?? []; } catch (e) { return failed(`FAIL: ${configPath} cannot be read (${logged(e.message)}). Mend: name the licence check's config, written as JSON`); }
  if (!Array.isArray(lockfiles) || lockfiles.some((f) => typeof f !== "string")) return failed(`FAIL: "lockfiles" in ${configPath} is no list of paths. Mend: write it as a list of the lock files' paths`);
  const outside = lockfiles.filter((f) => !inProject(f));
  if (outside.length) return failed(`FAIL: ${logged(`"lockfiles" in ${configPath} names a path outside the project: ${outside.join(", ")}`)}. Mend: name each lock file by its path from the project's root, with no ".." that leads above it`);
  const found = lockfiles.flatMap((f) => check(posix.normalize(f), (p) => readFileSync(join(root, p), "utf8")));
  const held = new Set(textAt ? lockfiles.flatMap((f) => check(posix.normalize(f), (p) => { const t = textAt(p); if (t === null) throw new Error("none at the base"); return t; })) : []);
  const problems = noBase ? [] : found.filter((p) => !held.has(p)), stood = noBase ? found : found.filter((p) => held.has(p));
  return {
    status: problems.length ? 1 : 0,
    out: [...stood.map((p) => `REPORT: ${logged(p)} (${noBase ? "no base to read it against" : "it stood so at the pull request's base"}: reported, never failed)`),
      problems.length ? `${problems.length} dependencies not at one exact version (floor rule 7)` : `ok   every dependency of ${lockfiles.length} lock file${lockfiles.length === 1 ? "" : "s"} is at the one exact version it installs${stood.length ? `, but ${stood.length} ${noBase ? "reported with no base to read against" : "that stood so before"}` : ""}`],
    err: problems.map((p) => `FAIL: ${logged(p)}`),
  };
}

if (started(import.meta.url)) {
  const { status, out, err } = report(process.argv[2]);
  for (const line of err) console.error(line);
  for (const line of out) console.log(line);
  process.exit(status);
}
