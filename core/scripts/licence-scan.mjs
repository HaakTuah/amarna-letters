// The licence check's scan (floor rule 10, in floor/topics/licences.md beside this folder): nothing a project uses is left out
// of its audit, so the check (licences.mjs, beside this file, which runs this when its config has "scan") holds
// everything to its list, not only what a lockfile names. It reads the project's tracked files (git ls-files), but
// what "skip" names and, in a project, its copy of the core, which the core's own scan audits (.github/licences.json
// in the core). An entry covers a file by its "name" (the file's path) or its "files" (paths, or folders ending in
// "/"). It needs:
//   - each lockfile the config's "lockfiles" names, and each package.json with dependencies beside one of them or a
//     workspace of one, so the check reads every package any of them installs;
//   - an entry for each action a workflow or action file uses (`uses:`), but the owner's own (the account the core is under, the core's
//     workflows among them) and the project's (./), by its name (owner/repo), at whatever version it is pinned to;
//   - an entry for each package a command fetches (licence-commands.mjs, beside this file, finds them, licence-npm.mjs reads them: npx, npm exec,
//     npm install, npm link and npm pack, in any workflow, script or tool, a file with no extension read as a shell
//     script, the parts of a page or component that run, any command in a JSON or TOML file), written
//     name@exact.version and audited at that version, one entry for each version used, so an update is audited again,
//     with what it pulls in. A fetch it cannot read fails, but npm pack's, which runs nothing it fetches, and another
//     fetcher's (curl, wget, pip, pnpm, yarn, bun, playwright install, git clone, dotnet tool install, choco, winget,
//     PowerShell's Invoke-WebRequest and the like): each of those passes
//     only in a file an entry's "files" names, that entry its hand audit, each fetch that stood at the base reported; and where such a file downloads by address
//     (curl, wget, PowerShell's) and an entry covering it audits what may be a program (no data, asset, font, service
//     of GitHub's or the owner's own work), each such entry names its version and the file holds, for each download,
//     a checksum of its own and a command that checks by one (sha256sum, shasum, Get-FileHash and the like) (floor
//     rule 7), a file that stood unpinned at the pull request's base reported;
//   - an entry covering each script in a language it cannot read (Python, Ruby, PowerShell and the like): the entries
//     of what it uses;
//   - an entry covering each file but prose (Markdown, text) carrying a licence notice, code in any language or a text
//     asset (an SVG), and each font, image, sound, video, model or data file, and each binary file whatever its name;
//   - what lies under "served" but not "tools" reaches users, so every entry covering it there ships.
// The owner's own work (kind "own") covers only files it names one by one, never a file carrying someone's licence
// notice, an action or a package. Each "files" path, and each path of "scan", must name a tracked file or a folder
// holding one, so none is left covering nothing (or, misspelt, missing what it meant).
//
// The config's "scan" names "served", the folders (each ending in "/", or "" for the whole repository) whose files
// reach users ([] if none); "tools", the folders within them whose files do not; and "skip", the folders or files
// left out. Node's own modules only.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { OWNER } from "./core-address.mjs";
import { DEEPEST, leadsOut, tooDeep } from "./guards.mjs";
import { commandLines, commands } from "./licence-commands.mjs";
import { downloads, otherFetches } from "./licence-fetchers.mjs";
import { fetched } from "./licence-npm.mjs";
import { executable } from "./licence-pages.mjs";
import { copyOf } from "./core-path.mjs";

const OWN = `${OWNER}/`;
const SHELL = /\.(ya?ml|sh|bash|zsh|fish|mk|toml|envrc)$|(^|\/)(Dockerfile[^/]*|Makefile|GNUmakefile|\.envrc)$/iu;
const JS = /\.([cm]?[jt]sx?)$/iu;
const WEB = /\.(html?|vue|svelte|astro)$/iu; // (pages and components: the parts that run, executable() in licence-pages.mjs)
const YAML = /\.ya?ml$/iu;
const OTHER_LANGUAGE = /\.(py|pyw|rb|ps1|psm1|bat|cmd|pl|pm|php|lua|r|jl|tcl|vbs|groovy|gradle|kts)$/iu;
const CODE = /\.(html?|[cm]?[jt]sx?|css|scss|sass|less|vue|svelte|astro)$/iu;
const ASSET = new RegExp(
  "\\.(png|jpe?g|gif|webp|avif|jxl|heic|ico|bmp|tiff?|svg|psd|xcf|woff2?|ttf|otf|eot|mp3|ogg|oga|opus|wav|flac|m4a|aac|aiff?|mid|midi|" +
    "webm|mp4|mov|ogv|glb|gltf|fbx|blend|stl|wasm|pdf|csv|tsv|geojson|topojson|parquet|sqlite|db)$",
  "iu",
);
const PROSE_FILE = /\.(md|markdown|txt|rst|adoc)$/iu;
const NOTICE = /\/\*!|@license|SPDX-License-Identifier|Copyright\s+(\(c\)|©|\d{4})|Permission is hereby granted|Licensed under the/iu;
const EXACT = /^((?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*)@(\d+\.\d+\.\d+)$/iu;
const LOCKFILE = /(^|\/)(package-lock|npm-shrinkwrap)\.json$/u;
/** A tracked file's text, a link's that of the file it leads to, read as the link's own, where that lies inside the
 *  project; a link that leads out of it, or nowhere, is not read and fails, since what it holds cannot be audited. */
function trackedText(root, f, fail) {
  const at = join(root, f);
  if (leadsOut(root, at)) { fail(`${f} is a link that leads out of the project, so what it holds cannot be read. Mend: put the file itself there, in place of the link`); return ""; }
  // (a link to a folder, a device or a pipe is never read: a folder's files are read in their own place, a device can be
  // endless and a pipe never ends; #447)
  if (!statSync(at, { throwIfNoEntry: false })?.isFile()) { fail(`${f} is a link to no file of bytes (a folder, a device or a pipe), so the scan reads nothing through it; a folder's files are read in their own place. Mend: put the file itself there, in place of the link, or, for a folder, take the link out of git or link each of its files`); return ""; }
  return readFileSync(at, "utf8");
}

/** The command lines a JSON file `f` holds (licence-commands.mjs); none where it nests past the bound, which fails
 *  unless an entry audits it by hand. */
function linesIn(json, f, byHand, fail) {
  if (!tooDeep(json)) return commandLines(json);
  if (!byHand(f)) fail(`${f}: it nests deeper than ${DEEPEST} objects and lists, so its commands cannot be read. Mend: nest it less deep, or name it in the "files" of the entry that audits it`);
  return [];
}

/** The failures of the scan of the project at `root`, against its audit's `entries` (read from `auditPath`). */
export function scan(settings, root, entries, auditPath, lockfiles = [], base = null, baseAudit = null) {
  const failures = [], reports = [];
  const fail = (m) => { if (!failures.includes(m)) failures.push(m); };
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 << 20 });
  const tracked = git("ls-files", "-z").split("\0").filter(Boolean);
  const project = tracked.includes("core-manifest.md"); // (a project, whose copy of the core the core audits)
  const files = tracked.filter((f) => !(project && f.startsWith(copyOf(root))) && !under(f, settings.skip)); // (at the manifest's path)
  const binary = new Set(git("ls-files", "--eol", "-z").split("\0").filter((l) => /^i\/-text\s/u.test(l)).map((l) => l.slice(l.indexOf("\t") + 1)));
  // (what the scan's parts share: scanned, below)
  const c = { settings, root, entries, auditPath, lockfiles, tracked, files, binary, fail, reports, base, baseAudit };

  for (const key of ["served", "tools", "skip"]) for (const p of settings[key] ?? []) if (p !== "" && !tracked.some((f) => holds(p, f))) fail(`the config's "scan.${key}": ${p} names no tracked file. Mend: correct the path, a folder ending in "/", or take it out`);
  for (const e of entries) entryFaults(c, e);
  c.locks = lockfiles.map((l) => ({ dir: posix.dirname(l) === "." ? "" : `${posix.dirname(l)}/`, packages: JSON.parse(readFileSync(join(root, l), "utf8")).packages ?? {} }));
  for (const f of files) scanned(c, f);
  return { failures, reports, scanned: files.length };
}

const holds = (p, f) => typeof p === "string" && (p === "" || p === f || (p.endsWith("/") && f.startsWith(p)));
const under = (f, paths) => (paths ?? []).some((p) => holds(p, f));
const served = (c, f) => under(f, c.settings.served) && !under(f, c.settings.tools);
export const covers = (e, f) => e.name === f || (Array.isArray(e.files) && e.files.some((p) => p !== "" && holds(p, f)));
const covering = (c, f) => c.entries.filter((e) => covers(e, f));
const byHand = (c, f) => covering(c, f).some((e) => e.kind !== "own");
const badFiles = (e) => e.files !== undefined && (!Array.isArray(e.files) || e.files.some((p) => typeof p !== "string" || !p));

/** What fails in an audit entry `e` itself (scan, above): its "files", its "version", the owner's own work, and
 *  whether it ships what reaches users. */
function entryFaults(c, e) {
  const { auditPath, fail } = c;
  if (badFiles(e)) { fail(`${auditPath}: ${e.name}: "files" is not a list of paths. Mend: write it as a list of paths from the project's root`); return; }
  if (e.version !== undefined && typeof e.version !== "string") fail(`${auditPath}: ${e.name}: "version" is not text. Mend: write the version in quotes`);
  if (e.kind === "own" && (e.version !== undefined || (e.files ?? []).some((p) => p.endsWith("/")))) fail(`${auditPath}: ${e.name}: the owner's own work names its files one by one, with no version. Mend: list each file, no folder, and take "version" out`);
  for (const p of e.files ?? []) if (!c.tracked.some((f) => holds(p, f))) fail(`${auditPath}: ${e.name}: ${p} names no tracked file. Mend: correct the path, or take it out`);
  const shipped = c.files.find((f) => served(c, f) && covers(e, f));
  if (shipped && e.ships !== true) fail(`${auditPath}: ${e.name}: it covers ${shipped}, which reaches users, so it ships. Mend: set "ships": true on it`);
}

/** That the package `name` (used in `where`) has an entry, at `version` where one is given (scan, above). */
function need(c, name, where, version) {
  const named = c.entries.filter((e) => e.name === name && e.kind !== "own");
  if (!named.length) c.fail(`${name} (${where}) is not in ${c.auditPath}. Mend: add an entry for it there, with its name, exact version, licence and "ships"`);
  else if (version && !named.some((e) => e.version === version)) c.fail(`${name}@${version} (${where}) is audited at ${named.map((e) => e.version ?? "no version").join(", ")}. Mend: audit the new version, and what it pulls in, in ${c.auditPath}`);
}

/** That an entry covers the file `f` (`what` it is), but the owner's own where `own` is false, and that each ships
 *  where it reaches users (scan, above). */
function needFile(c, f, what, { own = true } = {}) {
  const by = covering(c, f).filter((e) => own || e.kind !== "own");
  if (!by.length) c.fail(`${f} (${what}) is not in ${c.auditPath}${own ? "" : ", by an entry not the owner's own"}. Mend: name ${f} in the "files" of the entry that audits it`);
  else if (served(c, f) && !by.every((e) => e.ships === true)) c.fail(`${f} (${what}) reaches users, so every entry covering it ships. Mend: set "ships": true on each entry whose "files" covers it`);
}

/** What the commands in `text`, of the file `f`, fetch, each held to its entry (scan, above). */
function fetches(c, text, f, literal = false) {
  for (const line of commands(text, JS.test(f) || WEB.test(f), literal)) {
    const { specs, unreadable, packs } = fetched(String(line), line.atCommand === true, literal || line.literal === true);
    const where = `${f}, ${line.trim().replaceAll("\u0000", " ").slice(0, 120)}`;
    if (unreadable) c.fail(`${where}: ${unreadable}, which cannot be audited. Mend: fetch it as npx -p <name>@<exact version>`);
    for (const spec of specs) {
      const exact = EXACT.exec(spec);
      if (exact) need(c, exact[1], where, exact[2]);
      else if (!(packs && byHand(c, f))) c.fail(`${where}: ${spec} cannot be audited. Mend: write it as name@exact.version${packs ? `, or name ${f} in the "files" of the entry that audits it` : ""}`);
    }
  }
  if (/\bnpm_config_(@[\w-]+:)?registry\b|\bnpm_config_replace_registry_host\b|\bnpm_config_(user|global)config\b/iu.test(text)) c.fail(`${f}: it points npm at another registry than npm's, so no audited name can be trusted there. Mend: take that setting out`);
  if (/\bnpm_config_(package_lock|shrinkwrap)\b/iu.test(text)) c.fail(`${f}: it installs without the lockfile, so what it installs is not what the lockfile's check read. Mend: take that setting out`);
  if (!byHand(c, f)) c.others.push(...otherFetches(text));
}

// The fetches `found` in the file `f` that the scan cannot read and no entry audits (byKind), each its line with those
// that run on to it or it runs on to, fail, but where each stood word for word at the pull request's base, unaudited by the base's own
// audit, which are reported (AGENTS.md, "Nothing locks a project": a reader that reads more turns no file red that
// stood; #1074); with no base, as in a run by hand, they fail. A fetch changed, or added, fails: the base allows what
// it held, not as many others. A source held in a variable set on another line is not read, as `heldAtBase` reads none.
function unaudited(c, f, found) {
  if (!found.length) return;
  const was = c.base ? atBase(c, f) : null, held = was === null ? [] : byKind({ ...c, entries: baseEntries(c), fail() {}, reports: [] }, f, was);
  const fresh = found.filter((line) => { const i = held.indexOf(line); if (i < 0) return true; held.splice(i, 1); return false; });
  const shown = (line) => (line.length > 80 ? `${line.slice(0, 79)}…` : line), mend = `name ${f} in the "files" of the entry that audits it`;
  if (fresh.length) c.fail(`${f}: ${shown(fresh[0])} fetches what no entry's "files" says. Mend: ${mend}`);
  else c.reports.push(`${f}: ${shown(found[0])} fetches what no entry's "files" says; it stood so at the pull request's base, so it passes: ${mend}`);
}

// What is no program a download could fetch: the owner's own work, data, an asset, a font, a service of GitHub's.
const NO_PROGRAM = new Set(["own", "data", "asset", "font", "github-service"]);
// A checksum written out: SHA-256 or SHA-512 as hex, or an integrity value as npm writes one; and the commands that
// check a file against one, an allow-list: sha256sum, sha512sum and shasum, PowerShell's Get-FileHash, certutil's
// -hashfile and Node's createHash.
const CHECKSUM = /(?<![0-9a-f])(?:[0-9a-f]{64}){1,2}(?![0-9a-f])|sha(?:256|384|512)-[A-Za-z0-9+/]{43,}={0,2}/iu;
const VERIFIER = /(?<![\w-])(?:sha(?:256|512)sum|shasum|Get-FileHash|certutil(?:\.exe)?\s+-hashfile|createHash)(?![\w-])/giu;

/** What the code `code` of the file `f` (codeOf) lacks for the programs it downloads by address to be pinned, or
 *  null: of the audit's `entries` covering `f` that audit what may be a program, each names its version (`bare`, those
 *  that do not), and for each download the file holds a checksum of its own and a check by a command of VERIFIER
 *  (`deficit`, the downloads short of one). The scan and the sync's step (steps.mjs) read it alike. */
export function pinFault(entries, auditPath, f, code) {
  const tools = entries.filter((e) => e && typeof e === "object" && covers(e, f) && !NO_PROGRAM.has(e.kind)), count = downloads(code).length;
  if (!tools.length || !count) return null;
  const bare = tools.filter((e) => typeof e.version !== "string" || !e.version.trim()).map((e) => e.name);
  // (which check a download meets is left to the review, since reading that needs a reader of the shell's data flow)
  const sums = new Set([...code.matchAll(new RegExp(CHECKSUM.source, "giu"))].map((m) => m[0].toLowerCase()));
  const checks = [...code.matchAll(VERIFIER)].length, deficit = Math.max(0, count - Math.min(sums.size, checks));
  if (bare.length) return { bare, deficit, what: `${bare.join(", ")}, in ${auditPath}, names no version`, mend: `write the exact version ${f} downloads as "version" on ${bare.length === 1 ? "that entry" : "those entries"}` };
  if (!deficit) return null;
  return { bare, deficit, what: !sums.size ? `${f} holds no checksum to check it by` : !checks ? `${f} holds a checksum and no command that checks a file by it` : `${f} holds ${sums.size} checksum${sums.size === 1 ? "" : "s"} and ${checks} check${checks === 1 ? "" : "s"} for ${count} downloads, so one is checked by none`, mend: `write the download's SHA-256 in ${f} and check the file against it before it runs, refusing one that differs, as the core's scripts/node.sh does (sha256sum -c, or Get-FileHash in PowerShell)` };
}

/** Whether the scan reads the file `f`, holding `text` and no binary, for the commands it runs, and so for its pins:
 *  code that runs, a script in a language it cannot read, and JSON but the audit and a lock file. */
export const pinRead = (f, text, auditPath) => { const as = readAs({ binary: new Set() }, f, text); return as.runs || as.other || (/\.json[c5]?$/u.test(f) && f !== auditPath && !LOCKFILE.test(f)); };

// A download's pin, in every file read for its commands that an entry audits by hand.
function pinnedIfRead(c, f, text) {
  if (!c.binary.has(f) && byHand(c, f) && pinRead(f, text, c.auditPath)) pinned(c, f, codeOf(f, text));
}

/** A program the file `f` downloads by its address is pinned by version and checksum (floor rule 7, as the core pins
 *  Node): where it is not, a pull request that adds the download, or that makes the file lose its pin, fails; a file the
 *  base held unpinned with no download fewer is reported, as is every one with no base (AGENTS.md, "Nothing locks a
 *  project"). Read from the scan's own readers of fetches: what a package manager fetches by name is not read here. */
// A file of the base, as text, or null where the base held none.
const atBase = (c, path) => { try { return execFileSync("git", ["show", `${c.base}:${path}`], { cwd: c.root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 }); } catch { return null; } };
// The audit's entries as the base held them, at the path the base's own config named it (a pull request may move it),
// read once for the scan.
function baseEntries(c) {
  if (c.baseEntries === undefined) { try { const a = JSON.parse(atBase(c, c.baseAudit ?? c.auditPath) ?? "null"); c.baseEntries = Array.isArray(a?.entries) ? a.entries : []; } catch { c.baseEntries = []; } }
  return c.baseEntries;
}
// Whether the base held the file `f` unpinned as much or more than `fault` says of `text`, read by the base's own audit,
// by counts alone, an allow-list of what may stand: no more downloads, no entry newly with no version, no check fewer.
// (A download's own words are not compared: telling one command from the next on a line needs a reader of the shell,
// and an unpinned download whose address changes is the same debt, reported, never a larger one.)
function heldAtBase(c, f, text, fault) {
  const was = atBase(c, f);
  const then = was === null ? null : pinFault(baseEntries(c), c.auditPath, f, codeOf(f, was));
  return then !== null && downloads(text).length <= downloads(codeOf(f, was)).length && fault.deficit <= then.deficit && fault.bare.every((n) => then.bare.includes(n));
}

function pinned(c, f, text) {
  const fault = pinFault(c.entries, c.auditPath, f, text);
  if (!fault) return;
  const held = !c.base || heldAtBase(c, f, text, fault);
  const said = `${f}: it downloads what may be a program (${downloads(text)[0].replace(/\s+/gu, " ").slice(0, 120)}), and ${fault.what}, so what runs is not pinned by version and checksum (floor rule 7)`;
  if (held) c.reports.push(`${said}; it stood so ${c.base ? "at the pull request's base" : "with no base to read it against"}, so it passes: ${fault.mend}, as the sync's step asks`);
  else c.fail(`${said}. Mend: ${fault.mend}`);
}

/** The scan of one tracked file `f` (scan, above): by what it is, and for a licence notice it carries. */
function scanned(c, f) {
  if (LOCKFILE.test(f) && !c.lockfiles.includes(f)) c.fail(`${f} installs packages the config's "lockfiles" does not name, so nothing checks their licences. Mend: name ${f} in the config's "lockfiles"`);
  const text = c.binary.has(f) ? "" : trackedText(c.root, f, c.fail);
  unaudited(c, f, byKind(c, f, text));
  pinnedIfRead(c, f, text);
  // (a notice in any file but prose, the notices a project writes itself among them: code copied in, in any language)
  if (!c.binary.has(f) && !PROSE_FILE.test(f) && NOTICE.test(text)) needFile(c, f, "a file carrying a licence notice", { own: false });
  if (ASSET.test(f) || c.binary.has(f)) needFile(c, f, c.binary.has(f) && !ASSET.test(f) ? "a binary file" : "a font, image, sound, video, model or data file");
}

/** The scan of the file `f`, holding `text`, by what it is (scanned, above): what it fetches by another fetcher that no
 *  entry of `c` audits by hand, which `unaudited` holds. */
function byKind(c, f, text) {
  const { other, runs } = readAs(c, f, text);
  c.others = [];
  if (runs) scanRunning(c, f, text);
  else if (/\.json[c5]?$/u.test(f) && f !== c.auditPath && !LOCKFILE.test(f)) scanJson(c, f, text);
  else if (other) scanOther(c, f);
  return c.others;
}
/** What the scan reads in the file `f`, holding `text`, as fetched by another fetcher that no entry of `entries` audits
 *  by hand, and nothing else it says of it: the step that lists what stood so reads it (step-checks-packages.mjs). */
export const unauditedIn = (settings, entries, auditPath, f, text) =>
  byKind({ settings, entries, auditPath, binary: new Set(), locks: [], fail() {}, reports: [] }, f, text);

/** How the scan reads the file `f` holding `text` (scanned, above): `other`, in a language it cannot read; `runs`, as
 *  shell, JavaScript or a page. */
function readAs(c, f, text) {
  // (a file with no extension, a hook or a script, is read by its #! line: as shell or JavaScript, or as a language the
  // scan cannot read; with none, as shell)
  const bare = !c.binary.has(f) && !/.\.\w+$/u.test(posix.basename(f)); // (".envrc" and the like have none either)
  const interpreter = bare && text.startsWith("#!") ? /^#!\s*\S*?(?:env\s+(?:-\S+\s+)*)?([\w.-]+)/u.exec(text.split("\n")[0].replace(/^#!\s*\S*\//u, "#!"))?.[1] ?? "" : "";
  const other = OTHER_LANGUAGE.test(f) || (bare && interpreter && !/^(sh|bash|dash|zsh|ksh|node|deno|bun|tsx|ts-node)$/u.test(interpreter));
  return { other, runs: !other && (SHELL.test(f) || JS.test(f) || WEB.test(f) || bare) };
}

/** A file that runs (scanned, above): the actions a workflow uses, and what its commands fetch. */
/** The code of a file that runs, as the scan reads it: a page's parts that run, and no line that is only a comment
 *  (a comment after code stays, since a # or // in a string is none). */
export function codeOf(f, text) {
  const comment = JS.test(f) || WEB.test(f) ? /^\s*\/\/.*$/u : /^\s*#.*$/u;
  // (lines end as Windows writes them too, or a comment there would be read as code)
  return (WEB.test(f) ? executable(text, f) : text).split(/\r?\n/u).map((l) => l.replace(comment, "")).join("\n");
}

function scanRunning(c, f, text) {
  const src = codeOf(f, text);
  if (YAML.test(f)) {
    for (const m of src.matchAll(/(?:^|[\s{,])['"]?uses['"]?\s*:\s*['"]?([^\s'",}]+)/gu)) {
      const used = m[1];
      if (used.startsWith("./") || used.startsWith(OWN)) continue;
      need(c, used.startsWith("docker://") ? used.split("@")[0] : used.split("@")[0].split("/").slice(0, 2).join("/"), f);
    }
  }
  fetches(c, src, f);
}

/** A script in a language the scan cannot read (scanned, above): the entries of what it uses cover it. */
function scanOther(c, f) {
  if (!byHand(c, f)) c.fail(`${f} is in a language the scan cannot read. Mend: name it in the "files" of the entries of what it uses`);
  else if (served(c, f) && !covering(c, f).every((e) => e.ships === true)) c.fail(`${f} (a script in a language the scan cannot read) reaches users, so every entry covering it ships. Mend: set "ships": true on each entry whose "files" covers it`);
}

/** A JSON file (scanned, above): the commands it holds, and, of a package.json, that a lockfile installs its
 *  dependencies. */
function scanJson(c, f, text) {
  let json;
  try { json = JSON.parse(text); } catch {
    // (a config with comments, as jsconfig.json and the like may hold: read whole, but a package.json must parse)
    if (posix.basename(f) === "package.json") c.fail(`${f} cannot be read as JSON, so the commands in it cannot be scanned. Mend: correct it to JSON`);
    else fetches(c, text.split(/\r?\n/u).map((l) => l.replace(/^\s*\/\/.*$/u, "")).join("\n"), f);
  }
  if (json === undefined) return;
  for (const line of linesIn(json, f, (g) => byHand(c, g), c.fail)) fetches(c, String(line), f, line.literal === true);
  const deps = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"].some((k) => Object.keys(json?.[k] ?? {}).length);
  if (posix.basename(f) === "package.json" && deps && !c.locks.some(({ dir, packages }) => f.startsWith(dir) && packages[posix.dirname(f.slice(dir.length)).replace(/^\.$/u, "")]))
    c.fail(`${f} has dependencies no lockfile the config names installs, so nothing checks their licences. Mend: write its lockfile with npm, by its install given --package-lock-only, and name it in the config's "lockfiles"`);
}
