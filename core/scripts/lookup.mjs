#!/usr/bin/env node
// The lookup (floor rule 15, "A new one is looked up in its registry", in floor/topics/dependencies.md beside this
// folder; #488, point 1), for every project that takes the core: each package a pull request brings into the project,
// one no lock file of its base held under any version, is asked of its registry. It fails a name the registry does not
// know (a model sometimes names a package that does not exist, and someone may register the name), and one first
// published less than YOUNG days ago (such a name is new and has no history). Everything else it reads is printed for
// the review, and no score decides: when it last had a release, where its repository is and whether it is archived,
// who publishes it and whether its repository names it back, how many packages it brings with it, and whether it has
// provenance. A package updated, or one any lock file of the base held, is not looked up: nothing that stood before
// fails (AGENTS.md, "Nothing locks a project"). With no base, as on a push, nothing is new.
// On npm it holds as well that every entry of those lock files, deep in the tree too, comes from npm's registry with an
// integrity value (floor rule 7, "from a known publisher" and "one exact version"; #488, point 4): it fails one that
// points at a git address or another web address, or names no integrity value, and reports one the base held so. A
// package inside another's file, and a packed file of the project's own, are held by that file and by git. NuGet's lock
// files are held so by the NuGet check: its content hash, and its source at the restore.
//
// npm: the licence check's "lockfiles", each package that npm's registry gives (licences.mjs's registryName), read
// against every package-lock.json and npm-shrinkwrap.json of the base; NuGet (--nuget): its "nuget" lock files, read
// against every packages.lock.json and packages.<name>.lock.json of the base. A package from anywhere else is not
// looked up here. What a registry, or GitHub, answers is a publisher's text: it is printed on one line (guards.mjs's
// logged), and an answer of another shape is a lookup that failed. Repositories are asked of GitHub's API without a
// token, for the packages the project names itself alone (at most GITHUB_MOST), so the hour's limit is never reached.
// Node's own modules; run by the licence workflow (npm) and the NuGet workflow (--nuget).
//
//   node core/scripts/lookup.mjs <the licence check's config> [--nuget]
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, realpathSync } from "node:fs";
import path, { posix } from "node:path";
import { fileURLToPath } from "node:url";
import { leadsOut, logged, parseBounded } from "./guards.mjs";
import { baseOf, configAt, loadConfig, lockInstalled, registryName, textAt } from "./licences.mjs";
import { lockPackages, nugetConfig } from "./nuget.mjs";
import { copyOf, projectAt } from "./core-path.mjs";
import { started } from "./started.mjs";

export const YOUNG = 90;
export const GITHUB_MOST = 20;
const DAY = 86400000;
const NPM = "https://registry.npmjs.org/";
const registryOf = (nuget) => `${nuget ? "NuGet" : "the npm"} registry`;
const NUGET = "https://api.nuget.org/v3/registration5-gz-semver2/";
const NUGET_PAGES = 100;
// (a name as npm's registry gives one, an old one in capitals too: at most a scope and a name, nothing an address reads)
const NPM_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/iu;
const KINDS = ["dependencies", "optionalDependencies", "peerDependencies"];
const said = (value) => logged(String(value).slice(0, 200));
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const when = (text) => (typeof text === "string" && /^\d{4}-\d\d-\d\dT/u.test(text) ? Date.parse(text) : NaN);

// ---- What a lock file holds

// A lock file's text parsed, or an error that names the file and none of its text (a parser's message quotes it).
function parsed(text, lockPath) {
  try { return parseBounded(text); } catch { throw new Error(`${logged(lockPath)} cannot be read as JSON. Mend: write it anew with its package manager, never by hand`); }
}

/** The packages of an npm lock file's text that npm's registry gives: each { name, version, path, direct, brings }. */
export function npmPackages(text, lockPath) {
  const lock = parsed(text, lockPath), packages = lock?.packages;
  if (!packages || typeof packages !== "object" || Array.isArray(packages)) throw new Error(`${lockPath} holds no "packages". Mend: write it anew with npm, version 7 or later: its install, given --package-lock-only`);
  const own = new Set(Object.keys(packages).filter((p) => !lockInstalled(p)));
  // (what the project's own packages ask for, their development dependencies too, it names itself; what an installed
  // package asks for, its development dependencies left out, it brings)
  const names = (entry, kinds = KINDS) => kinds.flatMap((k) => (entry?.[k] && typeof entry[k] === "object" ? Object.keys(entry[k]) : []));
  const direct = new Set([...own].flatMap((p) => names(packages[p], [...KINDS, "devDependencies"]).map((n) => resolve(packages, p, n)).filter(Boolean)));
  const next = (at) => names(packages[at]).map((n) => resolve(packages, at, n)).filter(Boolean);
  const nameOf = (p) => entryName(packages[p], p);
  // (what a package brings, and which of the project's own brings it, are read only where they are asked, for a package
  // the pull request makes new, each by one walk of the graph: never a whole set kept for every package)
  let back = null;
  const before = (at) => {
    if (!back) { back = new Map(); for (const from of Object.keys(packages)) for (const to of next(from)) { if (!back.has(to)) back.set(to, []); back.get(to).push(from); } }
    return back.get(at) ?? [];
  };
  // (an entry from anywhere but npm's registry is kept too, marked with where it comes from: it is printed, never asked)
  return Object.entries(packages).filter(([p, e]) => lockInstalled(p) && e && typeof e === "object" && !e.link)
    .map(([p, e]) => ({ name: nameOf(p), ...(!e.resolved || registryName(e.resolved) ? {} : { from: source(e.resolved) }), version: String(e.version ?? ""), path: p, direct: direct.has(p),
      integrity: SRI.test(String(e.integrity ?? "")), sum: typeof e.integrity === "string" ? e.integrity : "", bundled: e.inBundle === true && !e.resolved, own: ownFile(e.resolved, lockPath), resolved: typeof e.resolved === "string" ? e.resolved : "",
      get brings() { return reach(p, next).size; },
      get by() { return direct.has(p) ? [] : [...reach(p, before)].filter((d) => direct.has(d)).map(nameOf); } }));
}

// An integrity value as npm writes and checks one: an algorithm it knows, then base64 (one that npm cannot read it
// does not check, so it counts as none).
const SRI = /^(?:sha512|sha384|sha256|sha1)-[A-Za-z0-9+/]{20,}={0,2}(?:\s+(?:sha512|sha384|sha256|sha1)-[A-Za-z0-9+/]{20,}={0,2})*$/u;

// Whether a lock entry's address is a packed file of the project's own, which git holds: `file:` and a path that stays
// inside the project from the lock file's folder.
function ownFile(resolved, lockPath) {
  if (typeof resolved !== "string" || !resolved.startsWith("file:")) return false;
  const to = posix.normalize(posix.join(posix.dirname(lockPath), resolved.slice(5)));
  return !posix.isAbsolute(resolved.slice(5)) && to !== ".." && !to.startsWith("../") && !/[\\:]/u.test(resolved.slice(5));
}

// Where an entry that npm's registry does not give comes from, in a few words for the report.
function source(resolved) {
  if (typeof resolved !== "string" || !resolved) return "no address the lock file names";
  if (/^(?:git\+|git:|github:|gitlab:|bitbucket:)/u.test(resolved)) return "a git address";
  if (resolved.startsWith("file:")) return "a packed file named by its path";
  const host = /^https?:\/\/([^/:@?#]{1,100})/u.exec(resolved)?.[1];
  return host ? `a web address on ${host}` : "an address of another kind";
}

// The name a lock entry at `path` installs: the one its registry address gives, or, for an entry with no "resolved" at
// all, which is npm's registry's as npm writes a lock file with that field left out (omit-lockfile-registry-resolved),
// its "name" where an alias gives one; else its folder's. An empty or null "resolved" is read so too: npm fetches it
// from the registry.
function entryName(entry, path) {
  const named = registryName(entry?.resolved);
  if (named) return named;
  if (!entry?.resolved && typeof entry?.name === "string" && entry.name) return entry.name;
  return path.slice(path.lastIndexOf("node_modules/") + 13);
}

// The lock entry that an install puts in place for `name`, as seen from the package at `from`: the nearest node_modules going up.
function resolve(packages, from, name) {
  for (let dir = from; ; dir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "") {
    const key = posix.join(dir, "node_modules", name);
    if (Object.hasOwn(packages, key)) return key;
    if (dir === "") return null;
  }
}

// Every node `next` leads to from `start`, itself left out.
function reach(start, next) {
  const seen = new Set([start]), todo = [start];
  while (todo.length) for (const n of next(todo.pop())) if (!seen.has(n)) { seen.add(n); todo.push(n); }
  seen.delete(start);
  return seen;
}

/** The packages of a NuGet lock file's text: each { name, version, path, direct, brings }, a framework's entries read together. */
export function nugetPackages(text, lockPath) {
  const { packages, failures } = lockPackages(text, lockPath);
  if (failures.length) throw new Error(failures[0]);
  const lock = parsed(text.replace(/^﻿/u, ""), lockPath), out = new Map();
  for (const entries of Object.values(lock.dependencies)) {
    const lower = new Map(Object.keys(entries).map((id) => [id.toLowerCase(), id]));
    const next = (id) => Object.keys(entries[id]?.dependencies ?? {}).map((d) => lower.get(d.toLowerCase())).filter(Boolean);
    const named = (id) => entries[id]?.type === "Direct" || entries[id]?.type === "CentralTransitive";
    // (as for npm: what a package brings, and what brings it, read only where asked, each by one walk, in each framework)
    let back = null;
    const before = (id) => {
      if (!back) { back = new Map(); for (const from of Object.keys(entries)) for (const to of next(from)) { if (!back.has(to)) back.set(to, []); back.get(to).push(from); } }
      return back.get(id) ?? [];
    };
    for (const { id, version } of packages) {
      const at = lower.get(id.toLowerCase()), entry = entries[at];
      if (!entry || entry.resolved !== version) continue;
      const was = out.get(id.toLowerCase()), seen = [...(was?.seen ?? []), { brings: () => reach(at, next).size, by: () => [...reach(at, before)].filter(named) }];
      out.set(id.toLowerCase(), { name: id, version, path: id, direct: (was?.direct ?? false) || entry.type !== "Transitive", seen,
        get brings() { return Math.max(0, ...seen.map((f) => f.brings())); },
        get by() { return [...new Set(seen.flatMap((f) => f.by()))]; } });
    }
  }
  return [...out.values()];
}

// ---- What is new

/** The packages of `head` (lists of packages, one for each lock file) whose name no list of `base` holds, one for each
 *  name, its lock file named: npm's names as written, NuGet's in any case. */
export function newPackages(head, base, nuget = false) {
  // (an entry from elsewhere than the registry is kept apart from one of the same name the registry gives, so that it
  // never stands in for the one the lookup asks of)
  const key = (p) => `${nuget ? p.name.toLowerCase() : p.name}${p.from ? "\u0000from" : ""}`;
  // (a registry name is held only by the base's registry entry: a name the base took from git, which the pull request
  // now takes from the registry, may be another publisher's package, and is looked up)
  const held = new Set(base.flat().map(key)), out = new Map();
  for (const [lockPath, packages] of head) for (const p of packages) {
    if (held.has(key(p))) continue;
    const was = out.get(key(p));
    if (!was || (p.direct && !was.direct)) out.set(key(p), { ...p, lockPath });
  }
  return [...out.values()];
}

// ---- Where each comes from (floor rule 7, "from a known publisher" and "one exact version"; #488, point 4)

/** What keeps an npm lock entry from being npm's registry's own, held to what was locked: the address it comes from
 *  instead, or that it names no integrity value npm reads; null where it is the registry's with one, and for a package
 *  inside another's file (inBundle, and naming no address of its own, since npm fetches one that names one: the mark
 *  alone is the lock file's word), which that file's integrity holds, or a packed file of the project's own, which git
 *  holds. */
export function offRegistry(p) {
  if (p.bundled || p.own) return null;
  if (p.from) return `it comes from ${p.from}, not npm's registry`;
  return p.integrity ? null : "it names no integrity value, so an install cannot hold it to what was locked";
}

/** Each entry of the lock files `head` that offRegistry finds: { failures, reports }, one the base's lock files held
 *  the same (its name, version, address and integrity value, and the same fault), as often, reported, never failed (AGENTS.md,
 *  "Nothing locks a project"): another address, or one more entry of the same, fails. */
export function sourceFaults(head, base) {
  // (its integrity value too, so that one taken off, or changed, beside a held address is no longer the base's)
  const key = (p) => `${p.name}@${p.version}\u0000${p.resolved ?? ""}\u0000${p.sum ?? ""}\u0000${offRegistry(p)}`;
  const left = new Map(), failures = [], reports = [];
  for (const p of base.flat().filter(offRegistry)) left.set(key(p), (left.get(key(p)) ?? 0) + 1);
  for (const [lockPath, packages] of head) for (const p of packages) {
    const fault = offRegistry(p);
    if (!fault) continue;
    const n = left.get(key(p)) ?? 0;
    left.set(key(p), n - 1);
    const at = `${said(lockPath)}: ${said(p.name)}@${said(p.version)} (at ${said(p.path)}): ${said(fault)}`;
    const mend = `take ${said(p.name)} from npm's registry at one exact version, by npm's own install in the lock file's folder with --save-exact and --ignore-scripts (for one another package brings, a version of that package which takes it from the registry), so that npm writes its address and integrity value; never edit the lock file by hand`;
    if (n > 0) reports.push(`${at}; the pull request's base held it so, so it passes: ${mend}, as the sync's step asks`);
    else failures.push(`${at} (floor rule 7). Mend: ${mend}`);
  }
  return { failures: failures.sort(), reports: reports.sort() };
}

// ---- What the registry says

/** What npm's registry says of the package `name` at `version`, from its answer `doc`: { facts, repo } or { missing }. */
export function npmFacts(doc, version) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) throw new Error("its answer is no JSON object");
  const time = doc.time && typeof doc.time === "object" ? doc.time : {};
  if (time.unpublished || !doc.versions || typeof doc.versions !== "object") return { missing: "its versions were taken off the registry" };
  const created = when(time.created);
  if (Number.isNaN(created)) throw new Error("its answer gives no date it was first published");
  const releases = Object.entries(time).filter(([k]) => k !== "created" && k !== "modified").map(([, v]) => when(v)).filter((t) => !Number.isNaN(t));
  return { first: created, last: releases.length ? Math.max(...releases) : created, has: Object.hasOwn(doc.versions, version), ...ofVersion(doc, version) };
}

// What the document says of the one version: its repository, its publisher and whether it has provenance.
function ofVersion(doc, version) {
  const v = doc.versions[version] && typeof doc.versions[version] === "object" ? doc.versions[version] : {};
  return { repo: repository(v.repository ?? doc.repository), publisher: typeof v._npmUser?.name === "string" ? v._npmUser.name : "not named",
    provenance: v.dist?.attestations?.provenance ? "yes" : "no" };
}

/** The repository a package names, as { url, owner, name, dir } where it is on GitHub, { url } elsewhere, or null. */
export function repository(field) {
  const url = typeof field === "string" ? field : typeof field?.url === "string" ? field.url : null;
  if (!url) return null;
  const dir = typeof field?.directory === "string" && /^[\w./-]{1,200}$/u.test(field.directory) && !field.directory.split("/").includes("..") ? field.directory.replace(/^\.?\/+|\/+$/gu, "") : "";
  const gh = /^(?:git\+)?(?:https?|git|ssh):\/\/(?:git@)?github\.com\/([\w.-]{1,100})\/([\w.-]{1,100}?)(?:\.git)?\/?$/u.exec(url) ?? /^(?:github:)?([\w.-]{1,100})\/([\w.-]{1,100})$/u.exec(url);
  return gh && ![gh[1], gh[2]].some((part) => part === "." || part === "..") ? { url: `github.com/${gh[1]}/${gh[2]}`, owner: gh[1], name: gh[2], dir } : { url };
}

/** What NuGet's registry says of a package, from its registration index and the pages `page(item)` gives. */
export async function nugetFacts(index, page) {
  if (!index || !Array.isArray(index.items) || !index.items.length) throw new Error("its answer holds no pages of versions");
  if (index.items.length > NUGET_PAGES) throw new Error(`its answer holds more than ${NUGET_PAGES} pages of versions`);
  // (every page is read: pages are bounded by version, not by date, so a lower version may be the newer; an unlisted
  // version's date, 1900, is no date)
  const leaves = [];
  for (const item of index.items) leaves.push(...(await page(item)));
  const dated = leaves.map((l) => ({ entry: l?.catalogEntry, at: when(l?.catalogEntry?.published) })).filter((l) => !Number.isNaN(l.at) && new Date(l.at).getUTCFullYear() > 1900);
  if (!dated.length) throw new Error("its answer gives no date any version was published");
  const first = Math.min(...dated.map((l) => l.at)), last = Math.max(...dated.map((l) => l.at));
  const entry = dated.find((l) => l.at === last)?.entry ?? null;
  const versions = new Set(leaves.map((l) => (typeof l?.catalogEntry?.version === "string" ? l.catalogEntry.version.toLowerCase() : null)).filter(Boolean));
  const project = typeof entry?.projectUrl === "string" ? entry.projectUrl : null;
  return { first, last, versions, repo: project ? repository(project) : null, publisher: typeof entry?.authors === "string" ? `${entry.authors} (as the package writes its authors)` : "not named", provenance: "not offered by NuGet's registry" };
}

// ---- The lookup

/** Each new package looked up with `get(url)` ({ status, json }): { failures, reports }, as of `now`. */
export async function lookUp(packages, { get, now = Date.now(), nuget = false, sources = 0 }) {
  const failures = [], reports = [], github = { asked: 0 };
  await pool(packages, 8, async (p) => {
    const at = `${said(p.lockPath)}: ${said(p.name)}@${said(p.version)}`, where = registryOf(nuget);
    if (p.from) { reports.push(`${at}: not from ${where} but from ${said(p.from)}, so not looked up: the review reads where it comes from`); return; }
    let facts;
    try { facts = await registry(p, get, nuget, sources); } catch (e) {
      failures.push(`${at}: ${where} could not be read (${said(e.message)}). Mend: run the job again; if it fails the same way, say so in the pull request and leave the package out until it passes`);
      return;
    }
    if (facts.elsewhere) { reports.push(`${at}: not in ${where} at this version, so from a source the config names, which the lookup does not read; the NuGet check holds it to the lock file's content hash`); return; }
    if (facts.missing) { failures.push(`${at}: ${where} has no such package (${facts.missing}). Mend: take it out of the project's package list and its lock file, and name a package the registry has: a name a model gave may be one nobody published, or one someone registered to be taken`); return; }
    const young = tooYoung(p, facts, now);
    if (young) failures.push(`${at}: ${young}`);
    reports.push(`${at}: ${await described(p, facts, now, { get, nuget, github })}`);
  });
  return { failures: failures.sort(), reports: reports.sort() };
}

const brought = (p) => (p.by ?? []).map(said).join(", ");

// Where a package was first published under YOUNG days before `now`, what is wrong and its mend: for one the project
// names, take another or wait; for one another brings, hold what brings it or take a version of that which does not.
function tooYoung(p, facts, now) {
  const age = Math.floor((now - facts.first) / DAY), until = day(facts.first + YOUNG * DAY), by = brought(p);
  if (age >= YOUNG) return null;
  const mend = p.direct ? `take a package that does the job and was first published ${YOUNG} days ago or more, or wait until ${until} to add this one`
    : `hold the change that brings it${by ? ` (to ${by})` : ""} until ${until}, or take a version of ${by || "what brings it"} that does not bring it`;
  return `first published ${day(facts.first)}, ${age} days ago, under the ${YOUNG} days floor rule 15 asks. Mend: ${mend}`;
}

// What the review is shown of one package, GitHub asked only of one the project names, and of GITHUB_MOST at most.
async function described(p, facts, now, { get, nuget, github }) {
  const age = Math.floor((now - facts.first) / DAY);
  let repo = facts.repo ? said(facts.repo.url) : "not named";
  if (p.direct && facts.repo?.owner) repo += github.asked++ < GITHUB_MOST ? await onGitHub(facts.repo, p.name, get, nuget) : `, GitHub not asked: past the ${GITHUB_MOST} packages a lookup asks of it`;
  return `${p.direct ? "named by the project" : `brought by ${brought(p) || "another"}`}; first published ${day(facts.first)} (${age} days ago); last release ${day(facts.last)}; repository ${repo}; published by ${said(facts.publisher)}; brings ${p.brings} package${p.brings === 1 ? "" : "s"} with it; provenance: ${facts.provenance}`;
}

// What the registry says of the package: its facts, { missing } where it has no such package, or, on NuGet where the
// config names sources of its own, { elsewhere } where NuGet's registry has no such id or version, which one of those
// gives (the NuGet check holds what is restored to the lock file's content hash).
export async function registry(p, get, nuget, sources = 0) {
  if (!nuget) {
    if (!NPM_NAME.test(p.name)) throw new Error("its name is not one npm's registry gives");
    const r = await get(`${NPM}${p.name.replaceAll("/", "%2F")}`);
    if (r.status === 404) return { missing: "the registry answers that it knows no such name" };
    if (r.status !== 200) throw new Error(`it answered ${r.status}`);
    return npmFacts(r.json, p.version);
  }
  const r = await get(`${NUGET}${encodeURIComponent(p.name.toLowerCase())}/index.json`);
  if (r.status === 404) return sources ? { elsewhere: true } : { missing: "the registry answers that it knows no such id" };
  if (r.status !== 200) throw new Error(`it answered ${r.status}`);
  const facts = await nugetFacts(r.json, async (item) => {
    if (Array.isArray(item?.items)) return item.items;
    // (a page's address is built here from the bounds the index gives, and the index must name that same page: no
    // address an answer gives is fetched, floor rule 5)
    const bound = (v) => (typeof v === "string" && /^[0-9A-Za-z.+-]{1,100}$/u.test(v) ? v.toLowerCase() : null);
    const lower = bound(item?.lower), upper = bound(item?.upper);
    const at = lower && upper ? `${NUGET}${encodeURIComponent(p.name.toLowerCase())}/page/${lower}/${upper}.json` : null;
    if (!at || String(item?.["@id"]).toLowerCase() !== at) throw new Error("a page of its versions lies outside the registry, or is named in a form it does not know");
    const page = await get(at);
    if (page.status !== 200 || !Array.isArray(page.json?.items)) throw new Error(`a page of its versions answered ${page.status}`);
    return page.json.items;
  });
  if (facts.versions.has(p.version.toLowerCase())) return facts;
  return sources ? { elsewhere: true } : { missing: `the registry knows the id, and no version ${said(p.version)} of it` };
}

// Whether the repository is archived, and, on npm, whether its package.json (in the folder the package names) names
// the package back: as text for the report.
async function onGitHub(repo, name, get, nuget) {
  const is = await archived(repo, get);
  const said = is === true ? ", archived" : is === false ? ", not archived" : is === "unknown" ? ", which GitHub does not show" : ", archived or not: GitHub did not answer";
  if (nuget) return said;
  const file = await get(`https://raw.githubusercontent.com/${repo.owner}/${repo.name}/HEAD/${repo.dir ? `${repo.dir}/` : ""}package.json`).catch(() => ({ status: 0 }));
  return `${said}, ${file.status === 200 && file.json?.name === name ? "naming the package back" : "not naming the package back where it says"}`;
}

/** Whether GitHub shows the repository `repo` ({ owner, name }) archived: true or false, "unknown" where it does not
 *  show it, null where it did not answer. */
export async function archived(repo, get) {
  const r = await get(`https://api.github.com/repos/${repo.owner}/${repo.name}`).catch(() => ({ status: 0 }));
  return r.status === 200 && typeof r.json?.archived === "boolean" ? r.json.archived : r.status === 404 ? "unknown" : null;
}

export async function pool(items, size, work) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => { while (queue.length) await work(queue.shift()); }));
}

// ---- The project

/** The lock files of `nuget` or npm the config names, and the base's own of the same kind, each read to packages. */
/** The lock files of `nuget` or npm the config names, each read to packages, and the base's: those the config as the
 *  base held it named (`baseConfig`), as the base held them. Only a lock file the base's own config named counts as
 *  held, so no file merged as data first, and named in the config only by the pull request, makes a name count as held:
 *  a lock file the pull request newly names is new, and each of its packages is looked up. */
export function packagesOf(config, root, base, nuget, baseConfig = null) {
  const named = (c) => { try { return nuget ? [...nugetConfig(c, copyOf(root)).ships, ...nugetConfig(c, copyOf(root)).tools] : Array.isArray(c?.lockfiles) ? c.lockfiles : []; } catch { return []; } };
  const read = nuget ? nugetPackages : npmPackages;
  const head = named(config).map((f) => {
    // (a lock file the pull request makes a link out of the project is never read: floor rule 5)
    if (leadsOut(root, posix.join(root, f))) throw new Error(`${logged(f)} leads out of the project, through a link. Mend: make it a file of the project's own, written by its package manager`);
    return [f, read(readFileSync(posix.join(root, f), "utf8"), f)];
  });
  const baseFiles = [...new Set(named(baseConfig).map((f) => posix.normalize(f)))];
  const baseLists = baseFiles.map((f) => { try { return read(textAt(root, base, f) ?? "", f); } catch { return []; } });
  return { head, base: baseLists };
}

export async function fetched(url) {
  const r = await fetch(url, { headers: { "user-agent": "agent-core-lookup", accept: "application/json" }, signal: AbortSignal.timeout(30000) });
  if (r.status !== 200) return { status: r.status };
  return { status: 200, json: parseBounded(await r.text()) };
}

// A folder by the system's own spelling of it (on Windows, a short name made long), or as given where it cannot be read.
const native = (dir) => { try { return realpathSync.native(dir); } catch { return dir; } };

const mended = (message, mend) => (/Mend: /u.test(message) ? message : `${message}. Mend: ${mend}`);

/** The check on the project at `root`, read against `base` (a commit, or null), its config at `configPath` as the
 *  working folder names it: { lines, code }, each line as the workflow prints it. */
export async function run(configPath, { root, base, nuget = false, get = fetched, now = Date.now(), event = process.env.GITHUB_EVENT_NAME }) {
  if (!base && event?.startsWith("pull_request")) return { lines: ["FAIL: this is a pull request, and its checkout holds no base to read it against, so the lookup would read nothing. Mend: give the job's checkout fetch-depth: 2 (the pull request merged into its base, with both parents)"], code: 1 };
  if (!base) return { lines: ["ok   no pull request's base here, so no package is new: nothing looked up"], code: 0 };
  let found, head, held, sources = 0;
  try {
    // (the config is the pull request's: a link out of the project is refused before it is opened, and loadConfig's
    // error quotes none of its text; the project's folder and the config's are each read by the system's own spelling,
    // since on Windows one folder may be named short or long)
    if (leadsOut(native(root), path.join(native(path.dirname(path.resolve(configPath))), path.basename(configPath)))) throw new Error(`the config ${logged(configPath)} leads out of the project, through a link. Mend: make it a file of the project's own`);
    const config = loadConfig(configPath);
    ({ head, base: held } = packagesOf(config, root, base, nuget, configAt(root, base, configPath)));
    found = newPackages(head, held, nuget);
    if (nuget) sources = nugetConfig(config, copyOf(root)).sources.length;
  } catch (e) { return { lines: [`FAIL: ${logged(mended(e.message, "write the config as JSON, and each lock file it names anew with its package manager, never by hand"))}`], code: 1 }; }
  const { failures, reports } = await lookUp(found, { get, now, nuget, sources });
  // (on NuGet the lock file's content hash is held by the NuGet check, and where each package comes from by its restore)
  const sourced = nuget ? { failures: [], reports: [] } : sourceFaults(head, held);
  const s = found.length === 1 ? "" : "s", off = sourced.failures.length;
  return { lines: [...reports.map((r) => `REPORT: ${r}`), ...sourced.reports.map((r) => `REPORT: ${r}`), ...failures.map((f) => `FAIL: ${f}`), ...sourced.failures.map((f) => `FAIL: ${f}`),
    failures.length ? `${failures.length} of ${found.length} new package${s} fail the lookup (floor rule 15)` : `ok   ${found.length} new package${s} looked up in ${registryOf(nuget)}, each printed above for the review`,
    ...(off ? [`${off} lock entr${off === 1 ? "y" : "ies"} the pull request brings not from npm's registry with an integrity value (floor rule 7)`] : [])], code: failures.length || off ? 1 : 0 };
}

/** What the lookup printed, for the review, also on the run's summary page, where a reviewer finds it beside the checks. */
export function summarise(lines, nuget) {
  if (!process.env.GITHUB_STEP_SUMMARY || lines.length <= 1) return;
  try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### The lookup${nuget ? " (NuGet)" : ""}\n\n${lines.map((l) => `- ${l.replace(/[<>&`*_[\]|]/gu, "?")}`).join("\n")}\n`); } catch { /* (a summary is a convenience: the log holds every line) */ }
}

// The pull request's base as its workflow names it (LOOKUP_BASE, from the event's base commit), where the checkout holds
// that commit: a checkout of the head alone, or of a head that merges main, would read no base, or the pull request's
// own earlier commit as its first parent.
export function namedBase(root) {
  const sha = process.env.LOOKUP_BASE;
  if (typeof sha !== "string" || !/^[0-9a-f]{40}$/u.test(sha)) return null;
  try { execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: root, stdio: "ignore" }); return sha; } catch { return null; }
}

if (started(import.meta.url)) {
  const configPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!configPath) { console.error("FAIL: no config was named. Mend: name it: node core/scripts/lookup.mjs <the licence check's config> [--nuget]"); process.exit(1); }
  let root;
  try { root = projectAt(fileURLToPath(new URL(".", import.meta.url))).root || execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: fileURLToPath(new URL(".", import.meta.url)), encoding: "utf8" }).trim(); }
  catch (e) { console.error(`FAIL: ${logged(e.message)}. Mend: run it from the project's root, a git repository`); process.exit(1); }
  const nuget = process.argv.includes("--nuget");
  const { lines, code } = await run(configPath, { root, base: namedBase(root) ?? baseOf(root), nuget });
  for (const line of lines) (line.startsWith("FAIL") ? console.error : console.log)(line);
  summarise(lines, nuget);
  process.exit(code);
}
