#!/usr/bin/env node
// The week's wait on each package a change brings or updates in the core's lock files (floor rule 7), apart from
// tests/packages-test.mjs so that test runs with the network cut off (#772): npm ci installs a lock file as it is
// written, the tarball its entry's address names, so the .npmrc's wait holds only what npm resolves itself. Each entry
// new, or other in its version, address or integrity than at the base (the merge's first parent, or PACKAGES_BASE), is
// asked of npm's registry for the date of the version its address names, which must be its version field too. Run
// as a check it asks the registry (the step of the core's tests workflow that runs it names its own shell); the test
// imports `tooYoung` and holds it on answers made there.
//
//   node scripts/week-wait.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registryName, registryVersion } from "./licences.mjs";
import { fetched } from "./lookup.mjs";
import { ENTRY_FIELDS as FIELDS } from "./packages.mjs";
import { started } from "./started.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const WEEK = 7 * 86400000;
// (an entry as a whole, its keys in order, so that a change of any field is seen; and the fields an entry fetched from
// the registry carries: one that links a folder, or is bundled in another, or carries any other field, is refused)
const whole = e => JSON.stringify(Object.keys(e ?? {}).sort().map(k => [k, e[k]]));
const same = (a, b) => Boolean(a) && whole(a) === whole(b);
const SAID = ["dependencies", "optionalDependencies", "peerDependencies", "peerDependenciesMeta", "license"];
const KEY = /^(?:node_modules\/(?:@[\w~-][\w.~-]*\/)?[\w~-][\w.~-]*\/)*node_modules\/(?:@[\w~-][\w.~-]*\/)?[\w~-][\w.~-]*$/u;
const NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/u;
// (what is wrong with an entry by its own words alone, before the registry is asked: its key and fields, the address it
// fetches from and the folder it installs in; else the package and version its address names)
function entryFault(k, e) {
  const odd = Object.keys(e).filter(f => !FIELDS.has(f));
  if (!KEY.test(k) || odd.length) return { fault: `${k}: ${odd.length ? `its field${odd.length === 1 ? "" : "s"} ${odd.join(", ")}, which no package fetched from the registry carries` : "a key that names no installed package's folder"}` };
  const name = registryName(e.resolved), version = registryVersion(e.resolved);
  // (an address in its one plain form alone, a name as npm spells one: never one a URL parser reads otherwise)
  const plainAddress = (() => { try { return new URL(e.resolved).href === e.resolved; } catch { return false; } })();
  if (!name || !version || version !== e.version || !plainAddress || !NAME.test(name)) {
    return { fault: `${k}: its address names ${name ?? "no package of npm's registry"} at ${version ?? "no version"}${plainAddress ? "" : " in no plain form"}, and its version field ${e.version ?? "none"}` };
  }
  // (the folder npm installs it in is named for the package its address fetches, so the lock file reads as it installs)
  if (k.slice(k.lastIndexOf("node_modules/") + "node_modules/".length) !== name) return { fault: `${k}: its folder names another package than its address fetches, ${name}` };
  return { name, version };
}
// (what the registry's document says against the entry: the very tarball npm ci installs, what the entry says it depends
// on and its licence, which are the registry's own for that version, since a spec of its own could name a source npm
// would fetch in place of what the lock file names; then the date)
function registryFault(name, version, e, doc, now) {
  const dist = doc.json?.name === name ? doc.json?.versions?.[version]?.dist : undefined;
  if (doc.status === 200 && (dist?.tarball !== e.resolved || dist?.integrity !== e.integrity)) return `${name}@${version}: the registry gives another address or integrity for it than the lock file`;
  const meta = doc.json?.versions?.[version] ?? {};
  const said = SAID.filter(f => (e[f] !== undefined || (f === "license" && meta[f] !== undefined)) && whole(e[f]) !== whole(meta[f]));
  if (doc.status === 200 && said.length) return `${name}@${version}: its ${said.join(", ")} not the registry's for that version`;
  const at = Date.parse(doc.json?.time?.[version] ?? "");
  if (now - at >= WEEK) return null;
  return `${name}@${version}: ${doc.status === 200 ? (Number.isNaN(at) ? "the registry gives no date" : `published ${new Date(at).toISOString()}`) : `the registry answered ${doc.status}`}`;
}
// (each entry that fails, with what is wrong; `ask(name)` gives the registry's document of a package, as fetched does)
export const tooYoung = async (packages, base, ask, now) => {
  const out = [];
  for (const [k, e] of Object.entries(packages ?? {})) {
    if (!k || same(base[k], e)) continue;
    const { fault, name, version } = entryFault(k, e);
    const said = fault ?? registryFault(name, version, e, await ask(name).catch(err => ({ status: err.message })), now);
    if (said) out.push(said);
  }
  return out;
};

// (the failure, on one line with its mend)
export const failure = young => `FAIL each package the change brings or updates in the lock file is a week old or more by the registry's date (floor rule 7): ${young.join("; ")}. Mend: wait until the version is a week old and run the job again, or take the version before it, its lock entry written by npm's own install; where the registry did not answer, run the job again`;

if (started(import.meta.url)) {
  const json = f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
  // (every install's lock, each entry against what any lock at the base held, so a package moved from one install to
  // another at the same version is no new one, and one the parser's lock brings or updates is held as the first's: #719)
  const locks = [".packages/package-lock.json", ".packages/parser/package-lock.json"];
  const base = {};
  for (const f of locks) try { Object.assign(base, JSON.parse(execFileSync("git", ["show", `${process.env.PACKAGES_BASE || "HEAD^1"}:${f}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).packages ?? {}); } catch { /* (no such lock file at the base: its entries are new) */ }
  // (the day the week is counted to, handed in: the run's own date, or PACKAGES_TODAY's; nothing else reads the clock)
  const today = Date.parse(process.env.PACKAGES_TODAY || new Date().toISOString());
  const young = [];
  for (const f of locks) young.push(...await tooYoung(json(f).packages, base, name => fetched(`https://registry.npmjs.org/${name.replaceAll("/", "%2f")}`), today));
  if (young.length) {
    console.log(failure(young));
    process.exit(1);
  }
  console.log("ok   each package the change brings or updates in the lock file is a week old or more by the registry's date (floor rule 7)");
}
