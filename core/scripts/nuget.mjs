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
//   - floor rule 7's "its source checked": the workflow's restore names its sources itself, NuGet's own registry and
//     what the config's "sources" names, which overrules every NuGet.Config, and holds each package to the hash its
//     lock file names, so a package that came from elsewhere when the lock file was written passes only if it is,
//     byte for byte, what one of those sources gives. A project or any file its build reads can still add a source
//     to what the restore was given, so this reads, for every package the restore brought, NuGet's own record of
//     where it took it from (.nupkg.metadata, beside the package), and fails one taken from anywhere else: no
//     reading of build files, which can name a source in more ways than a scan knows, nor of what a project's
//     restore says of itself. The SDK's own folder of packages, which it gives every restore itself, is known by
//     the dotnet the runner holds. A folder named as a source holds only files git knows, and no link;
//   - floor rule 7's "one exact version, never a range": what a project asks for is, letter for letter, the version
//     its lock installs (NuGet writes a plain Version="1.2.3" as "[1.2.3, )", which with a lock file is that version);
//   - floor rule 10: a package whose manifest names its licence as an SPDX expression is held to its list by that
//     (what ships to the floor's, a tool that only runs to the tools': policy, in licences.mjs). One whose manifest
//     names a licence file, an address or nothing has no licence a machine can read, and is read by hand. A tool
//     that only runs then passes with an entry in the project's audit named <Id>@<version>, of "kind": "nuget", which
//     the licence check holds to its list like any entry. One that ships passes only by the owner's yes, in
//     "nuget.accepted" with the licence as it was read and its notice, and has no audit entry: no session's reading
//     alone puts into what ships a package no machine could read (floor rule 10). A new version needs a new entry or
//     a new yes, so a licence that changes with a version is read again, and one no package needs any more fails;
//   - "one the owner wants anyway waits for the owner's yes" (floor rule 10): a package off its list passes only where
//     the config's "nuget.accepted" names that exact version with the owner's yes (licence-yes.mjs, beside this file,
//     says how one is written and what none takes in, by what the manifest, the audit or the yes itself says). It is
//     named there alone: an audit entry for it too would be held to the list by the licence check, so the two
//     together fail here. An accepted version nothing installs any more fails, so the list only shrinks by itself;
//   - what the restore brought and no lock file read here names (a targeting pack, a PackageDownload, an SDK a project
//     file names): its licence is held to the list for what ships all the same, by its manifest, the audit or a yes.
// What it does not hold: that the lock files are what a restore gives today (the workflow that runs this,
// .github/workflows/nuget.yml, restores each project file this script lists with --locked-mode first, which fails
// where they are not: floor rule 15); the version and the content hash of what no lock file names, which the SDK or a
// project file fixes and no lock file holds; a package taken from a fallback folder that a NuGet.Config names, which a
// restore does not copy into the folder read here (one a lock file names then fails as not restored; one that none
// names goes unseen, and such a folder stands in the pull request for the reviews to see); whether the owner said
// what "accepted" quotes, which the reviews hold, the config being a protected file; a project of another kind than the
// three above; a tool a manifest of dotnet's names (dotnet-tools.json, in .config/ or in any folder), which no restore
// brings, save before the restore (--fetched, below); and what no lock file names at all (a tool a script installs, a
// font, an image), which the licence check's audit and scan hold. A restore runs the project's own build files, a pull
// request's too, which could change anything in the job this runs in, this script and the manifests included: so the
// licences of what the lock files name are read before it too (--fetched), and what a pull request does to its project
// files is the reviews' to read, as with every check that builds.
// A manifest is read as the XML it is, by the one licence element under its one metadata part, as NuGet finds it,
// and only in the plain form every real manifest has: anything else (a document type, a manifest that is not well
// formed, two such parts or elements, a name that is not plain ASCII or has a prefix, a namespace declared anywhere
// but on the root, an expression with a comment, CDATA or an entity inside it) counts as no readable licence, since a
// reader of XML may find another element there than this one does.
// Node's own modules only, and no network: the restore, or before it nuget-fetch.mjs, brought the manifests. It checks
// the project it lies in (core/scripts/ there), whatever the directory it is started from; the config's own path is
// read from that directory.
//
//   node core/scripts/nuget.mjs <config> --packages <the folder the restore filled> [--advisory]
//   node core/scripts/nuget.mjs <config> --packages <the folder nuget-fetch.mjs filled> --fetched [--advisory]
//                                               the same, before the restore: the licences of what the lock files name,
//                                               and of the tools a manifest of dotnet's names, read from files no pull
//                                               request's build has run beside (core archive 201)
//   node core/scripts/nuget.mjs --projects     the project files git knows, a line each: what the workflow restores
//   node core/scripts/nuget.mjs <config> --sources   where the workflow's restore takes packages from, a line each,
//                                                    a folder by its whole path
//
// The config is the licence check's (licences.mjs), with one key more, "nuget": { "ships": the lock files whose
// packages ship, "tools": those of projects that only run (tests, tools), "accepted": the owner's yeses, as
// licence-yes.mjs writes one for a package, named "<Id>@<version>", "sources": where packages may come from beside
// NuGet's own registry, each an https address or a folder of the project's own that holds the package files }. With
// --advisory it says what it would fail and passes, for a project where the check itself is at fault, while that is
// mended.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, delimiter, dirname, isAbsolute, join, posix, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { acceptedList, yesFaults } from "./licence-yes.mjs";
import { MOVED_OFF, baseOf, configAt, licenceOk, loadConfig, movedOff, policy, textAt } from "./licences.mjs";
import { started } from "./started.mjs";

const PROJECT = /\.(?:cs|fs|vb)proj$/iu;
const LOCK = "packages.lock.json";
const OTHER_LOCK = /^packages\..+\.lock\.json$/iu; // NuGet takes packages.<project>.lock.json before the plain one
const BUILD_FILE = /\.(?:cs|fs|vb)proj$|\.props$|\.targets$/iu; // where a project can name another lock file
// NuGet's own registry, where every restore here takes packages from; and what else a config may name as a source:
// an https address of a named host, with no sign-in or question in it, or a folder of the project's own, as git
// lists it
export const REGISTRY = "https://api.nuget.org/v3/index.json";
const SOURCE_ADDRESS = /^https:\/\/(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}(?::[0-9]{1,5})?(?:\/[A-Za-z0-9_~-][A-Za-z0-9._~-]*)*\/?$/u;
const SOURCE_FOLDER = /^[A-Za-z0-9_][A-Za-z0-9_.-]*(?:\/[A-Za-z0-9_][A-Za-z0-9_.-]*)*\/$/u;
const TAKEN = ".nupkg.metadata"; // what NuGet writes beside each package it restores: the source it took it from
const RESPONSE_FILE = /^(?:Directory\.Build|MSBuild)\.rsp$/iu; // options MSBuild gives every build of the folder
const ID = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$/u; // a package's id, as NuGet takes one
const VERSION = /^[0-9][0-9A-Za-z.+-]{0,99}$/u; // a version as a lock file writes one
const key = (id, version) => `${id}@${version}`.toLowerCase();
/** A JSON file's text without the byte-order mark dotnet reads past. */
export const unmarked = (text) => (text.startsWith("\uFEFF") ? text.slice(1) : text);
// what stands where a comment or a processing instruction was cut from a manifest, and where CDATA was: no XML holds either
const CUT = "\u0000", CDATA = "\u0001";
// XML's own declaration, as XML writes it: only at a manifest's start, after a byte-order mark if one stands there
const XB = "[ \\t\\r\\n]"; // XML's own blanks
const DECLARATION = new RegExp(`^<\\?xml${XB}+version${XB}*=${XB}*(?:"1\\.[0-9]+"|'1\\.[0-9]+')(?:${XB}+encoding${XB}*=${XB}*(?:"[A-Za-z][A-Za-z0-9._-]*"|'[A-Za-z][A-Za-z0-9._-]*'))?(?:${XB}+standalone${XB}*=${XB}*(?:"(?:yes|no)"|'(?:yes|no)'))?${XB}*\\?>`, "u");
// a tag's attributes, each parted from the last by a blank, with no "<" in a value (nor a part cut out, which began with
// one), and a reference to a character as XML writes one
const ATTRIBUTES = /^(?:[ \t\r\n]+[A-Za-z_][A-Za-z0-9_.-]*(?::[A-Za-z_][A-Za-z0-9_.-]*)?[ \t\r\n]*=[ \t\r\n]*(?:"[^"<\u0000\u0001]*"|'[^'<\u0000\u0001]*'))*[ \t\r\n]*$/u;
const AMPERSAND = /&(?!(?:amp|lt|gt|quot|apos|#[0-9]{1,7}|#x[0-9A-Fa-f]{1,6});)/u;
// (what a lock file, a manifest or a file's name holds is shown on one line: none of it starts a line of its own)
const shown = (text) => String(text).replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/gu, "?");

/** The config's "nuget", checked: { ships, tools, accepted, sources }. A key or a shape it does not know would check less. */
export function nugetConfig(config) {
  const nuget = config?.nuget;
  if (!nuget || typeof nuget !== "object" || Array.isArray(nuget)) throw new Error('the config has no "nuget": { "ships": [...], "tools": [...] }');
  const odd = Object.keys(nuget).filter((k) => !["ships", "tools", "accepted", "sources"].includes(k));
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
  const accepted = acceptedList(nuget.accepted, "nuget.accepted", /^[^@\s]+@[^@\s]+$/u, "<Id>@<version>", { same: (name) => name.toLowerCase() });
  const sources = nuget.sources ?? [];
  const source = (s) => typeof s === "string" && s.length <= 300 && (SOURCE_ADDRESS.test(s) || (SOURCE_FOLDER.test(s) && !s.toLowerCase().startsWith("core/")));
  if (!Array.isArray(sources) || !sources.every(source)) throw new Error('the config\'s "nuget.sources" is not a list of sources: each an https address of a named host, with no sign-in or question in it, or a folder of the project\'s own, as git lists it, ending in "/"');
  const same = sources.map((s) => s.toLowerCase().replace(/\/$/u, ""));
  if (same.some((s, i) => same.indexOf(s) !== i || s === REGISTRY.toLowerCase())) throw new Error(`the config's "nuget.sources" names a source twice, or NuGet's own registry, which every restore takes from already`);
  return { ships, tools, accepted, sources };
}

/** Where a restore takes packages from, in order: NuGet's own registry, then the sources the config names, a folder
 *  by its whole path under `root`, so that a restore reads it from wherever it is started. */
export const sourcesOf = (config, root) => [REGISTRY, ...nugetConfig(config).sources.map((s) => (s.startsWith("https://") ? s : resolve(root, s)))];

/** A path as one spelling of the place it names: whole, with links and Windows' short names resolved, as the system
 *  spells them, up to the nearest folder of it that is there (the rest as it is written), and in one case where the
 *  system reads paths so: two spellings of one place, there or not yet, are one. */
function place(p) {
  let at = resolve(p), whole;
  const rest = [];
  for (;;) {
    try { whole = join(realpathSync.native(at), ...rest); break; } catch { /* (not there: try the folder above) */ }
    const up = dirname(at);
    if (up === at) { whole = join(at, ...rest); break; }
    rest.unshift(basename(at));
    at = up;
  }
  return process.platform === "win32" ? whole.toLowerCase() : whole;
}

/** The folders of packages the .NET SDK itself brings and gives every restore as a source (`library-packs`, beside
 *  each `dotnet` the PATH or DOTNET_ROOT names): the runner's own, which no pull request writes. Only a whole path
 *  counts, and none inside the project at `root`: a dotnet there would be one the pull request brought. */
export function sdkPacks(env = process.env, root = null) {
  const inside = (dir) => root !== null && (place(dir) === place(root) || place(dir).startsWith(place(root) + sep));
  const homes = [env.DOTNET_ROOT, ...(env.PATH ?? env.Path ?? "").split(delimiter)].filter((dir) => dir && isAbsolute(dir) && !inside(dir))
    .flatMap((dir) => ["dotnet", "dotnet.exe"].map((name) => join(dir, name)).filter((file) => existsSync(file)));
  // (and the folder the dotnet itself stands in, where a link leads, as the system spells it: one inside the project
  // is the pull request's, wherever its link stands; that folder is there, so no spelling of a place not yet made,
  // which Windows may write in its short form, is compared)
  return [...new Set(homes.map((file) => { try { return dirname(realpathSync.native(file)); } catch { return null; } })
    .filter((home) => home && !inside(home)).map((home) => place(join(home, "library-packs"))))];
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
      packages.set(key(id, resolved), { id, version: resolved, contentHash });
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
  if (typeof text !== "string" || /<!DOCTYPE|<!ENTITY/iu.test(text) || text.includes(CUT) || text.includes(CDATA)) return unread;
  text = text.replace(/^\ufeff/u, "").replace(DECLARATION, "");
  // (what is no element is cut out first, each from its opening to its own end, in the order they stand, and a mark
  // no manifest can hold is left where each stood: a comment holds no "--", and an instruction is named, never "xml")
  let plain = "", at = 0;
  const ends = { "<!--": "-->", "<![CDATA[": "]]>", "<?": "?>" };
  for (;;) {
    const found = Object.keys(ends).map((open) => [text.indexOf(open, at), open]).filter(([i]) => i >= 0).sort((a, b) => a[0] - b[0])[0];
    if (!found) { plain += text.slice(at); break; }
    const end = text.indexOf(ends[found[1]], found[0] + found[1].length);
    if (end < 0) return malformed;
    const body = text.slice(found[0] + found[1].length, end);
    if (found[1] === "<!--" && (body.includes("--") || body.endsWith("-"))) return malformed;
    if (found[1] === "<?" && !/^(?!xml(?:[ \t\r\n]|$))[A-Za-z_][A-Za-z0-9_.-]*(?:[ \t\r\n]|$)/iu.test(body)) return malformed;
    plain += `${text.slice(at, found[0])}${found[1] === "<![CDATA[" ? CDATA : CUT}`;
    at = end + ends[found[1]].length;
  }
  // (each "&" a reference XML knows, and no "]]>" but the end of CDATA)
  if (AMPERSAND.test(plain) || plain.includes("]]>")) return malformed;
  const stack = [], licences = [], prefixes = new Set(["xml"]);
  let url = false, last = 0, open = null, roots = 0, metadatas = 0;
  // (between two tags stands text, never a "<"; outside the root, nothing but blanks, a comment or an instruction)
  const gapOk = (to) => { const gap = plain.slice(last, to); return !gap.includes("<") && (stack.length > 0 || /^[ \t\r\n\u0000]*$/u.test(gap)); };
  // (a name ends at XML's own blanks, a slash or the tag's end, and at nothing else)
  const tags = /<(\/?)([^ \t\r\n/<>]+)((?:"[^"]*"|'[^']*'|[^'"<>])*?)(\/?)>/gu;
  for (const tag of plain.matchAll(tags)) {
    if (!gapOk(tag.index)) return malformed;
    const [, closing, name, attributes, empty] = tag;
    // (a plain name, with no prefix; and no namespace declared below the root, so every element is in the root's)
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/u.test(name) || (attributes && !/^[ \t\r\n]/u.test(attributes))) return unread;
    // (no attribute twice, by its local name; a prefix only one the root declares, to a namespace, or xml)
    const pairs = [...attributes.matchAll(/([^ \t\r\n=]+)[ \t\r\n]*=[ \t\r\n]*(?:"([^"]*)"|'([^']*)')/gu)].map((m) => [m[1], m[2] ?? m[3]]);
    if (!ATTRIBUTES.test(attributes)) return malformed;
    if (!closing && !stack.length) {
      for (const [n, v] of pairs) if (n.startsWith("xmlns:") && (["xml", "xmlns"].includes(n.slice(6)) || !v)) return unread; else if (n.startsWith("xmlns:")) prefixes.add(n.slice(6));
    }
    const named = pairs.map(([n]) => n).filter((n) => n !== "xmlns" && !n.startsWith("xmlns:"));
    if (new Set(named.map((n) => n.split(":").at(-1))).size !== named.length || named.some((n) => n.includes(":") && !prefixes.has(n.split(":")[0]))) return malformed;
    if (new Set(pairs.map(([n]) => n)).size !== pairs.length) return malformed;
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
  // (plain printable ASCII alone, its words parted by spaces: XML reads a line's end otherwise than it stands, and SPDX
  // parts words by spaces alone)
  if (kind !== "expression" || !expression || /[<&]/u.test(expression) || !/^[\x20-\x7e]+$/u.test(expression)) return { other: "a licence it cannot read" };
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
export function check(config, root, packagesDir, tracked, env = process.env, { base = null, baseConfig = null, fetched = false } = {}) {
  const { ships, tools, accepted, sources } = nugetConfig(config);
  const lists = policy(config), { allowedFor } = lists;
  const failures = [], reports = [];
  // (what a lock file held at the base, by id@version: a package under a licence the floor moved off the list that it
  // held, in a lock file whose packages shipped then by the base's own config, is reported and passes; with no base to
  // read, as licences.mjs reads it, it is reported and passes too)
  // (where the base held no config at this one's path, or one this cannot read, nothing shipped there, and no tool is
  // the base's; nor is one where the pull request changed the sources it may come from)
  let shippedThen = [], sameSources = !base;
  try {
    if (baseConfig) {
      // (letter for letter: a folder's name, or an address's path, in another case may be another source)
      const then = nugetConfig(baseConfig), list = (l) => [...l].sort().join("\n");
      shippedThen = then.ships;
      sameSources = sameSources || list(then.sources) === list(sources);
    }
  } catch { /* (nothing shipped there) */ }
  const heldIn = new Map();
  const held = (lock, k) => {
    if (!base) return true;
    if (!shippedThen.includes(lock)) return false;
    if (!heldIn.has(lock)) heldIn.set(lock, new Set(lockPackages(textAt(root, base, lock) ?? "", lock).packages.map((q) => key(q.id, q.version))));
    return heldIn.get(lock).has(k);
  };
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
  // (a folder named as a source is the project's own, in the pull request for the reviews to read: every file in it is
  // one git knows, and none is a link that leads elsewhere)
  for (const s of sources.filter((x) => !x.startsWith("https://"))) {
    if (!own.some((f) => f.startsWith(s))) failures.push(`the config's "nuget.sources" names ${s}, a folder that holds no file git knows`);
    const held = (dir) => {
      let entries = [];
      try { entries = readdirSync(join(root, dir), { withFileTypes: true }); } catch { /* (a folder that is not there holds nothing) */ }
      for (const e of entries) {
        const at = `${dir}${e.name}`;
        if (e.isSymbolicLink()) failures.push(`${at}: a link, in a folder the config names as a source: what it leads to is not what the pull request shows`);
        else if (e.isDirectory()) held(`${at}/`);
        else if (!tracked.includes(at)) failures.push(`${at}: a file git does not know, in a folder the config names as a source: a restore would take packages the pull request does not show`);
      }
    };
    held(s);
  }
  // Where each package was taken from, as NuGet itself records it beside the package (.nupkg.metadata, read below):
  // NuGet's own registry, a source the config names, or the SDK's own folder of packages.
  const givenSources = sourcesOf(config, root), folders = [...givenSources.filter((a) => !a.startsWith("https://")).map(place), ...sdkPacks(env, root)];
  const from = (source) => (/^https?:/iu.test(source) ? givenSources.includes(source) : folders.includes(place(source)));
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
  // the tools a manifest of dotnet's names, read before the restore alone (no restore brings them), each held to the
  // tools' list, one exact version each (nuget-fetch.mjs fetched them); after the restore, a yes or an audit entry for
  // one of them stands, since the check before it read that tool
  const toolsRead = new Set();
  for (const f of own.filter((t) => posix.basename(t).toLowerCase() === "dotnet-tools.json")) {
    let manifest = {};
    const text = readFileSync(join(root, f), "utf8");
    try { manifest = JSON.parse(unmarked(text)); } catch { if (fetched) (!base || textAt(root, base, f) === text ? reports : failures).push(`${f} is not JSON`); }
    if (!fetched) {
      for (const [id, entry] of Object.entries(manifest?.tools ?? {})) if (typeof entry?.version === "string") toolsRead.add(key(id, entry.version));
      continue;
    }
    // (a tool the base's manifest already held at that version was never checked before this release: what is wrong
    // with it is reported and passes, so that no sync fails a project over it; one a pull request adds or updates is
    // held to the list)
    let before = new Set();
    try { before = !base ? null : !sameSources ? new Set() : new Set(Object.entries(JSON.parse(unmarked(textAt(root, base, f) ?? "{}"))?.tools ?? {}).map(([id, e]) => key(id, String(e?.version)))); } catch { before = new Set(); }
    for (const [id, entry] of Object.entries(manifest?.tools ?? {})) {
      if (ID.test(id) && typeof entry?.version === "string" && VERSION.test(entry.version) && !packages.has(key(id, entry.version))) packages.set(key(id, entry.version), { id, version: entry.version, shipped: false, lock: f, tool: true, heldTool: before === null || before.has(key(id, entry.version)) });
    }
  }
  // what the restore brought that no lock file read here names: held like what ships, with no lock to say otherwise
  let unnamed = 0;
  for (const r of packagesDir && !fetched ? restoredPackages(packagesDir) : []) {
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
    const before = failures.length;
    try { judge(k, p); } finally {
      if (p.heldTool) reports.push(...failures.splice(before).map((f) => `${f} (a tool held before this check read tools: reported, and passes)`));
    }
  }
  function judge(k, p) {
    const name = `${p.id}@${p.version}`, list = p.shipped ? "the list for what ships" : "the tools' list";
    const where = p.lock ?? "brought by the restore, and named in no lock file read here";
    const manifest = join(packagesDir ?? "", p.id.toLowerCase(), p.version.toLowerCase(), `${p.id.toLowerCase()}.nuspec`);
    // (before the restore, one the fetch could not reach is read after it: the fetch said so)
    if (fetched && (!packagesDir || !existsSync(manifest))) { used.add(k); read.add(k); return; }
    if (!packagesDir || !existsSync(manifest)) { failures.push(`${name} (${where}): its manifest is not in the restore's folder, so its licence cannot be read: restore from the lock files first (dotnet restore --locked-mode)`); return; }
    // (where NuGet took it from, by NuGet's own record of this restore: nothing a project file says is read for it)
    let taken;
    try { taken = JSON.parse(readFileSync(join(dirname(manifest), TAKEN), "utf8"))?.source; } catch { /* (no record) */ }
    if (typeof taken !== "string" || !taken) failures.push(`${name} (${where}): the restore left no record of where it took it from (${TAKEN}), so its source cannot be read`);
    else if (!from(taken)) failures.push(`${name} (${where}): the restore took it from ${taken}, which is neither NuGet's own registry nor a source the config's "nuget.sources" names (floor rule 7)`);
    const licence = manifestLicence(readFileSync(manifest, "utf8"));
    const entry = audited.get(k), a = yes.get(k);
    // (the lists hold a package as a package: a name the config gives data or a font, for npm's, widens nothing here)
    const allowed = allowedFor(p.id, p.shipped, null);
    let why, byHand = false;
    if (licence.expression !== undefined) {
      if (entry) { read.add(k); failures.push(`${name}: ${config.audit} holds an entry for it, and its manifest names its licence itself (${licence.expression}): remove the entry`); }
      if (licenceOk(licence.expression, allowed)) { if (a) { used.add(k); failures.push(`"nuget.accepted" names ${a.package}, which is on its list and needs no yes: remove it`); } return; }
      if (!a && p.shipped && p.lock && movedOff(licence.expression, allowed) && held(p.lock, k)) {
        reports.push(`${name} (${where}) ships under ${licence.expression}, which since ${[...MOVED_OFF].filter(([id]) => licence.expression.includes(id)).map(([id, day]) => `${day} (${id})`).join(", ")} waits for the owner's yes (floor rule 10): ${base ? "shipped at the pull request's base" : "with no base to read it against"}, it passes; file an issue for the owner, who gives the yes in "nuget.accepted" or has it replaced`);
        return;
      }
      why = `${licence.expression} is off ${list}`;
    } else if (p.shipped) {
      // (what ships under a licence only a reading by hand gives waits for the owner's yes, whatever was read)
      byHand = true;
      why = `it ships, and its manifest names ${licence.other}, no licence a machine can read: what ships under a licence read by hand waits for the owner's yes (floor rule 10), in the config's "nuget.accepted", with the licence as it was read`;
      if (entry) { read.add(k); if (!a) failures.push(`${name}: it ships, so ${config.audit} holds no entry for it: its licence, read by hand, stands in "nuget.accepted" with the owner's yes`); }
    } else if (!entry) {
      byHand = true;
      why = `its manifest names ${licence.other}, no licence a machine can read: read it by hand and record it in ${config.audit ?? "the audit"} as "${name}", of "kind": "nuget"`;
    } else {
      read.add(k);
      if (typeof entry.licence !== "string") why = `its entry in ${config.audit} names no licence`;
      else if (licenceOk(entry.licence, allowed)) { if (a) { used.add(k); failures.push(`${name}: named in "nuget.accepted" and in ${config.audit} both, and the entry is on its list: remove the yes`); } return; }
      else why = `${entry.licence}, as ${config.audit} records it, is off ${list}`;
    }
    if (a) {
      used.add(k);
      failures.push(...yesFaults(name, a, p.shipped, [licence.expression, entry?.licence], lists, '"nuget.accepted"'));
      if (entry) failures.push(`${name}: named in "nuget.accepted" and in ${config.audit} both: an accepted package stands in "nuget.accepted" alone, since the licence check holds every audit entry to its list`);
      return;
    }
    failures.push(`${name} (${where}): ${why}${byHand ? "" : `; one the owner wants anyway is named in the config's "nuget.accepted", with the owner's words (floor rule 10)`}`);
  }
  for (const k of toolsRead) { used.add(k); read.add(k); }
  // (before the restore, a yes or an entry may be for what only the restore brings: the check after it holds those)
  if (!fetched) for (const a of accepted) if (!used.has(a.package.toLowerCase())) failures.push(`"nuget.accepted" names ${a.package}, which nothing installs: remove it`);
  if (!fetched) for (const [k, e] of audited) if (!read.has(k)) failures.push(`${config.audit}: the entry ${e.name}, of "kind": "nuget", is for no package whose licence had to be read by hand: remove it`);
  const all = [...packages.values()], named = all.filter((p) => p.lock), shipped = named.filter((p) => p.shipped).length;
  const summary = `${named.length} NuGet packages in ${listed.length} lock files checked (${shipped} in what ships, ${named.length - shipped} tools that only run)` +
    `${unnamed ? `, and ${unnamed} more that the restore brought and no lock file names` : ""}${fetched ? ", read before the restore" : ""}, ${[...used].filter((k) => packages.has(k) && yes.has(k)).length} accepted on the owner's yes;${reports.length ? ` ${reports.length} held before a licence moved off the list, reported;` : ""} ${failures.length} failing (floor rules 7 and 10)`;
  return { failures: failures.map(shown), reports: reports.map(shown), summary };
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
  if (args.includes("--sources")) {
    if (!configPath) fail("name the config: node core/scripts/nuget.mjs <config> --sources");
    let from;
    try { from = sourcesOf(loadConfig(configPath), project().root); } catch (e) { fail(e.message); }
    for (const s of from) console.log(s);
    process.exit(0);
  }
  if (!configPath || !packagesDir) fail("name the config and the restore's folder: node core/scripts/nuget.mjs <config> --packages <folder> [--advisory]");
  let result;
  try {
    const config = loadConfig(configPath), { root, tracked } = project();
    const base = baseOf(root);
    result = check(config, root, packagesDir, tracked, process.env, { base, baseConfig: configAt(root, base, configPath), fetched: args.includes("--fetched") });
  } catch (e) { fail(e.message); }
  for (const r of result.reports) console.log(`REPORT: ${r}`);
  for (const f of result.failures) console.error(`${advisory ? "WOULD FAIL" : "FAIL"}: ${f}`);
  console.log(result.summary + (advisory && result.failures.length ? ". Advisory: nothing fails for it yet." : ""));
  process.exit(result.failures.length && !advisory ? 1 : 0);
}
