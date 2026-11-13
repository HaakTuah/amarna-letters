// The NuGet check (floor rules 7 and 10, in floor/topics.md beside this folder), for a project whose packages come
// from NuGet (.NET): every package its lock files install, the ones packages pull in included, is one exact version
// and under a licence on its list. It reads two things, both NuGet's own: the project's lock files
// (packages.lock.json, which a project writes once it sets RestorePackagesWithLockFile), and each installed package's
// own manifest (its .nuspec) in the folder a restore from those lock files filled, so a package's licence is read
// from the package NuGet checked, never from a second place. It holds:
//   - that every project file git knows (.csproj, .fsproj, .vbproj) has its lock file beside it, and that every lock
//     file is named in the config as one whose packages ship or as one of tools that only run, so no project's
//     packages go unread. A lock file under another name (packages.<project>.lock.json, which NuGet takes before the
//     plain one, or a NuGetLockFilePath a project or build file names; the workflow's restore also sets that
//     property empty for every project, wherever it was set) fails, and so do the older packages.config, which has
//     none, and a response file that gives every build options this check cannot read (Directory.Build.rsp);
//   - floor rule 7's "one exact version, never a range": what a project asks for is, letter for letter, the version
//     its lock installs (NuGet writes a plain Version="1.2.3" as "[1.2.3, )", which with a lock file is that version);
//   - floor rule 10: a package whose manifest names its licence as an SPDX expression is held to its list by that
//     (what ships to the floor's, a tool that only runs to the tools': policy, in licences.mjs). One whose manifest
//     names a licence file, an address or nothing has no licence a machine can read: it passes only with an entry in
//     the project's audit named <Id>@<version>, of "kind": "nuget", the licence read by hand, which the licence check
//     then holds to its list like any entry. A new version needs a new entry, so a licence that changes with a version
//     is read again, and an entry no package needs any more fails;
//   - "one the owner wants anyway waits for the owner's yes" (floor rule 10): a package off its list passes only where
//     the config's "accepted" names that exact version with what it is under (an SPDX id this check knows, or
//     LicenseRef-<a name for it>, so that a machine can read it), whether it ships, the owner's words for it and,
//     where it ships, its notice; a yes for a tool is no yes for what ships, and no yes takes in terms the
//     floor never allows, by what the manifest, the audit or the entry itself says. It is named there alone: an audit
//     entry for it too would be held to the list by the licence check, so the two together fail here. An accepted
//     version nothing installs any more fails, so the list only shrinks by itself;
//   - what the restore brought and no lock file read here names (a targeting pack, a PackageDownload, an SDK a project
//     file names): its licence is held to the list for what ships all the same, by its manifest, the audit or a yes.
// What it does not hold: that the lock files are what a restore gives today (the workflow that runs this,
// .github/workflows/nuget.yml, restores each project file this script lists with --locked-mode first, which fails
// where they are not: floor rule 15); the version and the content hash of what no lock file names, which the SDK or a
// project file fixes and no lock file holds; a package taken from a fallback folder that a NuGet.Config names, which a
// restore does not copy into the folder read here (one a lock file names then fails as not restored; one that none
// names goes unseen, and such a folder stands in the pull request for the reviews to see); whether the owner said
// what "accepted"
// quotes, which the reviews hold, the config being a protected file; a project of another kind than the three above,
// and a tool a manifest of dotnet's names (.config/dotnet-tools.json), which no restore here brings; and what no lock
// file names at all (a tool a script installs, a font, an image), which the licence check's audit and scan hold. A
// restore runs the project's own build files, a pull request's too, which could change anything in the job this
// runs in, this script and the manifests included: what a pull request does to its project files is the reviews' to
// read, as with every check that builds.
// A manifest is read as the XML it is, by the one licence element under its one metadata part, as NuGet finds it,
// and only in the plain form every real manifest has: anything else (a document type, a manifest that is not well
// formed, two such parts or elements, a name that is not plain ASCII or has a prefix, a namespace declared anywhere
// but on the root, an expression with a comment, CDATA or an entity inside it) counts as no readable licence, since a
// reader of XML may find another element there than this one does.
// Node's own modules only, and no network: the restore brought the manifests. It checks the project it lies in
// (core/scripts/ there), whatever the directory it is started from; the config's own path is read from that directory.
//
//   node core/scripts/nuget.mjs <config> --packages <the folder the restore filled> [--advisory]
//   node core/scripts/nuget.mjs --projects     the project files git knows, a line each: what the workflow restores
//
// The config is the licence check's (licences.mjs), with one key more, "nuget": { "ships": the lock files whose
// packages ship, "tools": those of projects that only run (tests, tools), "accepted": [{ "package": "<Id>@<version>",
// "licence": what it is under, as an SPDX expression or LicenseRef-<name>, "ships": true or false, "yes": the owner's
// words and their date, "notice": its notice, where it ships }] }. With --advisory it says what it would fail and passes, for a project's first weeks with it.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { NEVER, licenceOk, loadConfig, policy } from "./licences.mjs";
import { started } from "./started.mjs";

const PROJECT = /\.(?:cs|fs|vb)proj$/iu;
const LOCK = "packages.lock.json";
const OTHER_LOCK = /^packages\..+\.lock\.json$/iu; // NuGet takes packages.<project>.lock.json before the plain one
const BUILD_FILE = /\.(?:cs|fs|vb)proj$|\.props$|\.targets$/iu; // where a project can name another lock file
const RESPONSE_FILE = /^(?:Directory\.Build|MSBuild)\.rsp$/iu; // options MSBuild gives every build of the folder
const ID = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$/u; // a package's id, as NuGet takes one
const VERSION = /^[0-9][0-9A-Za-z.+-]{0,99}$/u; // a version as a lock file writes one
const key = (id, version) => `${id}@${version}`.toLowerCase();
const CUT = "\u0000"; // stands where a comment, CDATA or a processing instruction was cut from a manifest: no XML holds it
// (what a lock file, a manifest or a file's name holds is shown on one line: none of it starts a line of its own)
const shown = (text) => String(text).replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/gu, "?");

/** The config's "nuget", checked: { ships, tools, accepted }. A key or a shape it does not know would check less. */
export function nugetConfig(config) {
  const nuget = config?.nuget;
  if (!nuget || typeof nuget !== "object" || Array.isArray(nuget)) throw new Error('the config has no "nuget": { "ships": [...], "tools": [...] }');
  const odd = Object.keys(nuget).filter((k) => !["ships", "tools", "accepted"].includes(k));
  if (odd.length) throw new Error(`the config's "nuget" holds keys it does not know: ${odd.join(", ")}`);
  const paths = (name) => {
    const v = nuget[name] ?? [];
    const ok = (p) => typeof p === "string" && posix.normalize(p) === p && posix.basename(p) === LOCK && !p.startsWith("/") && !p.startsWith("../");
    if (!Array.isArray(v) || !v.every(ok)) throw new Error(`the config's "nuget.${name}" is not a list of ${LOCK} files in the project, each written as git lists it`);
    return v;
  };
  const ships = paths("ships"), tools = paths("tools");
  const twice = ships.filter((p) => tools.includes(p)).concat(ships.filter((p, i) => ships.indexOf(p) !== i), tools.filter((p, i) => tools.indexOf(p) !== i));
  if (twice.length) throw new Error(`the config's "nuget" names a lock file twice: ${[...new Set(twice)].join(", ")}`);
  const accepted = nuget.accepted ?? [];
  const whole = (a) => a && typeof a === "object" && !Array.isArray(a) && Object.keys(a).every((k) => ["package", "licence", "ships", "yes", "notice"].includes(k))
    && [a.package, a.licence, a.yes].every((s) => typeof s === "string" && s.trim()) && /^[^@\s]+@[^@\s]+$/u.test(a.package)
    && typeof a.ships === "boolean" && (a.notice === undefined || typeof a.notice === "string");
  if (!Array.isArray(accepted) || !accepted.every(whole)) throw new Error('the config\'s "nuget.accepted" is not a list of { "package": "<Id>@<version>", "licence": ..., "ships": true or false, "yes": ..., and "notice" where it ships }');
  const again = accepted.map((a) => a.package.toLowerCase()).filter((p, i, all) => all.indexOf(p) !== i);
  if (again.length) throw new Error(`the config's "nuget.accepted" names a package twice: ${again.join(", ")}`);
  return { ships, tools, accepted };
}

/**
 * The packages one lock file installs, as { id, version }, and what is wrong with it as lines. A project's own
 * projects (type "Project") are no packages. What a project asks for itself must be the version installed.
 */
export function lockPackages(text, lockPath) {
  const failures = [], packages = new Map();
  let lock;
  try { lock = JSON.parse(text); } catch { return { packages: [], failures: [`${lockPath} is not JSON`] }; }
  if (![1, 2].includes(lock?.version) || !lock.dependencies || typeof lock.dependencies !== "object" || Array.isArray(lock.dependencies)) {
    return { packages: [], failures: [`${lockPath} is no lock file this check knows (NuGet's version 1 or 2, with "dependencies")`] };
  }
  for (const [framework, entries] of Object.entries(lock.dependencies)) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) { failures.push(`${lockPath}, ${framework}: not a list of packages`); continue; }
    for (const [id, entry] of Object.entries(entries)) {
      const at = `${lockPath}, ${framework}: ${id}`;
      if (entry?.type === "Project") continue;
      if (!["Direct", "Transitive", "CentralTransitive"].includes(entry?.type)) { failures.push(`${at}: a kind of entry this check does not know (${JSON.stringify(entry?.type)})`); continue; }
      const { resolved, requested, contentHash } = entry;
      if (!ID.test(id) || typeof resolved !== "string" || !VERSION.test(resolved)) { failures.push(`${at}: no package id and installed version it can read`); continue; }
      if (typeof contentHash !== "string" || !contentHash) failures.push(`${at}: no content hash, so a restore cannot hold it to the package it was (floor rule 15)`);
      if (entry.type !== "Transitive" && ![`[${resolved}, )`, `[${resolved}]`, `[${resolved}, ${resolved}]`].includes(requested)) {
        failures.push(`${at}: the project asks for ${typeof requested === "string" ? requested : "no version it can read"} and the lock installs ${resolved}: ask for one exact version, the one installed (floor rule 7)`);
      }
      packages.set(key(id, resolved), { id, version: resolved });
    }
  }
  return { packages: [...packages.values()], failures: failures.map(shown) };
}

/**
 * The licence a package's manifest (its .nuspec, as text) names: { expression } for an SPDX expression, { other }
 * (a word for what it has instead: "a licence file", "an address", "nothing") where a machine cannot read one.
 * Read as XML, the way NuGet finds it: comments, CDATA and processing instructions are no elements, and the licence
 * is the one `license` element directly under the one `metadata` under the one root, `package`. A document type, a
 * manifest that is not well formed, a second root, metadata or licence, an element whose name is not plain ASCII or
 * has a prefix, or a namespace declared on any element but the root (each of which a reader of XML may take for
 * another element than this one does: NuGet goes by an element's local name and its namespace) give no licence it
 * will trust; nor does an expression with a cut-out part inside it, since CDATA there is part of the expression a
 * reader of XML sees.
 */
export function manifestLicence(text) {
  const unread = { other: "a manifest it will not read" }, malformed = { other: "a manifest that is not well formed" };
  if (typeof text !== "string" || /<!DOCTYPE|<!ENTITY/iu.test(text) || text.includes(CUT)) return unread;
  // (what is no element is cut out first, each from its opening to its own end, in the order they stand, and a mark
  // no manifest can hold is left where each stood)
  let plain = "", at = 0;
  const ends = { "<!--": "-->", "<![CDATA[": "]]>", "<?": "?>" };
  for (;;) {
    const found = Object.keys(ends).map((open) => [text.indexOf(open, at), open]).filter(([i]) => i >= 0).sort((a, b) => a[0] - b[0])[0];
    if (!found) { plain += text.slice(at); break; }
    const end = text.indexOf(ends[found[1]], found[0] + found[1].length);
    if (end < 0) return malformed;
    plain += `${text.slice(at, found[0])}${CUT}`;
    at = end + ends[found[1]].length;
  }
  const stack = [], licences = [];
  let url = false, last = 0, open = null, roots = 0, metadatas = 0;
  // (between two tags stands text, never a "<"; outside the root, nothing but blanks, a cut-out part or a byte-order mark)
  const gapOk = (to) => { const gap = plain.slice(last, to); return !gap.includes("<") && (stack.length > 0 || /^[ \t\r\n\u0000\ufeff]*$/u.test(gap)); };
  // (a name ends at XML's own blanks, a slash or the tag's end, and at nothing else)
  const tags = /<(\/?)([^ \t\r\n/<>]+)((?:"[^"]*"|'[^']*'|[^'"<>])*?)(\/?)>/gu;
  for (const tag of plain.matchAll(tags)) {
    if (!gapOk(tag.index)) return malformed;
    const [, closing, name, attributes, empty] = tag;
    // (a plain name, with no prefix; and no namespace declared below the root, so every element is in the root's)
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/u.test(name) || (attributes && !/^[ \t\r\n]/u.test(attributes))) return unread;
    if (!closing && stack.length && /(?:^|[ \t\r\n])xmlns[ \t\r\n]*[:=]/u.test(attributes.replace(/"[^"]*"|'[^']*'/gu, '""'))) return unread;
    if (closing) {
      if (empty || attributes.trim() || stack.pop() !== name) return malformed;
      if (open && stack.length === 2) { licences.push({ attributes: open.attributes, body: plain.slice(open.from, tag.index) }); open = null; }
    } else {
      if (!stack.length && ++roots > 1) return malformed;
      if (stack.length === 1 && stack[0] === "package" && name === "metadata" && ++metadatas > 1) return { other: "a manifest with two metadata parts" };
      const inMetadata = stack.length === 2 && stack[0] === "package" && stack[1] === "metadata";
      if (inMetadata && name === "license") { if (empty) licences.push({ attributes, body: "" }); else open = { attributes, from: tag.index + tag[0].length }; }
      if (inMetadata && name === "licenseUrl") url = true;
      if (!empty) stack.push(name);
    }
    last = tag.index + tag[0].length;
  }
  if (stack.length || !gapOk(plain.length)) return malformed;
  if (licences.length > 1) return { other: "a manifest with two licences" };
  if (!licences.length) return { other: url ? "an address" : "nothing" };
  const type = /^[ \t\r\n]+type[ \t\r\n]*=[ \t\r\n]*(?:"(expression|file)"|'(expression|file)')(?:[ \t\r\n]+version[ \t\r\n]*=[ \t\r\n]*(?:"[^"]*"|'[^']*'))?[ \t\r\n]*$/u.exec(licences[0].attributes);
  const kind = type?.[1] ?? type?.[2];
  if (kind === "file") return { other: "a licence file" };
  const expression = licences[0].body.replace(/^[ \t\r\n]+|[ \t\r\n]+$/gu, "");
  // (plain printable ASCII and XML's blanks alone: another blank would part words here that it parts for no other reader)
  if (kind !== "expression" || !expression || /[<&]/u.test(expression) || !/^[\x20-\x7e\t\r\n]+$/u.test(expression)) return { other: "a licence it cannot read" };
  return { expression };
}

/** The project files among `tracked` that are the project's own: what the workflow restores, each from its lock file. */
export const projectFiles = (tracked) => tracked.filter((f) => !f.startsWith("core/") && PROJECT.test(f));

/** What the restore's folder holds, as { id, version }: a folder for each package, one for each version in it. */
function restoredPackages(packagesDir) {
  const folders = (dir) => { try { return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; } };
  return folders(packagesDir).flatMap((id) => folders(join(packagesDir, id)).map((version) => ({ id, version })));
}

/**
 * The check, on the project at `root`, whose tracked files are `tracked`, with the restore's folder:
 * { failures, summary }.
 */
export function check(config, root, packagesDir, tracked) {
  const { ships, tools, accepted } = nugetConfig(config);
  const { allowedFor, tools: known } = policy(config);
  // (an accepted licence is named so that a machine can read it: ids this check knows, or LicenseRef-<name>)
  const ids = new Set([...known, ...allowedFor("", true, "data"), ...allowedFor("", true, "font")]);
  const readable = (licence) => { const words = licence.match(/\(|\)|[^\s()]+/gu) ?? []; return words.length > 0 && words.every((w, i) => ["(", ")", "AND", "OR", "WITH"].includes(w) || ids.has(w) || /^LicenseRef-[A-Za-z0-9.-]+$/u.test(w) || (words[i - 1] === "WITH" && /^[A-Za-z0-9.-]+$/u.test(w))); };
  const failures = [];
  const own = tracked.filter((f) => !f.startsWith("core/"));
  const locks = new Set(own.filter((f) => posix.basename(f) === LOCK));
  for (const f of projectFiles(tracked)) {
    if (!locks.has(posix.join(posix.dirname(f), LOCK))) failures.push(`${f} has no ${LOCK} beside it that git knows: set RestorePackagesWithLockFile, restore, and commit the lock file (floor rule 15)`);
  }
  for (const f of own.filter((f) => posix.basename(f).toLowerCase() === "packages.config")) failures.push(`${f}: packages.config has no lock file this check can read: move the project to PackageReference`);
  for (const f of own.filter((f) => OTHER_LOCK.test(posix.basename(f)))) failures.push(`${f}: a lock file under another name, which NuGet takes before ${LOCK} and this check does not read: keep the one name`);
  for (const f of own.filter((f) => BUILD_FILE.test(f))) {
    let text = "";
    try { text = readFileSync(join(root, f), "utf8"); } catch { /* (a file git knows and the folder lacks holds nothing) */ }
    if (/NuGetLockFilePath/iu.test(text)) failures.push(`${f} names NuGetLockFilePath: a lock file kept elsewhere is one this check does not read`);
    if (/RestorePackagesPath|FallbackFolders/iu.test(text)) failures.push(`${f} names RestorePackagesPath or a fallback folder: packages restored to, or taken from, another folder are ones this check does not read`);
    if (/TreatAsLocalProperty/iu.test(text)) failures.push(`${f} names TreatAsLocalProperty: with it a project sets for itself what the restore sets for every project, the folder and the lock file among them`);
  }
  for (const f of own.filter((f) => RESPONSE_FILE.test(posix.basename(f)))) failures.push(`${f}: a response file gives every build of its folder options this check cannot read: give them in the project files`);
  const listed = [...ships, ...tools];
  for (const f of locks) if (!listed.includes(f)) failures.push(`${f} is named in neither "nuget.ships" nor "nuget.tools" of the config: say whether its packages ship`);
  for (const f of listed) if (!locks.has(f)) failures.push(`the config's "nuget" names ${f}, which is no lock file git knows`);

  const packages = new Map(); // by id@version, lower case: { id, version, shipped, lock }
  for (const f of listed.filter((l) => locks.has(l))) {
    const read = lockPackages(readFileSync(join(root, f), "utf8"), f);
    failures.push(...read.failures);
    for (const p of read.packages) {
      const k = key(p.id, p.version), shipped = ships.includes(f);
      if (!packages.has(k) || (shipped && !packages.get(k).shipped)) packages.set(k, { ...p, shipped, lock: f });
    }
  }
  // what the restore brought that no lock file read here names: held like what ships, with no lock to say otherwise
  let unnamed = 0;
  for (const r of packagesDir ? restoredPackages(packagesDir) : []) {
    if (!packages.has(key(r.id, r.version))) { unnamed++; packages.set(key(r.id, r.version), { id: r.id, version: r.version, shipped: true, lock: null }); }
  }
  let entries = [];
  if (config.audit) {
    entries = JSON.parse(readFileSync(join(root, config.audit), "utf8")).entries;
    if (!Array.isArray(entries)) throw new Error(`${config.audit} has no "entries" list`);
  }
  // (an entry is a NuGet package's only where it says so: one of the same name for anything else covers none)
  const audited = new Map(entries.filter((e) => e && e.kind === "nuget" && typeof e.name === "string").map((e) => [e.name.toLowerCase(), e]));
  const yes = new Map(accepted.map((a) => [a.package.toLowerCase(), a]));
  const used = new Set(), read = new Set();
  for (const [k, p] of packages) {
    const name = `${p.id}@${p.version}`, list = p.shipped ? "the list for what ships" : "the tools' list";
    const where = p.lock ?? "brought by the restore, and named in no lock file read here";
    const manifest = join(packagesDir ?? "", p.id.toLowerCase(), p.version.toLowerCase(), `${p.id.toLowerCase()}.nuspec`);
    if (!packagesDir || !existsSync(manifest)) { failures.push(`${name} (${where}): its manifest is not in the restore's folder, so its licence cannot be read: restore from the lock files first (dotnet restore --locked-mode)`); continue; }
    const licence = manifestLicence(readFileSync(manifest, "utf8"));
    const entry = audited.get(k), a = yes.get(k);
    // (the lists hold a package as a package: a name the config gives data or a font, for npm's, widens nothing here)
    const allowed = allowedFor(p.id, p.shipped, null);
    let why, byHand = false;
    if (licence.expression !== undefined) {
      if (entry) { read.add(k); failures.push(`${name}: ${config.audit} holds an entry for it, and its manifest names its licence itself (${licence.expression}): remove the entry`); }
      if (licenceOk(licence.expression, allowed)) { if (a) { used.add(k); failures.push(`"nuget.accepted" names ${a.package}, which is on its list and needs no yes: remove it`); } continue; }
      why = `${licence.expression} is off ${list}`;
    } else if (!entry) {
      byHand = true;
      why = `its manifest names ${licence.other}, no licence a machine can read: read it by hand and record it in ${config.audit ?? "the audit"} as "${name}", of "kind": "nuget"`;
    } else {
      read.add(k);
      if (typeof entry.licence !== "string") why = `its entry in ${config.audit} names no licence`;
      else if (p.shipped && entry.ships !== true) why = `its entry in ${config.audit} does not say it ships ("ships": true), and it is held as what ships`;
      else if (licenceOk(entry.licence, allowed)) { if (a) { used.add(k); failures.push(`${name}: named in "nuget.accepted" and in ${config.audit} both, and the entry is on its list: remove the yes`); } continue; }
      else why = `${entry.licence}, as ${config.audit} records it, is off ${list}`;
    }
    if (a) {
      used.add(k);
      const never = [a.licence, licence.expression, entry?.licence].filter((l) => typeof l === "string" && NEVER.test(l));
      if (never.length) failures.push(`${name}: accepted, and under ${never[0]}, terms floor rule 10 never allows`);
      if (!readable(a.licence)) failures.push(`${name}: accepted under "${a.licence}", which no machine can read: name it by an SPDX id this check knows, or as LicenseRef-<a name for it>, as LicenseRef-Vendor-EULA for one that was bought`);
      if (entry) failures.push(`${name}: named in "nuget.accepted" and in ${config.audit} both: an accepted package stands in "nuget.accepted" alone, since the licence check holds every audit entry to its list`);
      if (p.shipped && a.ships !== true) failures.push(`${name}: accepted as a tool that only runs ("ships": false), and it is held as what ships: a yes for a tool is no yes for what ships (floor rule 10)`);
      if (p.shipped && !a.notice?.trim()) failures.push(`${name}: it ships, so its notice ships too (floor rule 10): its "notice" in "nuget.accepted"`);
      continue;
    }
    failures.push(`${name} (${where}): ${why}${byHand ? "" : `; one the owner wants anyway is named in the config's "nuget.accepted", with the owner's words (floor rule 10)`}`);
  }
  for (const a of accepted) if (!used.has(a.package.toLowerCase())) failures.push(`"nuget.accepted" names ${a.package}, which nothing installs: remove it`);
  for (const [k, e] of audited) if (!read.has(k)) failures.push(`${config.audit}: the entry ${e.name}, of "kind": "nuget", is for no package whose licence had to be read by hand: remove it`);
  const all = [...packages.values()], named = all.filter((p) => p.lock), shipped = named.filter((p) => p.shipped).length;
  const summary = `${named.length} NuGet packages in ${listed.length} lock files checked (${shipped} in what ships, ${named.length - shipped} tools that only run)` +
    `${unnamed ? `, and ${unnamed} more that the restore brought and no lock file names` : ""}, ${[...used].filter((k) => packages.has(k)).length} accepted on the owner's yes; ${failures.length} failing (floor rules 7 and 10)`;
  return { failures: failures.map(shown), summary };
}

if (started(import.meta.url)) {
  const fail = (msg) => { console.error(`FAIL: ${shown(msg)}`); process.exit(1); };
  const args = process.argv.slice(2), advisory = args.includes("--advisory");
  const here = fileURLToPath(new URL(".", import.meta.url));
  const project = () => {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: here, encoding: "utf8" }).trim();
    return { root, tracked: execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean) };
  };
  if (args.includes("--projects")) {
    let files;
    try { files = projectFiles(project().tracked); } catch (e) { fail(e.message); }
    // (a line each, for a shell to read: a name that would be more than one line is refused, never cut)
    const odd = files.filter((f) => shown(f) !== f);
    if (odd.length) fail(`a project file whose name holds a line break or a control character: ${odd.join(", ")}`);
    for (const f of files) console.log(f);
    process.exit(0);
  }
  const at = args.indexOf("--packages"), packagesDir = at >= 0 ? args[at + 1] : undefined;
  const configPath = args.find((a, i) => !a.startsWith("--") && (at < 0 || i !== at + 1));
  if (!configPath || !packagesDir) fail("name the config and the restore's folder: node core/scripts/nuget.mjs <config> --packages <folder> [--advisory]");
  let result;
  try {
    const config = loadConfig(configPath), { root, tracked } = project();
    result = check(config, root, packagesDir, tracked);
  } catch (e) { fail(e.message); }
  for (const f of result.failures) console.error(`${advisory ? "WOULD FAIL" : "FAIL"}: ${f}`);
  console.log(result.summary + (advisory && result.failures.length ? ". Advisory: nothing fails for it yet." : ""));
  process.exit(result.failures.length && !advisory ? 1 : 0);
}
