// The NuGet check (floor rules 7 and 10, in floor/topics/ beside this folder), for a project whose packages come
// from NuGet (.NET): every package its lock files install, the ones packages pull in included, is one exact version
// and under a licence on its list. It reads two things, both NuGet's own: the project's lock files
// (packages.lock.json, which a project writes once it sets RestorePackagesWithLockFile), and each installed package's
// own manifest (its .nuspec) in the folder a restore from those lock files filled, so a package's licence is read
// from the package NuGet checked, never from a second place. It holds:
//   - that every project file git knows (.csproj, .fsproj, .vbproj) has its lock file beside it, and that every lock
//     file is named in the config as one whose packages ship or as one of tools that only run, so no project's packages
//     go unread. A lock file under another name (packages.<project>.lock.json, which NuGet takes before the plain one,
//     or a NuGetLockFilePath a project or build file names, or a file an Import in one brings in, or a property
//     MSBuild's own targets import a file by (CustomAfterMicrosoftCommonTargets and the like, BY_PROPERTY), or any file
//     of the project's whose root element is a Project, whatever brings it in (a publish profile); the workflow's
//     restore also sets that property empty for every project, wherever it was set) fails, and so do the older
//     packages.config, which has none, and a response file that gives every build options this check cannot read
//     (Directory.Build.rsp). So does a build file, or a file so brought in, that is not plain UTF-8, which MSBuild
//     reads by an encoding of its own, or that leads to no file of bytes (a link to a device, a submodule; a lock file
//     or a tools manifest that does fails as well, and is never read). A file so brought in, or one not plain UTF-8 or
//     no file, read only lately, is reported where the base held it as it stands, and brought it in by the same files
//     (core archive 207);
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
// names goes unseen, and such a folder stands in the pull request for the reviews to see); what a file an Import or
// such a property brings in sets where the check cannot know which file it is without the build (a property, a
// wildcard, an SDK's, a property's value that does not start at its own file's folder), or where git does not know it
// (each such Import or property is reported, and passes); whether the owner said what "accepted"
// quotes, which the reviews hold, the config being a protected file; a project of another kind than the three above;
// a tool a manifest of dotnet's names (dotnet-tools.json, in .config/ or in any folder), which no restore brings, save
// before the restore (--fetched, below); and what no lock file names at all (a tool a script installs, a font, an
// image), which the licence check's audit and scan hold. A restore runs the project's own build files, a pull
// request's too, which could change anything in the job this runs in, this script and the manifests included: so the
// licences of what the lock files name are read before it too (--fetched), and what a pull request does to its
// project files is the reviews' to read, as with every check that builds.
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
//   node core/scripts/nuget.mjs --imports      the files of another name than a build file's that an Import, or a
//                                               property MSBuild's own targets import a file by, brings in, and
//                                               every file of the project's whose root element is a Project,
//                                               a line each: what the workflow's first look adds to what it diffs
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
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, delimiter, dirname, isAbsolute, join, posix, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { acceptedList, yesFaults } from "./licence-yes.mjs";
import { leadsOut, oneLine, parseBounded } from "./guards.mjs";
import { MOVED_OFF, baseOf, configAt, licenceOk, loadConfig, movedOff, policy, textAt } from "./licences.mjs";
import { started } from "./started.mjs";
import { copyOf, projectAt } from "./core-path.mjs";

const PROJECT = /\.(?:cs|fs|vb)proj$/iu;
// Whether the commit `rev` held a file of its own (a regular file, never a folder, a link or a submodule of that name)
// at `file`, its name's case aside, as MSBuild on Windows finds a project's .user file whatever the case. The folder
// is read as a path, letter for letter (--literal-pathspecs): no name of it is taken for git's pathspec magic.
function fileAt(root, rev, file) {
  const dir = posix.dirname(file), name = posix.basename(file).toLowerCase();
  let entries = "";
  try { entries = execFileSync("git", ["--literal-pathspecs", "ls-tree", "-z", rev, ...(dir === "." ? [] : ["--", `${dir}/`])], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }); } catch { return false; }
  return entries.split("\0").some((e) => /^100(?:644|755) blob [0-9a-f]+\t/u.test(e) && posix.basename(e.slice(e.indexOf("\t") + 1)).toLowerCase() === name);
}
const LOCK = "packages.lock.json";
const OTHER_LOCK = /^packages\..+\.lock\.json$/iu; // NuGet takes packages.<project>.lock.json before the plain one
// where a project can name another lock file: a project file, a .props or .targets, and the .user file MSBuild imports
// beside a project file by itself
const BUILD_FILE = /\.(?:cs|fs|vb)proj(?:\.user)?$|\.props$|\.targets$/iu;
/**
 * The files a build file's Imports bring in, as each Import's Project names them (a list parted by ";", as MSBuild
 * reads one), each with whether its Import names an SDK, which MSBuild then finds the file in; and those a property
 * MSBuild's own targets import a file by names (BY_PROPERTY), with that property's name: [{ project, sdk, via }],
 * read in one pass from tag to tag: a comment, CDATA or a processing instruction is passed over whole, and a tag's
 * attributes, or a property's text, are read only within it, so no text, however long or unclosed, is read more than
 * once.
 */
// (an attribute's value as XML gives it to MSBuild: a line break or a tab is a blank, and a reference to a character
// is that character, so a ";" written as one parts a list; an entity XML does not know stays as written, and MSBuild
// would not read the file at all)
const xmlValue = (value) => value.replace(/\r\n?|[\t\n]/gu, " ").replace(/&(?:#([0-9]{1,7})|#x([0-9A-Fa-f]{1,6})|(amp|lt|gt|quot|apos));/gu, (whole, dec, hex, name) => {
  if (name) return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[name];
  const code = dec ? Number(dec) : parseInt(hex, 16);
  return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
});
// (the blanks .NET trims from each name of a list, as MSBuild does: a byte-order mark is no blank there)
const TRIM = /^[\p{Zs}\p{Zl}\p{Zp}\t-\r\u0085]+|[\p{Zs}\p{Zl}\p{Zp}\t-\r\u0085]+$/gu;
// (a property's text as XML gives it to MSBuild: a line break written CR LF is one, a reference to a character is that
// character; tabs and line breaks stay, and MSBuild trims each name of the list it is read as)
const xmlText = (text) => text.replace(/\r\n?/gu, "\n").replace(/&(?:#([0-9]{1,7})|#x([0-9A-Fa-f]{1,6})|(amp|lt|gt|quot|apos));/gu, (whole, dec, hex, name) => {
  if (name) return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[name];
  const code = dec ? Number(dec) : parseInt(hex, 16);
  return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
});
// the properties MSBuild's own targets and props import a file by, or the folder it imports files from, the project's
// own Directory.Build and Directory.Packages files among them: a file one names is brought in as an Import's is, and one
// whose value this check cannot know is reported (their names in any case, as MSBuild reads a property's). What any
// other property brings in is read by what it is (projectFilesByContent).
export const BY_PROPERTY = new Set(["CustomBeforeMicrosoftCommonProps", "CustomAfterMicrosoftCommonProps", "CustomBeforeMicrosoftCommonTargets",
  "CustomAfterMicrosoftCommonTargets", "CustomBeforeMicrosoftCommonCrossTargetingTargets", "CustomAfterMicrosoftCommonCrossTargetingTargets",
  "CustomBeforeMicrosoftCSharpTargets", "CustomAfterMicrosoftCSharpTargets", "CustomBeforeMicrosoftVisualBasicTargets", "CustomAfterMicrosoftVisualBasicTargets",
  "CustomBeforeMicrosoftFSharpTargets", "CustomAfterMicrosoftFSharpTargets", "CustomBeforeDirectoryBuildProps", "CustomAfterDirectoryBuildProps",
  "CustomBeforeDirectoryBuildTargets", "CustomAfterDirectoryBuildTargets", "DirectoryBuildPropsPath", "DirectoryBuildTargetsPath",
  "DirectoryPackagesPropsPath", "DirectorySolutionPropsPath", "DirectorySolutionTargetsPath", "_DirectoryBuildPropsFile", "_DirectoryBuildPropsBasePath",
  "_DirectoryBuildTargetsFile", "_DirectoryBuildTargetsBasePath", "_DirectoryPackagesPropsFile", "_DirectoryPackagesPropsBasePath", "NuGetRestoreTargets",
  "NuGetTargets", "LanguageTargets", "CodeAnalysisTargets", "ReportingServicesTargets", "MsTestToolsTargets", "MsAppxPackageTargets", "CSharpCoreTargetsPath",
  "CSharpDesignTimeTargetsPath", "CSharpTargetsPath", "VisualBasicCoreTargetsPath", "VisualBasicDesignTimeTargetsPath", "VisualBasicTargetsPath",
  "FSharpTargetsPath", "FSharpDesignTimeTargetsPath", "MSBuildUserExtensionsPath", "MSBuildExtensionsPath", "MSBuildExtensionsPath32",
  "MSBuildExtensionsPath64", "BeforeMicrosoftNETSdkTargets", "AfterMicrosoftNETSdkTargets", "AfterMicrosoftNetSdkProps", "AlternateCommonProps",
  "CustomBeforeRazorSdkTargets", "CustomAfterRazorSdkTargets", "CustomBeforeStaticWebAssetsSdkTargets", "CustomAfterStaticWebAssetsSdkTargets",
  "CustomBeforeBlazorWebAssemblySdkTargets", "CustomAfterBlazorWebAssemblySdkTargets", "CrossGenTargetsPath", "ILLinkTargetsPath", "ILCompilerTargetsPath",
  "WebPublishProfileFile", "PublishProfileFullPath"].map((x) => x.toLowerCase()));
export function imported(text) {
  const found = [];
  for (let i = text.indexOf("<"); i >= 0; i = text.indexOf("<", i)) {
    const past = passedOver(text, i);
    if (past !== null) { if (past < 0) break; i = past; continue; }
    const tag = /^<([A-Za-z_][A-Za-z0-9_.-]{0,99})(?![A-Za-z0-9_.:-])/u.exec(text.slice(i, i + 102));
    if (!tag) { i++; continue; }
    const end = tagEnd(text, i + tag[0].length);
    if (end >= text.length) break;
    const name = tag[1];
    if (name.toLowerCase() === "import") {
      importsIn(text.slice(i + tag[0].length, end), found);
      i = end + 1;
      continue;
    }
    i = end + 1;
    if (text[end - 1] === "/") continue;
    const j = propertyEnd(text, i, name, found);
    if (j < 0) break;
    i = j;
  }
  return found;
}
// (a comment, CDATA or a processing instruction is passed over whole: where the one at `i` ends, -1 where it does not,
// or null where none starts there)
const PASSED_OVER = [["<!--", "-->"], ["<![CDATA[", "]]>"], ["<?", "?>"]];
function passedOver(text, i) {
  for (const [open, close] of PASSED_OVER) {
    if (!text.startsWith(open, i)) continue;
    const end = text.indexOf(close, i + open.length);
    return end < 0 ? -1 : end + close.length;
  }
  return null;
}
// (where a tag's attributes, read from `from`, end: at its ">", one inside a quoted value passed over)
function tagEnd(text, from) {
  let end = from, quote = "";
  for (; end < text.length && (quote || text[end] !== ">"); end++) if (quote ? text[end] === quote : text[end] === '"' || text[end] === "'") quote = quote ? "" : text[end];
  return end;
}
// (the files an Import's attributes name in its Project, each with whether it names an SDK)
function importsIn(attributeText, found) {
  const ATTRIBUTE = /(?<![A-Za-z0-9_.:-])([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu;
  const attributes = [...attributeText.matchAll(ATTRIBUTE)], sdk = attributes.some((a) => a[1].toLowerCase() === "sdk");
  for (const a of attributes) if (a[1].toLowerCase() === "project") for (const x of xmlValue(a[2] ?? a[3]).split(";")) { const n = x.replace(TRIM, ""); if (n) found.push({ project: n, sdk }); }
}
// (a property's value, a list parted by ";": each name of one on the list, and of any other property each that starts at
// its own file's folder, which says only what brings in a project read for what it is)
function pieces(found, value, via, known) {
  for (const x of value.split(";")) { const name = x.replace(TRIM, ""); if (name && (known || /^\$\(MSBuildThisFileDirectory\)/iu.test(name))) found.push({ project: name, sdk: false, via, loose: !known }); }
}
// (an element's value, read from `i` past its tag, taken into `found` where it is a property's: where the reading goes
// on, at its next tag, or -1 where the text ends first)
function propertyEnd(text, i, name, found) {
  const { value, j, markup } = elementText(text, i);
  if (j < 0) return -1;
  // (its end tag, however many blanks before its ">"; anything else here is an element inside it, which MSBuild takes
  // into its value as markup)
  const lower = name.toLowerCase(), close = `</${lower}`;
  let k = j + close.length;
  const ends = text.slice(j, k).toLowerCase() === close;
  if (ends) while (k < text.length && " \t\r\n".includes(text[k])) k++;
  const leaf = ends && text[k] === ">" && !markup, known = BY_PROPERTY.has(lower);
  if (known && !markup) pieces(found, value, name, true);
  else if (leaf) pieces(found, value, name, false);
  // (what of a property on the list this check cannot read as MSBuild does is one it cannot know)
  if (known && !leaf) found.push({ project: "$(markup inside it)", sdk: false, via: name });
  return j;
}
// (the element's text up to its next tag: a comment in it is no text, CDATA is text as written; MSBuild reads the
// text as XML gives it where CDATA, if any, comes first, and otherwise takes it as the markup it is written in, which
// this check does not read): { value, j: where its next tag stands, or -1 where none does, markup }
function elementText(text, i) {
  let value = "", j = i, blank = true, cdataFirst = false, markup = false;
  for (;;) {
    const lt = text.indexOf("<", j);
    if (lt < 0) return { j: -1 };
    const part = xmlText(text.slice(j, lt));
    value += part;
    if (/[^ \t\r\n]/u.test(part)) blank = false;
    if (text.startsWith("<!--", lt)) { const close = text.indexOf("-->", lt + 4); if (close < 0) return { j: -1 }; j = close + 3; continue; }
    if (text.startsWith("<![CDATA[", lt)) {
      const close = text.indexOf("]]>", lt + 9);
      if (close < 0) return { j: -1 };
      if (blank) cdataFirst = true; else if (!cdataFirst) markup = true;
      blank = false;
      value += text.slice(lt + 9, close);
      j = close + 3;
      continue;
    }
    return { value, j: lt, markup };
  }
}
/** Where an Import in the build file `from` finds `project`, as git lists a path, beside `from` as MSBuild reads a
 *  relative one: "" for a path outside the project, null for one this cannot know without the build (a property other
 *  than $(MSBuildThisFileDirectory) at its start, which is `from`'s own folder, an item, an escape, an entity or a
 *  wildcard). */
export function importPath(from, project, { anchored = false } = {}) {
  // (the property ends in a separator, so one more after it is the same folder, never the top of a drive)
  const here = /^\$\(MSBuildThisFileDirectory\)/iu.exec(project);
  // (a property's value MSBuild's own targets import from their own folder, never `from`'s: only one that starts at
  // `from`'s own folder is known here)
  if (anchored && !here) return /^(?:[\\/]|[A-Za-z]:)/u.test(project) ? "" : null;
  let p = project.slice(here ? here[0].length : 0).replace(/\\/gu, "/");
  if (here) p = p.replace(/^\/+/u, "");
  if (/[$@%&*?]/u.test(p)) return null;
  if (p.startsWith("/") || /^[A-Za-z]:/u.test(p)) return "";
  const at = posix.normalize(posix.join(posix.dirname(from), p));
  return at === ".." || at.startsWith("../") ? "" : at;
}
/**
 * A build file's bytes as text, where they are plain UTF-8 as MSBuild would read them too: null for one MSBuild reads
 * by another encoding than this would (a UTF-16 or UTF-32 byte-order mark, another encoding its XML declaration names)
 * or that holds a NUL or bytes UTF-8 does not allow, since a name in it could read as another here than there. A
 * UTF-8 byte-order mark is passed over, and no file at all holds nothing.
 */
export function plainText(bytes) {
  if (bytes === null || bytes === undefined) return "";
  if (typeof bytes === "string") return bytes;
  const text = utf8Text(bytes);
  if (text === null) return null;
  const named = declaredEncoding(text);
  // (a file all of whose bytes are ASCII reads the same in any encoding that keeps ASCII as it is)
  return named === "utf-8" || named === "utf8" || (/^(?:us-ascii|ascii|iso-8859-[0-9]{1,2}|latin1|windows-125[0-8])$/u.test(named) && /^[\u0000-\u007f]*$/u.test(text)) ? text : null;
}
// (a file's bytes as UTF-8, past a UTF-8 byte-order mark: null where another one stands, a NUL, or bytes UTF-8 does
// not allow)
function utf8Text(bytes) {
  const b = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  if ((b[0] === 0xfe && b[1] === 0xff) || (b[0] === 0xff && b[1] === 0xfe) || b.includes(0)) return null;
  try { return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(b); } catch { return null; }
}
// (the encoding a file's XML declaration names, in lower case: UTF-8 where it names none)
function declaredEncoding(text) {
  const declared = /^<\?xml[ \t\r\n][^>]*?\bencoding[ \t\r\n]*=[ \t\r\n]*(?:"([^"]*)"|'([^']*)')/u.exec(text);
  return (declared?.[1] ?? declared?.[2] ?? "utf-8").toLowerCase();
}
/**
 * The build files among `own` (the project's files git knows, as git lists them), each read by `read` (its bytes, or
 * null where it is not there), and every file of another name that an Import in one of them, or in a file one brings in, brings in where git
 * knows it, its name's case aside, as MSBuild on Windows finds it: { files: each such file's path to its text,
 * brought: each file an Import brought in, to the files whose Imports bring it in, unread: each Import this cannot
 * follow, typed: the files with a document type, unreadable: those not plain UTF-8 (plainText), or no file at all
 * (NOT_A_FILE), to which of the two they are, whose Imports are not
 * read either }. A build file git knows is read as one,
 * whoever imports it. Each file is read once, and each place an Import leads to looked up once from each file.
 */
// (a file's text by its byte-order mark, as .NET's StreamReader reads one, bytes UTF-8 does not allow as U+FFFD: only to
// know what the file is, never to read what it names)
function markedText(b) {
  const utf32 = (x, little) => { const out = []; for (let i = 0; i + 3 < x.length; i += 4) { const c = little ? x.readUInt32LE(i) : x.readUInt32BE(i); out.push(c <= 0x10ffff && (c < 0xd800 || c > 0xdfff) ? String.fromCodePoint(c) : "\uFFFD"); } return out.join(""); };
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder("utf-8").decode(b.subarray(3));
  if (b[0] === 0xff && b[1] === 0xfe && b[2] === 0 && b[3] === 0) return utf32(b.subarray(4), true);
  if (b[0] === 0 && b[1] === 0 && b[2] === 0xfe && b[3] === 0xff) return utf32(b.subarray(4), false);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b.subarray(2));
  return new TextDecoder("utf-8").decode(b);
}
/** Whether a file's text is an MSBuild project, its root element a Project, past blanks, byte-order marks, comments,
 *  processing instructions and a document type, in one pass. */
export function projectRooted(text) {
  for (let i = 0; ;) {
    while (i < text.length && " \t\r\n\uFEFF".includes(text[i])) i++;
    if (text.startsWith("<?", i)) { const end = text.indexOf("?>", i + 2); if (end < 0) return false; i = end + 2; continue; }
    if (text.startsWith("<!--", i)) { const end = text.indexOf("-->", i + 4); if (end < 0) return false; i = end + 3; continue; }
    if (/^<!DOCTYPE/iu.test(text.slice(i, i + 9))) {
      i = doctypeEnd(text, i + 9);
      if (i < 0) return false;
      continue;
    }
    return /^<Project(?![A-Za-z0-9_.:-])/iu.test(text.slice(i, i + 9));
  }
}
// (a document type up to its own ">", past quoted strings, and an internal subset up to its "]", past quoted
// strings, comments and processing instructions, any of which may hold ">" or "]": where it ends, read from `from`,
// or -1 where it does not)
function doctypeEnd(text, from) {
  for (let j = from, subset = false; j < text.length; j++) {
    const c = text[j];
    if (c === '"' || c === "'") { const end = text.indexOf(c, j + 1); if (end < 0) return -1; j = end; continue; }
    if (subset && text.startsWith("<!--", j)) { const end = text.indexOf("-->", j + 4); if (end < 0) return -1; j = end + 2; continue; }
    if (subset && text.startsWith("<?", j)) { const end = text.indexOf("?>", j + 2); if (end < 0) return -1; j = end + 1; continue; }
    if (subset) { if (c === "]") subset = false; } else if (c === "[") subset = true; else if (c === ">") return j + 1;
  }
  return -1;
}
/**
 * The files among `own` of another name than a build file's whose root element is a Project, in whatever encoding a
 * byte-order mark gives: what MSBuild could import by any property of a project's own (a publish profile, a file an
 * SDK's targets import by a property this check does not list), read as a build file is. A file is opened only where
 * it is a file of bytes, and read whole only where its first character past blanks is "<".
 */
export function projectFilesByContent(root, own) {
  const out = [];
  for (const f of own) {
    if (BUILD_FILE.test(f)) continue;
    let fd = null;
    try {
      const at = join(root, f);
      if (leadsOut(root, at)) continue; // (a link that leads out of the project: no file of its own, never opened)
      const st = statSync(at);
      if (!st.isFile() || st.size === 0) continue;
      fd = openSync(at, "r");
      const head = Buffer.alloc(Math.min(st.size, 4096));
      readSync(fd, head, 0, head.length, 0);
      const start = markedText(head).replace(/^[ \t\r\n\uFEFF]+/u, "");
      if (start === "" ? st.size <= head.length : !start.startsWith("<")) continue;
      if (projectRooted(markedText(readFileSync(at)))) out.push(f);
    } catch { /* (a file that cannot be read is no project) */ } finally { if (fd !== null) closeSync(fd); }
  }
  return out;
}
// what a reader gives for a path git knows that leads to no file of bytes of the project's own (NOT_A_FILE_IS), which is
// never read: a device can be endless, a pipe never ends, and a file outside the project is none of its own (#446)
export const NOT_A_FILE = Symbol("not a file");
export const NOT_A_FILE_IS = "no file of bytes of the project's own (a link that leads out of the project, or to a device, a folder or a pipe)";
/** The bytes of the project's file at `f`, NOT_A_FILE where it leads to none, or null where it is not there. */
export function readProject(root, f) {
  try { if (leadsOut(root, join(root, f)) || !statSync(join(root, f)).isFile()) return NOT_A_FILE; return readFileSync(join(root, f)); } catch { return null; }
}
export function importsOf(own, read, roots = []) {
  const byName = new Map(), files = new Map(), brought = new Map(), unread = [], typed = [], unreadable = new Map();
  // (the files that bring in each place, one list for all the names git knows there in any case)
  const by = new Map();
  const take = (f) => {
    const bytes = read(f), text = bytes === NOT_A_FILE ? null : plainText(bytes);
    if (text === null) unreadable.set(f, bytes === NOT_A_FILE ? "not a file" : "not plain UTF-8");
    files.set(f, text ?? "");
  };
  for (const f of own) { const k = f.toLowerCase(); if (byName.has(k)) byName.get(k).push(f); else byName.set(k, [f]); }
  for (const f of [...own.filter((x) => BUILD_FILE.test(x)), ...roots]) if (!files.has(f)) take(f);
  const reading = { byName, files, brought, unread, by, take, roots };
  for (const [f, text] of files) {
    if (unreadable.has(f)) continue;
    // (a document type can name text that reads as a comment's start: its Imports are not read)
    if (/<!DOCTYPE/iu.test(text)) { typed.push(f); continue; }
    const looked = new Set();
    for (const one of imported(text)) followImport(reading, f, one, looked);
  }
  return { files, brought, unread, typed, unreadable };
}
// (where one Import, or property, in the file `f` leads, among the files git knows: taken in, reported as unread, or
// passed over)
function followImport(reading, f, { project, sdk, via, loose }, looked) {
  const { byName, unread } = reading;
  const at = sdk ? null : importPath(f, project, { anchored: Boolean(via) }), found = at ? byName.get(at.toLowerCase()) ?? [] : [];
  // (a build file git knows is read as one already; one an SDK's Import names by a plain path inside the SDK's
  // folder (no property, item, escape or wildcard, not rooted, no ".." part) is the SDK's own, as a Project's Sdk
  // attribute brings in; any other Import of a build file's name, through a property, out of the SDK's folder or
  // into the copy of the core, is reported as one of any other name is (#280))
  const sdkOwn = sdk && !/[$@%&*?]/u.test(project) && !/^(?:[\\/]|[A-Za-z]:)/u.test(project) && !project.split(/[\\/]/u).includes("..");
  if (BUILD_FILE.test(project.split(/[\\/]/u).pop()) && (sdkOwn || found.length)) return;
  // (any other property only says what brings in a project already read for what it is: nothing more is read)
  if (loose) { broughtByProperty(reading, f, found); return; }
  if (!found.length) unread.push({ from: f, project, via, why: at === null ? "a file whose path this check cannot know without the build" : "a path outside the project, or no file of the project's that git knows" });
  const key = at?.toLowerCase();
  if (!found.length || looked.has(key)) return;
  looked.add(key);
  bringIn(reading, f, key, found);
}
function broughtByProperty({ brought, roots }, f, found) {
  for (const g of found) if (roots.includes(g)) { if (!brought.has(g)) brought.set(g, new Set()); brought.get(g).add(f); }
}
// (the names git knows in every case are taken once, by the first file that brings them in; a file read already
// by what it is joins the files brought in all the same)
function bringIn({ by, files, brought, take }, f, key, found) {
  if (!by.has(key)) { by.set(key, new Set()); for (const g of found) { if (!files.has(g)) take(g); if (!brought.has(g)) brought.set(g, by.get(key)); } }
  by.get(key).add(f);
  for (const g of found) if (brought.get(g) !== by.get(key)) brought.get(g).add(f);
}
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
// what a lock entry that names a second content hash for a version is told: a restore keeps one file of each version
export const twoHashes = "a restore keeps one file of each version, so one entry would fail its hash and the check would read the other's licence. Mend: restore again so that each names the one file (floor rule 15)";
// what is said of something the check came to read only lately (a second content hash, a .user file, a tool a lock
// file also names) where the project held it as it stands before: reported, and passes (the owner's word, core archive
// 207: what a project held before a check read more is reported, not failed)
export const heldBefore = "(held before this check read it: reported, and passes)";
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
const shown = oneLine;

/** The config's "nuget", checked: { ships, tools, accepted, sources }. A key or a shape it does not know would check less. */
export function nugetConfig(config, copy = "core/") {
  const nuget = config?.nuget;
  if (!nuget || typeof nuget !== "object" || Array.isArray(nuget)) throw new Error('the config has no "nuget". Mend: add "nuget": { "ships": [...], "tools": [...] }, each list naming lock files');
  const odd = Object.keys(nuget).filter((k) => !["ships", "tools", "accepted", "sources"].includes(k));
  if (odd.length) throw new Error(`the config's "nuget" holds keys it does not know: ${odd.join(", ")}. Mend: take them out, or correct their spelling`);
  const paths = (name) => {
    const v = nuget[name] ?? [];
    const ok = (p) => typeof p === "string" && posix.normalize(p) === p && posix.basename(p) === LOCK && !p.startsWith("/") && !p.startsWith("../");
    if (!Array.isArray(v) || !v.every(ok)) throw new Error(`the config's "nuget.${name}" is not a list of ${LOCK} files in the project. Mend: write each as git lists it, from the project's root`);
    return v;
  };
  const ships = paths("ships"), tools = paths("tools");
  const twice = ships.filter((p) => tools.includes(p)).concat(ships.filter((p, i) => ships.indexOf(p) !== i), tools.filter((p, i) => tools.indexOf(p) !== i));
  if (twice.length) throw new Error(`the config's "nuget" names a lock file twice: ${[...new Set(twice)].join(", ")}. Mend: name each once, in "ships" or in "tools"`);
  const accepted = acceptedList(nuget.accepted, "nuget.accepted", /^[^@\s]+@[^@\s]+$/u, "<Id>@<version>", { same: (name) => name.toLowerCase() });
  const sources = nuget.sources ?? [];
  const source = (s) => typeof s === "string" && s.length <= 300 && (SOURCE_ADDRESS.test(s) || (SOURCE_FOLDER.test(s) && !s.toLowerCase().startsWith(copy.toLowerCase())));
  if (!Array.isArray(sources) || !sources.every(source)) throw new Error('the config\'s "nuget.sources" is not a list of sources: each an https address of a named host, with no sign-in or question in it, or a folder of the project\'s own, as git lists it, ending in "/". Mend: write each so, or take it out');
  const same = sources.map((s) => s.toLowerCase().replace(/\/$/u, ""));
  if (same.some((s, i) => same.indexOf(s) !== i || s === REGISTRY.toLowerCase())) throw new Error(`the config's "nuget.sources" names a source twice, or NuGet's own registry, which every restore takes from already. Mend: name each source once, and NuGet's registry not at all`);
  return { ships, tools, accepted, sources };
}

/** Where a restore takes packages from, in order: NuGet's own registry, then the sources the config names, a folder
 *  by its whole path under `root`, so that a restore reads it from wherever it is started. */
export const sourcesOf = (config, root) => [REGISTRY, ...nugetConfig(config, copyOf(root)).sources.map((s) => (s.startsWith("https://") ? s : resolve(root, s)))];

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
 * projects (type "Project") are no packages. What a project asks for itself must be the version installed, and one
 * version of a package is one file: its entries (one for each framework) name one content hash, and where they name
 * two, that is said apart (`split`), so a caller reports it where the lock file stands as the base held it.
 */
export function lockPackages(text, lockPath) {
  const failures = [], split = [], packages = new Map();
  let lock;
  try { lock = parseBounded(unmarked(text)); } catch { return { packages: [], failures: [`${lockPath} is not JSON. Mend: restore again to write the lock file anew (dotnet restore --force-evaluate), and commit it`], split }; }
  if (![1, 2].includes(lock?.version) || !lock.dependencies || typeof lock.dependencies !== "object" || Array.isArray(lock.dependencies)) {
    return { packages: [], failures: [`${lockPath} is no lock file this check knows (NuGet's version 1 or 2, with "dependencies"). Mend: restore again to write the lock file anew (dotnet restore --force-evaluate), and commit it`], split };
  }
  for (const [framework, entries] of Object.entries(lock.dependencies)) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) { failures.push(`${lockPath}, ${framework}: not a list of packages. Mend: restore again to write the lock file anew (dotnet restore --force-evaluate), and commit it`); continue; }
    for (const [id, entry] of Object.entries(entries)) lockEntry({ failures, split, packages }, `${lockPath}, ${framework}: ${id}`, id, entry);
  }
  return { packages: [...packages.values()], failures: failures.map(shown), split: split.map(shown) };
}
// (one entry of a lock file, `at` where it stands: the package it installs, and what is wrong with it)
function lockEntry({ failures, split, packages }, at, id, entry) {
  if (entry?.type === "Project") return;
  if (!["Direct", "Transitive", "CentralTransitive"].includes(entry?.type)) { failures.push(`${at}: a kind of entry this check does not know (${JSON.stringify(entry?.type)}). Mend: restore again to write the lock file anew (dotnet restore --force-evaluate), and commit it`); return; }
  const { resolved, requested, contentHash } = entry;
  if (!ID.test(id) || typeof resolved !== "string" || !VERSION.test(resolved)) { failures.push(`${at}: no package id and installed version it can read. Mend: restore again to write the lock file anew (dotnet restore --force-evaluate), and commit it`); return; }
  if (typeof contentHash !== "string" || !contentHash) failures.push(`${at}: no content hash, so a restore cannot hold it to the package it was (floor rule 15). Mend: restore again to write the lock file anew (dotnet restore --force-evaluate), and commit it`);
  if (entry.type !== "Transitive" && ![`[${resolved}, )`, `[${resolved}]`, `[${resolved}, ${resolved}]`].includes(requested)) {
    failures.push(`${at}: the project asks for ${typeof requested === "string" ? requested : "no version it can read"} and the lock installs ${resolved}. Mend: in the project file, ask for one exact version, the one installed, ${resolved} (floor rule 7), and restore again`);
  }
  const was = packages.get(key(id, resolved));
  // (the last entry is kept, as before this was said, so the file read is the one read then)
  if (was && was.contentHash !== contentHash) split.push(`${at}@${resolved}: named by two content hashes: ${twoHashes}`);
  packages.set(key(id, resolved), { id, version: resolved, contentHash });
}

/** Of the openings `next` holds, each with where it stands next in `text` (-2 where it is not yet looked for, -1 for
 *  none left), the one nearest from `at`, as [where, opening], or undefined: each looked for again only once the reading
 *  has passed it, so the text is read once however many of them it holds. */
function nearest(text, at, next) {
  let found;
  for (const [open, i] of next) {
    const now = i !== -1 && i < at ? text.indexOf(open, at) : i;
    next.set(open, now);
    if (now >= 0 && (!found || now < found[0])) found = [now, open];
  }
  return found;
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
  if (typeof text !== "string" || /<!DOCTYPE|<!ENTITY/iu.test(text) || text.includes(CUT) || text.includes(CDATA)) return { other: UNREAD };
  const plain = withoutNonElements(text.replace(/^\ufeff/u, "").replace(DECLARATION, ""));
  // (each "&" a reference XML knows, and no "]]>" but the end of CDATA)
  if (plain === null || AMPERSAND.test(plain) || plain.includes("]]>")) return { other: MALFORMED };
  const walk = elementsOf(plain);
  return walk.fault ?? licenceOf(walk.licences, walk.url);
}
// what a manifest gives where it is read no further
const UNREAD = "a manifest it will not read", MALFORMED = "a manifest that is not well formed";
// (what is no element is cut out first, each from its opening to its own end, in the order they stand, and a mark
// no manifest can hold is left where each stood: a comment holds no "--", and an instruction is named, never "xml";
// null where one is not well formed)
function withoutNonElements(text) {
  let plain = "", at = 0;
  const ends = { "<!--": "-->", "<![CDATA[": "]]>", "<?": "?>" };
  for (const next = new Map(Object.keys(ends).map((open) => [open, -2]));;) {
    const found = nearest(text, at, next);
    if (!found) return plain + text.slice(at);
    const end = text.indexOf(ends[found[1]], found[0] + found[1].length);
    if (end < 0) return null;
    const body = text.slice(found[0] + found[1].length, end);
    if (found[1] === "<!--" && (body.includes("--") || body.endsWith("-"))) return null;
    if (found[1] === "<?" && !/^(?!xml(?:[ \t\r\n]|$))[A-Za-z_][A-Za-z0-9_.-]*(?:[ \t\r\n]|$)/iu.test(body)) return null;
    plain += `${text.slice(at, found[0])}${found[1] === "<![CDATA[" ? CDATA : CUT}`;
    at = end + ends[found[1]].length;
  }
}
// (the elements of a manifest's text, its comments, CDATA and instructions cut out, tag by tag: { licences, url } for
// the licence elements directly under the metadata and whether a licence address stands there, or { fault } for what
// the manifest gives where it is read no further)
function elementsOf(plain) {
  const walk = { plain, stack: [], licences: [], prefixes: new Set(["xml"]), url: false, last: 0, open: null, roots: 0, metadatas: 0 };
  // (a name ends at XML's own blanks, a slash or the tag's end, and at nothing else)
  const tags = /<(\/?)([^ \t\r\n/<>]+)((?:"[^"]*"|'[^']*'|[^'"<>])*?)(\/?)>/gu;
  for (const tag of plain.matchAll(tags)) {
    const fault = tagFault(walk, tag) ?? (tag[1] ? closed(walk, tag) : opened(walk, tag));
    if (fault) return { fault };
    walk.last = tag.index + tag[0].length;
  }
  if (walk.stack.length || !gapOk(walk, plain.length)) return { fault: { other: MALFORMED } };
  return { licences: walk.licences, url: walk.url };
}
// (between two tags stands text, never a "<"; outside the root, nothing but blanks, a comment or an instruction)
function gapOk({ plain, last, stack }, to) {
  const gap = plain.slice(last, to);
  return !gap.includes("<") && (stack.length > 0 || /^[ \t\r\n\u0000]*$/u.test(gap));
}
// (what is wrong with a tag, by its name and its attributes, or null)
function tagFault(walk, tag) {
  if (!gapOk(walk, tag.index)) return { other: MALFORMED };
  const [, closing, name, attributes] = tag;
  // (a plain name, with no prefix; and no namespace declared below the root, so every element is in the root's)
  if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/u.test(name) || (attributes && !/^[ \t\r\n]/u.test(attributes))) return { other: UNREAD };
  // (no attribute twice, by its local name; a prefix only one the root declares, to a namespace, or xml)
  const pairs = [...attributes.matchAll(/([^ \t\r\n=]+)[ \t\r\n]*=[ \t\r\n]*(?:"([^"]*)"|'([^']*)')/gu)].map((m) => [m[1], m[2] ?? m[3]]);
  if (!ATTRIBUTES.test(attributes)) return { other: MALFORMED };
  if (!closing && !walk.stack.length && !rootPrefixes(walk.prefixes, pairs)) return { other: UNREAD };
  if (attributeTwice(pairs, walk.prefixes)) return { other: MALFORMED };
  if (!closing && walk.stack.length && /(?:^|[ \t\r\n])xmlns[ \t\r\n]*[:=]/u.test(attributes.replace(/"[^"]*"|'[^']*'/gu, '""'))) return { other: UNREAD };
  return null;
}
// (the prefixes the root declares, each to a namespace, and never xml or xmlns, taken into `prefixes`: false where one
// is not so)
function rootPrefixes(prefixes, pairs) {
  for (const [n, v] of pairs) if (n.startsWith("xmlns:") && (["xml", "xmlns"].includes(n.slice(6)) || !v)) return false; else if (n.startsWith("xmlns:")) prefixes.add(n.slice(6));
  return true;
}
// (whether an attribute stands twice, by its local name or by its whole, or has a prefix the root does not declare)
function attributeTwice(pairs, prefixes) {
  const named = pairs.map(([n]) => n).filter((n) => n !== "xmlns" && !n.startsWith("xmlns:"));
  if (new Set(named.map((n) => n.split(":").at(-1))).size !== named.length || named.some((n) => n.includes(":") && !prefixes.has(n.split(":")[0]))) return true;
  return new Set(pairs.map(([n]) => n)).size !== pairs.length;
}
// (an end tag: the element it closes, and the licence's text where it closes one)
function closed(walk, tag) {
  const [, , name, attributes, empty] = tag;
  if (empty || attributes.trim() || walk.stack.pop() !== name) return { other: MALFORMED };
  if (walk.open && walk.stack.length === 2) { walk.licences.push({ attributes: walk.open.attributes, body: walk.plain.slice(walk.open.from, tag.index) }); walk.open = null; }
  return null;
}
// (a start tag, or an empty one: one root, one metadata part, and the licence or its address where it stands in it)
function opened(walk, tag) {
  const [, , name, attributes, empty] = tag, { stack } = walk;
  if (!stack.length && ++walk.roots > 1) return { other: MALFORMED };
  if (stack.length === 1 && stack[0] === "package" && name === "metadata" && ++walk.metadatas > 1) return { other: "a manifest with two metadata parts" };
  const inMetadata = stack.length === 2 && stack[0] === "package" && stack[1] === "metadata";
  if (inMetadata && name === "license") { if (empty) walk.licences.push({ attributes, body: "" }); else walk.open = { attributes, from: tag.index + tag[0].length }; }
  if (inMetadata && name === "licenseUrl") walk.url = true;
  if (!empty) stack.push(name);
  return null;
}
// (the licence the licence elements found name, as manifestLicence gives it)
function licenceOf(licences, url) {
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
export const projectFiles = (tracked, copy = "core/") => tracked.filter((f) => !f.startsWith(copy) && PROJECT.test(f));

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
  const copy = copyOf(root), { ships, tools, accepted, sources } = nugetConfig(config, copy);
  const lists = policy(config), { allowedFor } = lists;
  const failures = [], reports = [];
  // (the check's own state, which the parts below read and add to)
  const c = { config, root, base, packagesDir, fetched, lists, allowedFor, ships, failures, reports, ...baseLists(base, baseConfig, sources, copy), heldIn: new Map(), tree: null, then: null };
  const own = tracked.filter((f) => !f.startsWith(copyOf(root)));
  const locks = new Set(own.filter((f) => posix.basename(f) === LOCK));
  layoutFaults(c, tracked, own, locks);
  buildFileFaults(c, own);
  for (const f of own.filter((f) => RESPONSE_FILE.test(posix.basename(f)))) failures.push(`${f}: a response file gives every build of its folder options this check cannot read. Mend: give them in the project files, and delete it`);
  // (a folder named as a source is the project's own, in the pull request for the reviews to read: every file in it is
  // one git knows, and none is a link that leads elsewhere)
  for (const s of sources.filter((x) => !x.startsWith("https://"))) {
    if (!own.some((f) => f.startsWith(s))) failures.push(`the config's "nuget.sources" names ${s}, a folder that holds no file git knows. Mend: correct the folder's path, or take it out of "nuget.sources"`);
    sourceFolderFaults(c, s, tracked);
  }
  // Where each package was taken from, as NuGet itself records it beside the package (.nupkg.metadata, read below):
  // NuGet's own registry, a source the config names, or the SDK's own folder of packages.
  c.givenSources = sourcesOf(config, root);
  c.folders = [...c.givenSources.filter((a) => !a.startsWith("https://")).map(place), ...sdkPacks(env, root)];
  const listed = [...ships, ...tools];
  for (const f of locks) if (!listed.includes(f)) failures.push(`${f} is named in neither "nuget.ships" nor "nuget.tools" of the config. Mend: name it in "nuget.ships" where its packages reach users, else in "nuget.tools"`);
  for (const f of listed) if (!locks.has(f)) failures.push(`the config's "nuget" names ${f}, which is no lock file git knows. Mend: correct the path, or take it out`);

  c.lockTexts = new Map();
  const packages = lockedPackages(c, listed, locks);
  const toolsRead = toolsNamed(c, own, packages);
  const unnamed = addRestored(c, packages);
  const entries = auditEntries(config, root);
  // (an entry is a NuGet package's only where it says so: one of the same name for anything else covers none)
  c.audited = new Map(entries.filter((e) => e && e.kind === "nuget" && typeof e.name === "string").map((e) => [e.name.toLowerCase(), e]));
  c.yes = new Map(accepted.map((a) => [a.package.toLowerCase(), a]));
  c.used = new Set();
  c.read = new Set();
  for (const [k, p] of packages) {
    const before = failures.length;
    try { judge(c, k, p); } finally {
      if (p.heldTool) reports.push(...failures.splice(before).map((f) => `${f} (a tool held before this check read tools: reported, and passes)`));
    }
  }
  for (const k of toolsRead) { c.used.add(k); c.read.add(k); }
  unusedFaults(c, accepted);
  const summary = summaryOf(c, packages, listed, unnamed);
  return { failures: failures.map(shown), reports: reports.map(shown), summary };
}

// (what a lock file held at the base, by id@version: a package under a licence the floor moved off the list that it
// held, in a lock file whose packages shipped then by the base's own config, is reported and passes; with no base to
// read, as licences.mjs reads it, it is reported and passes too)
// (where the base held no config at this one's path, or one this cannot read, nothing shipped there, and no tool is
// the base's; nor is one where the pull request changed the sources it may come from)
function baseLists(base, baseConfig, sources, copy) {
  let shippedThen = [], listedThen = [], sameSources = !base;
  try {
    if (baseConfig) {
      // (letter for letter: a folder's name, or an address's path, in another case may be another source)
      const then = nugetConfig(baseConfig, copy), list = (l) => [...l].sort().join("\n");
      shippedThen = then.ships; listedThen = [...then.ships, ...then.tools];
      sameSources = sameSources || list(then.sources) === list(sources);
    }
  } catch { /* (nothing shipped there) */ }
  return { shippedThen, listedThen, sameSources };
}
function shippedAtBase(c, lock, k) {
  if (!c.base) return true;
  if (!c.shippedThen.includes(lock)) return false;
  if (!c.heldIn.has(lock)) c.heldIn.set(lock, new Set(lockPackages(textAt(c.root, c.base, lock) ?? "", lock).packages.map((q) => key(q.id, q.version))));
  return c.heldIn.get(lock).has(k);
}

// (a project file with no lock file beside it, and a lock file this check does not read)
function layoutFaults({ root, failures }, tracked, own, locks) {
  for (const f of projectFiles(tracked, copyOf(root))) {
    if (!locks.has(posix.join(posix.dirname(f), LOCK))) failures.push(`${f} has no ${LOCK} beside it that git knows. Mend: set RestorePackagesWithLockFile to true in it, restore, and commit the lock file (floor rule 15)`);
  }
  for (const f of own.filter((f) => posix.basename(f).toLowerCase() === "packages.config")) failures.push(`${f}: packages.config has no lock file this check can read. Mend: move the project to PackageReference`);
  for (const f of own.filter((f) => OTHER_LOCK.test(posix.basename(f)))) failures.push(`${f}: a lock file under another name, which NuGet takes before ${LOCK} and this check does not read. Mend: name it ${LOCK}, the one name`);
}

// (each build file, and each file an Import brings in under another name, which the check reads only lately: what such
// a file names is reported where the base held it as it stands, brought in by every file that brings it in now; one
// a pull request adds, changes or brings into play with an Import of its own fails, as does what a build file names)
function buildFileFaults(c, own) {
  c.bytesNow = new Map();
  c.byContent = new Set(projectFilesByContent(c.root, own));
  c.now = importsOf(own, (f) => readNow(c, f), [...c.byContent]);
  for (const [f, text] of c.now.files) {
    const found = buildFileFindings(c.now, f, text);
    if (!found.length) continue;
    const held = heldAsBase(c, f);
    const named = c.now.brought.has(f) ? `${f}, which a build file brings in,` : f;
    for (const what of found) (held ? c.reports : c.failures).push(`${named} ${what}${held ? ` ${heldBefore}` : ""}`);
  }
  for (const f of c.now.typed) c.reports.push(`${f} has a document type, so this check does not read its Imports (reported, and passes)`);
  for (const { from, project, via, why } of c.now.unread) c.reports.push(`${from} ${via ? `brings in ${project} by ${via}` : `imports ${project}`}, ${why}: a lock file kept elsewhere or a fallback folder it names goes unseen (reported, and passes)`);
}
function readNow(c, f) {
  if (!c.bytesNow.has(f)) c.bytesNow.set(f, readProject(c.root, f));
  return c.bytesNow.get(f);
}
// (what is wrong with a build file, or a file one brings in, as it reads now)
function buildFileFindings(now, f, text) {
  return now.unreadable.get(f) === "not a file" ? [`is ${NOT_A_FILE_IS}: this check reads none, so what MSBuild would make of it is unseen. Mend: make it a file of the project's own, or remove it`]
    : now.unreadable.has(f) ? ["is not plain UTF-8 (a UTF-16 or UTF-32 byte-order mark, another encoding its XML declaration names, a NUL or bytes UTF-8 does not allow): MSBuild reads it by its own encoding, so this check cannot read what it names or imports. Mend: save it as UTF-8"] : [
    /NuGetLockFilePath/iu.test(text) && "names NuGetLockFilePath, and a lock file kept elsewhere is one this check does not read. Mend: take it out, keeping each lock file beside its project",
    /RestorePackagesPath|FallbackFolders/iu.test(text) && "names RestorePackagesPath or a fallback folder: packages restored to, or taken from, another folder are ones this check does not read. Mend: take it out",
    /TreatAsLocalProperty/iu.test(text) && "names TreatAsLocalProperty: with it a project sets for itself what the restore sets for every project, the folder and the lock file among them. Mend: take it out",
  ].filter(Boolean);
}
// (a .user file, read only lately, as the base held it beside a project file the base held too, which imports it:
// what it names is reported; one a pull request brings into play with a project file of its own is not held)
// (a file not plain UTF-8 the check reads only lately too: as the base held it, reported)
function heldAsBase(c, f) {
  const { now, base, byContent, root } = c;
  return now.brought.has(f) ? !base || (sameAsBase(c, f) && broughtThen(c, f))
    : /\.user$/iu.test(f) && BUILD_FILE.test(f) ? !base || (sameAsBase(c, f, false) && fileAt(root, base, f.replace(/\.user$/iu, "")))
    : (now.unreadable.has(f) || byContent.has(f)) && (!base || sameAsBase(c, f));
}
// (the base's files as MSBuild reads them: a link git knows is read through to the file it leads to, as a checkout
// that keeps links reads it now; one that leads out of the project, or to no file the base held, holds nothing)
function baseTree(c) {
  if (!c.tree) {
    let entries = "";
    try { entries = execFileSync("git", ["ls-tree", "-r", "-z", c.base], { cwd: c.root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 28 }); } catch { /* (no base to read: it held nothing) */ }
    c.tree = new Map();
    for (const e of entries.split("\0")) { const m = /^(100644|100755|120000|160000) (?:blob|commit) ([0-9a-f]+)\t(.*)$/su.exec(e); if (m && !m[3].startsWith(copyOf(c.root))) c.tree.set(m[3], { mode: m[1], id: m[2] }); }
  }
  return c.tree;
}
function bytesAt(c, f) { try { return execFileSync("git", ["show", `${c.base}:${f}`], { cwd: c.root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 28 }); } catch { return null; } }
// (the file a base's path leads to, a link git knows followed where `follow` says so: its path, or null)
function baseFile(c, file, follow = true) {
  for (let f = file, hops = 0; hops < 40; hops++) {
    const entry = baseTree(c).get(f);
    if (!entry || entry.mode === "160000") return null;
    if (entry.mode !== "120000") return f;
    const to = follow ? bytesAt(c, f)?.toString("utf8") : null;
    if (!to || to.startsWith("/") || /^[A-Za-z]:/u.test(to)) return null;
    f = posix.normalize(posix.join(posix.dirname(f), to));
    if (f === ".." || f.startsWith("../")) return null;
  }
  return null;
}
function baseBytes(c, file) { const f = baseFile(c, file); return f === null ? null : bytesAt(c, f); }
function broughtThen(c, f) {
  // (the base's own projects read by what they are: each of today's that the base held as a project too)
  if (!c.then) c.then = importsOf([...baseTree(c).keys()], (g) => baseBytes(c, g), [...c.byContent].filter((g) => { const b = baseTree(c).has(g) ? baseBytes(c, g) : null; return b !== null && projectRooted(markedText(b)); })).brought;
  return [...c.now.brought.get(f)].every((by) => c.then.get(f)?.has(by));
}
// (whether a file stands as the base held it, byte for byte, as MSBuild reads it: as the base's blob, save the line
// endings a checkout writes for itself (core.autocrlf on Windows), which XML reads as one; or as git checks that blob
// out under the base's own attributes (an encoding, a filter the machine's git holds), never the pull request's, whose
// .gitattributes could point a filter at a file to make other bytes read as the base's)
const lf = (bytes) => Buffer.from(bytes.toString("latin1").replace(/\r\n/gu, "\n"), "latin1");
function sameAsBase(c, f, follow = true) {
  const here = readNow(c, f);
  if (here === NOT_A_FILE) return sameEntryAsBase(c, f);
  const at = baseFile(c, f, follow), was = at === null ? null : bytesAt(c, at);
  if (was === null || here === null) return false;
  if (was.equals(here) || lf(was).equals(lf(here))) return true;
  let out;
  try { out = execFileSync("git", [`--attr-source=${c.base}`, "cat-file", "--filters", `${c.base}:${at}`], { cwd: c.root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 28, timeout: 60000 }); } catch { return false; }
  return out.equals(here) || lf(out).equals(lf(here));
}
// (a path to no file of bytes, a link or a submodule, stands as the base held it where git holds the same entry at
// it as the base did)
function sameEntryAsBase(c, f) {
  const was = baseTree(c).get(f);
  if (!was) return false;
  let entry = "";
  try { entry = execFileSync("git", ["--literal-pathspecs", "ls-files", "-s", "-z", "--", f], { cwd: c.root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return false; }
  return entry.split("\0").some((e) => e.endsWith(`\t${f}`) && e.startsWith(`${was.mode} ${was.id} `));
}

// (every file in a folder named as a source, `dir`, is one git knows, and none is a link)
function sourceFolderFaults(c, dir, tracked) {
  let entries = [];
  try { entries = readdirSync(join(c.root, dir), { withFileTypes: true }); } catch { /* (a folder that is not there holds nothing) */ }
  for (const e of entries) {
    const at = `${dir}${e.name}`;
    if (e.isSymbolicLink()) c.failures.push(`${at}: a link, in a folder the config names as a source: what it leads to is not what the pull request shows. Mend: put the file itself there`);
    else if (e.isDirectory()) sourceFolderFaults(c, `${at}/`, tracked);
    else if (!tracked.includes(at)) c.failures.push(`${at}: a file git does not know, in a folder the config names as a source: a restore would take packages the pull request does not show. Mend: add it to git, or delete it`);
  }
}
// (whether a source NuGet recorded is one the restore was given: an address, or a folder, as the system spells it)
const takenFromGiven = (c, source) => (/^https?:/iu.test(source) ? c.givenSources.includes(source) : c.folders.includes(place(source)));

// (the packages the lock files the config lists install, and what is wrong with each lock file)
function lockedPackages(c, listed, locks) {
  const packages = new Map(); // by id@version, lower case: { id, version, shipped, lock }
  for (const f of listed.filter((l) => locks.has(l))) {
    const text = lockText(c, f);
    if (text === null) continue;
    const read = lockPackages(text, f);
    c.failures.push(...read.failures);
    if (lockAsBase(c, f, text)) c.reports.push(...read.split.map((x) => `${x} ${heldBefore}`)); else c.failures.push(...read.split);
    for (const p of read.packages) {
      const k = key(p.id, p.version), shipped = c.ships.includes(f), was = packages.get(k);
      // (the entry kept is the one kept before this was said, so the file read is the one read then)
      if (was && was.contentHash !== p.contentHash) {
        const x = shown(`${f}: ${p.id}@${p.version} named by another content hash than in ${was.lock}: ${twoHashes}`);
        if (lockAsBase(c, f, text) && lockAsBase(c, was.lock, lockText(c, was.lock))) c.reports.push(`${x} ${heldBefore}`); else c.failures.push(x);
      }
      if (!was || (shipped && !was.shipped)) packages.set(k, { ...p, shipped, lock: f });
    }
  }
  return packages;
}
// (a lock file as the base held it, and listed by the base's config, so this check read it there: two content hashes
// it already named are reported; one a pull request lists for the first time is not held)
const lockAsBase = (c, f, text) => !c.base || (c.listedThen.includes(f) && textAt(c.root, c.base, f) === text);
// (a lock file or a tools manifest is read only where it is a file of bytes: a device would never end)
function lockText(c, f) {
  if (!c.lockTexts.has(f)) {
    const bytes = readProject(c.root, f);
    if (bytes === NOT_A_FILE) c.failures.push(`${f} is ${NOT_A_FILE_IS}, and this check reads none. Mend: make it a file of the project's own`);
    c.lockTexts.set(f, bytes === NOT_A_FILE ? null : bytes?.toString("utf8") ?? "");
  }
  return c.lockTexts.get(f);
}

// the tools a manifest of dotnet's names, read before the restore alone (no restore brings them), each held to the
// tools' list, one exact version each (nuget-fetch.mjs fetched them); after the restore, a yes or an audit entry for
// one of them stands, since the check before it read that tool
function toolsNamed(c, own, packages) {
  const toolsRead = new Set();
  for (const f of own.filter((t) => posix.basename(t).toLowerCase() === "dotnet-tools.json")) {
    let manifest = {};
    const text = lockText(c, f);
    if (text === null) continue;
    try { manifest = parseBounded(unmarked(text)); } catch { if (c.fetched) (!c.base || textAt(c.root, c.base, f) === text ? c.reports : c.failures).push(`${f} is not JSON`); }
    if (!c.fetched) {
      for (const [id, entry] of Object.entries(manifest?.tools ?? {})) if (typeof entry?.version === "string") toolsRead.add(key(id, entry.version));
      continue;
    }
    addTools(packages, f, manifest, toolsBefore(c, f));
  }
  return toolsRead;
}
// (a tool the base's manifest already held at that version was never checked before this release: what is wrong
// with it is reported and passes, so that no sync fails a project over it; one a pull request adds or updates is
// held to the list)
function toolsBefore(c, f) {
  try { return !c.base ? null : !c.sameSources ? new Set() : new Set(Object.entries(JSON.parse(unmarked(textAt(c.root, c.base, f) ?? "{}"))?.tools ?? {}).map(([id, e]) => key(id, String(e?.version)))); } catch { return new Set(); }
}
function addTools(packages, f, manifest, before) {
  for (const [id, entry] of Object.entries(manifest?.tools ?? {})) {
    if (ID.test(id) && typeof entry?.version === "string" && VERSION.test(entry.version) && !packages.has(key(id, entry.version))) packages.set(key(id, entry.version), { id, version: entry.version, shipped: false, lock: f, tool: true, heldTool: before === null || before.has(key(id, entry.version)) });
  }
}
// what the restore brought that no lock file read here names: held like what ships, with no lock to say otherwise
function addRestored({ packagesDir, fetched }, packages) {
  let unnamed = 0;
  for (const r of packagesDir && !fetched ? restoredPackages(packagesDir) : []) {
    if (!packages.has(key(r.id, r.version))) { unnamed++; packages.set(key(r.id, r.version), { id: r.id, version: r.version, shipped: true, lock: null }); }
  }
  return unnamed;
}
// (the entries of the audit the config names, or none)
function auditEntries(config, root) {
  let entries = [];
  if (config.audit) {
    const bytes = readProject(root, config.audit);
    if (bytes === NOT_A_FILE) throw new Error(`${config.audit} is ${NOT_A_FILE_IS}. Mend: make it a file of the project's own`);
    try { entries = parseBounded(bytes === null ? readFileSync(join(root, config.audit), "utf8") : bytes.toString("utf8")).entries; } catch { throw new Error(`${config.audit} cannot be read as JSON. Mend: write the audit there as JSON, { "entries": [...] }, or correct the config's "audit"`); }
    if (!Array.isArray(entries)) throw new Error(`${config.audit} has no "entries" list. Mend: write it as { "entries": [...] }`);
  }
  return entries;
}

// (one package, `k` its id@version: its source and its licence, held to its list, an audit entry or the owner's yes)
function judge(c, k, p) {
  const { config, packagesDir, failures } = c;
  const name = `${p.id}@${p.version}`, list = p.shipped ? "the list for what ships" : "the tools' list";
  const where = p.lock ?? "brought by the restore, and named in no lock file read here";
  const manifest = join(packagesDir ?? "", p.id.toLowerCase(), p.version.toLowerCase(), `${p.id.toLowerCase()}.nuspec`);
  // (before the restore, one the fetch could not reach is read after it: the fetch said so)
  if (c.fetched && (!packagesDir || !existsSync(manifest))) { c.used.add(k); c.read.add(k); return; }
  if (!packagesDir || !existsSync(manifest)) { failures.push(`${name} (${where}): its manifest is not in the restore's folder, so its licence cannot be read. Mend: restore from the lock files first (dotnet restore --locked-mode), then run the check`); return; }
  takenFaults(c, name, where, manifest);
  const licence = manifestLicence(readFileSync(manifest, "utf8"));
  const entry = c.audited.get(k), a = c.yes.get(k);
  // (the lists hold a package as a package: a name the config gives data or a font, for npm's, widens nothing here)
  const allowed = c.allowedFor(p.id, p.shipped, null);
  const why = licence.expression !== undefined ? expressionWhy(c, { k, p, name, where, list, licence, entry, a, allowed }) : byHandWhy(c, { k, p, name, list, licence, entry, a, allowed });
  if (why === null) return;
  if (a) {
    c.used.add(k);
    failures.push(...yesFaults(name, a, p.shipped, [licence.expression, entry?.licence], c.lists, '"nuget.accepted"'));
    if (entry) failures.push(`${name}: named in "nuget.accepted" and in ${config.audit} both, and an accepted package stands in "nuget.accepted" alone, since the licence check holds every audit entry to its list. Mend: take its entry out of ${config.audit}`);
    return;
  }
  failures.push(`${name} (${where}): ${why}`);
}
// (where NuGet took it from, by NuGet's own record of this restore: nothing a project file says is read for it)
function takenFaults(c, name, where, manifest) {
  let taken;
  try { taken = JSON.parse(readFileSync(join(dirname(manifest), TAKEN), "utf8"))?.source; } catch { /* (no record) */ }
  if (typeof taken !== "string" || !taken) c.failures.push(`${name} (${where}): the restore left no record of where it took it from (${TAKEN}), so its source cannot be read. Mend: restore again from the lock files (dotnet restore --locked-mode) into an empty folder`);
  else if (!takenFromGiven(c, taken)) c.failures.push(`${name} (${where}): the restore took it from ${taken}, which is neither NuGet's own registry nor a source the config's "nuget.sources" names (floor rule 7). Mend: take the package from NuGet's registry, or name its source in "nuget.sources" where the project keeps it`);
}
// (why a package whose manifest names an SPDX expression fails, or null where it passes or is reported)
function expressionWhy(c, { k, p, name, where, list, licence, entry, a, allowed }) {
  const { config, failures } = c;
  if (entry) { c.read.add(k); failures.push(`${name}: ${config.audit} holds an entry for it, and its manifest names its licence itself (${licence.expression}). Mend: take that entry out of ${config.audit}`); }
  if (licenceOk(licence.expression, allowed)) { if (a) { c.used.add(k); failures.push(`"nuget.accepted" names ${a.package}, which is on its list and needs no yes. Mend: take that yes out of "nuget.accepted"`); } return null; }
  if (!a && p.shipped && p.lock && movedOff(licence.expression, allowed) && shippedAtBase(c, p.lock, k)) {
    c.reports.push(`${name} (${where}) ships under ${licence.expression}, which since ${[...MOVED_OFF].filter(([id]) => licence.expression.includes(id)).map(([id, day]) => `${day} (${id})`).join(", ")} waits for the owner's yes (floor rule 10): ${c.base ? "shipped at the pull request's base" : "with no base to read it against"}, it passes; file an issue for the owner, who gives the yes in "nuget.accepted" or has it replaced`);
    return null;
  }
  return `${licence.expression} is off ${list}. Mend: replace it with a package under a licence on that list; or, where the owner wants it anyway, file an issue asking the owner\'s yes, which goes in the config\'s "nuget.accepted" with the owner\'s words (floor rule 10)`;
}
// (why a package whose manifest names no licence a machine can read fails, or null where its audit entry passes it)
function byHandWhy(c, { k, p, name, list, licence, entry, a, allowed }) {
  const { config, failures } = c;
  if (p.shipped) {
    // (what ships under a licence only a reading by hand gives waits for the owner's yes, whatever was read)
    if (entry) { c.read.add(k); if (!a) failures.push(`${name}: it ships, so ${config.audit} holds no entry for it, its licence read by hand standing in "nuget.accepted" with the owner's yes. Mend: take the entry out, and file an issue asking the owner's yes`); }
    return `it ships, and its manifest names ${licence.other}, no licence a machine can read, and what ships under a licence read by hand waits for the owner's yes (floor rule 10). Mend: read the licence by hand, and file an issue asking the owner's yes, which goes in the config's "nuget.accepted" with the licence as it was read`;
  }
  if (!entry) return `its manifest names ${licence.other}, no licence a machine can read. Mend: read it by hand and record it in ${config.audit ?? "the audit"} as "${name}", of "kind": "nuget"`;
  c.read.add(k);
  if (typeof entry.licence !== "string") return `its entry in ${config.audit} names no licence. Mend: give the entry the licence read by hand`;
  if (licenceOk(entry.licence, allowed)) { if (a) { c.used.add(k); failures.push(`${name}: named in "nuget.accepted" and in ${config.audit} both, and the entry is on its list. Mend: take the yes out of "nuget.accepted"`); } return null; }
  return `${entry.licence}, as ${config.audit} records it, is off ${list}. Mend: replace it with a package under a licence on that list; or, where the owner wants it anyway, file an issue asking the owner\'s yes, which goes in the config\'s "nuget.accepted" with the owner\'s words (floor rule 10)`;
}

// (before the restore, a yes or an entry may be for what only the restore brings: the check after it holds those)
function unusedFaults(c, accepted) {
  if (c.fetched) return;
  for (const a of accepted) if (!c.used.has(a.package.toLowerCase())) c.failures.push(`"nuget.accepted" names ${a.package}, which nothing installs. Mend: take that yes out of "nuget.accepted"`);
  for (const [k, e] of c.audited) if (!c.read.has(k)) c.failures.push(`${c.config.audit}: the entry ${e.name}, of "kind": "nuget", is for no package whose licence had to be read by hand. Mend: take the entry out of ${c.config.audit}`);
}
function summaryOf(c, packages, listed, unnamed) {
  const all = [...packages.values()], named = all.filter((p) => p.lock), shipped = named.filter((p) => p.shipped).length;
  return `${named.length} NuGet packages in ${listed.length} lock files checked (${shipped} in what ships, ${named.length - shipped} tools that only run)` +
    `${unnamed ? `, and ${unnamed} more that the restore brought and no lock file names` : ""}${c.fetched ? ", read before the restore" : ""}, ${[...c.used].filter((k) => packages.has(k) && c.yes.has(k)).length} accepted on the owner's yes;${c.reports.length ? ` ${c.reports.length} reported, and passing;` : ""} ${c.failures.length} failing (floor rules 7 and 10)`;
}

if (started(import.meta.url)) {
  const fail = (msg) => { console.error(`FAIL: ${shown(msg)}`); process.exit(1); };
  const args = process.argv.slice(2), advisory = args.includes("--advisory");
  const here = fileURLToPath(new URL(".", import.meta.url));
  const project = () => {
    const root = projectAt(here).root || execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: here, encoding: "utf8" }).trim();
    return { root, tracked: execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean) };
  };
  if (args.includes("--projects")) {
    let files;
    try { const p = project(); files = projectFiles(p.tracked, copyOf(p.root)); } catch (e) { fail(e.message); }
    // (a line each, for a shell to read: a name that would be more than one line is refused, never cut)
    const odd = files.filter((f) => shown(f) !== f);
    if (odd.length) fail(`a project file whose name holds a line break or a control character: ${odd.join(", ")}. Mend: rename it`);
    for (const f of files) console.log(f);
    process.exit(0);
  }
  if (args.includes("--imports")) {
    let files;
    try {
      const { root, tracked } = project(), copy = copyOf(root), own = tracked.filter((f) => !f.startsWith(copy)), byContent = projectFilesByContent(root, own);
      files = [...new Set([...byContent, ...importsOf(own, (f) => readProject(root, f), byContent).brought.keys()])];
    } catch (e) { fail(e.message); }
    const odd = files.filter((f) => shown(f) !== f);
    if (odd.length) fail(`a file an Import brings in whose name holds a line break or a control character: ${odd.join(", ")}. Mend: rename it`);
    for (const f of files) console.log(f);
    process.exit(0);
  }
  const at = args.indexOf("--packages"), packagesDir = at >= 0 ? args[at + 1] : undefined;
  const configPath = args.find((a, i) => !a.startsWith("--") && (at < 0 || i !== at + 1));
  if (args.includes("--sources")) {
    if (!configPath) fail("no config was named. Mend: name it: node core/scripts/nuget.mjs <config> --sources");
    let from;
    try { from = sourcesOf(loadConfig(configPath), project().root); } catch (e) { fail(e.message); }
    for (const s of from) console.log(s);
    process.exit(0);
  }
  if (!configPath || !packagesDir) fail("the config or the restore's folder was not named. Mend: name both: node core/scripts/nuget.mjs <config> --packages <folder> [--advisory]");
  // (the config is read only where it is a file of bytes: a device would never end)
  try { if (!statSync(configPath).isFile()) fail(`${configPath} is no file of bytes (a link to a device, a folder or a pipe). Mend: make it a file`); } catch { /* (one that is not there fails as it is loaded) */ }
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
