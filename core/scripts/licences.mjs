// The licence check (floor rule 10, in floor/topics/licences.md beside this folder), for every project that takes the core:
// every package its lockfiles install, the ones packages pull in included, and every entry of its audit (what no
// lockfile holds: a script loaded from elsewhere, a font, an image, a tool a script installs), each held to its list.
// What ships is held to floor rule 10's list, read from floor/topics/licences.md itself, so the list stands in one place; a tool
// that only runs, to the tools' list: every licence the Open Source Initiative approves (OSI below), one on the same
// terms, and everything what ships may be under. CC-BY is allowed only for what is named as data or assets, OFL only
// for fonts, as the floor says. No licence, or an expression it cannot read, fails. It needs no install: the config's
// form is its schema's (scripts/schemas/licences.json, read by ajv; #530) where the core's packages are installed, and
// its own checks' (configLists, configPaths and configScan) where they are not. It checks the project it lies in
// (core/scripts/ there), whatever the directory it is started from; the config's own path is read from that directory,
// the paths inside it from the project's root.
//
//   node core/scripts/licences.mjs <config>            the check
//   node core/scripts/licences.mjs <config> --action   the dependency review's lists, as lines for $GITHUB_OUTPUT
//
// The config, a JSON file the project keeps (its SECURITY.md names it under rule 10; protected like the check), names:
// "lockfiles", the npm lockfiles whose every package is checked; "ships", the package.json files (each beside one of
// those lockfiles) whose runtime dependencies, and those of the workspaces it declares, ship ([] if no package ships);
// "data" and "fonts", the packages checked by hand to be data or assets, or fonts; "audit", the project's audit of what
// no lockfile holds, a JSON file whose "entries" each have a "name", a "licence", "ships": true if it ships, and
// "kind": "data", "asset" or "font" where that widens its list ("github-service" with LicenseRef-GitHub-Terms: one of
// GitHub's own services, GITHUB_SERVICES below, which never ships; "own" with LicenseRef-Owner: the owner's own work,
// all rights reserved, as floor rule 10 ends), and "notice", its notice; "notices", the third-party notices file that
// ships, where the project keeps one (every entry that ships, but the owner's own, is named in it; without one, each
// such entry has its "notice", for the notices the project builds, as floor rule 10 asks); "ignoreScriptsIn", the
// .npmrc files that must keep packages' own install scripts off (floor rule 15) and set the week's wait, which npm
// reads as min-release-age=7 (floor rule 7: one that stood without it is reported, one a pull request adds or takes it
// out of fails); and "scan", which folders reach users,
// for the scan that nothing used is left out of the audit (licence-scan.mjs, beside this file, which says what it
// finds). Every .npmrc in the project may hold only settings that leave where npm fetches from alone, since a data or
// font package is known by its registry address. "accepted" holds what is off its list and the owner wants anyway,
// each with the owner's yes (licence-yes.mjs, beside this file, says how one is written and what it never takes in).
// A project whose packages come from NuGet names its lock files under "nuget", which the NuGet check reads (nuget.mjs,
// beside this file) with this file's lists, the same audit and an "accepted" of its own.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { inProject, leadsOut, logged, parseBounded } from "./guards.mjs";
import { scan } from "./licence-scan.mjs";
import { acceptedList, yesFaults } from "./licence-yes.mjs";
import { shapeFaults } from "./schemas.mjs";
import { started } from "./started.mjs";
import { projectAt } from "./core-path.mjs";

// Every licence the Open Source Initiative approves, as the SPDX licence list marks them (isOsiApproved, deprecated ids
// left out; the list of 28 October 2026). Left out: BSD-ask-to-endorse, newer than the SPDX list the pinned dependency
// review knows, which refuses every list holding an id it does not know; a tool under it is a question for the owner
// until that action is updated.
const OSI = [
  "0BSD", "AAL", "AFL-1.1", "AFL-1.2", "AFL-2.0", "AFL-2.1", "AFL-3.0", "AGPL-3.0-only", "AGPL-3.0-or-later",
  "ALGLIB-Documentation", "Apache-1.1", "Apache-2.0", "APL-1.0", "APSL-1.0", "APSL-1.1", "APSL-1.2", "APSL-2.0",
  "Artistic-1.0", "Artistic-1.0-cl8", "Artistic-1.0-Perl", "Artistic-2.0", "BlueOak-1.0.0", "BSD-1-Clause",
  "BSD-2-Clause", "BSD-2-Clause-Patent", "BSD-3-Clause", "BSD-3-Clause-LBNL", "BSD-3-Clause-Open-MPI", "BSL-1.0",
  "CAL-1.0", "CAL-1.0-Combined-Work-Exception", "CATOSL-1.1", "CDDL-1.0", "CDDL-1.1", "CECILL-2.1", "CERN-OHL-P-2.0",
  "CERN-OHL-S-2.0", "CERN-OHL-W-2.0", "CNRI-Python", "CNRI-Python-GPL-Compatible", "CPAL-1.0", "CPL-1.0",
  "CUA-OPL-1.0", "curl", "ECL-1.0", "ECL-2.0", "EFL-1.0", "EFL-2.0", "Entessa", "EPL-1.0", "EPL-2.0", "EUDatagrid",
  "EUPL-1.1", "EUPL-1.2", "Fair", "Frameworx-1.0", "GPL-2.0-only", "GPL-2.0-or-later", "GPL-3.0-only",
  "GPL-3.0-or-later", "HPND", "ICU", "Intel", "IPA", "IPL-1.0", "ISC", "Jam", "LGPL-2.0-only", "LGPL-2.0-or-later",
  "LGPL-2.1-only", "LGPL-2.1-or-later", "LGPL-3.0-only", "LGPL-3.0-or-later", "LiLiQ-P-1.1", "LiLiQ-R-1.1",
  "LiLiQ-Rplus-1.1", "LPL-1.0", "LPL-1.02", "LPPL-1.3c", "MirOS", "MIT", "MIT-0", "MIT-Modern-Variant", "Motosoto",
  "MPL-1.0", "MPL-1.1", "MPL-2.0", "MPL-2.0-no-copyleft-exception", "MS-PL", "MS-RL", "MulanPSL-2.0", "Multics",
  "NASA-1.3", "Naumen", "NCSA", "NGPL", "Nokia", "NPOSL-3.0", "NTP", "OCLC-2.0", "OFL-1.1", "OFL-1.1-no-RFN",
  "OFL-1.1-RFN", "OGTSL", "OLDAP-2.8", "OLFL-1.3", "OSC-1.0", "OSET-PL-2.1", "OSL-1.0", "OSL-2.0", "OSL-2.1",
  "OSL-3.0", "PHP-3.0", "PHP-3.01", "PostgreSQL", "Python-2.0", "Python-2.0.1", "QPL-1.0", "RPL-1.1", "RPL-1.5",
  "RPSL-1.0", "RSCPL", "SimPL-2.0", "SISSL", "Sleepycat", "SPL-1.0", "UCL-1.0", "Unicode-3.0", "Unicode-DFS-2016",
  "Unlicense", "UPL-1.0", "VSL-1.0", "W3C", "W3C-20150513", "Watcom-1.0", "WordNet", "Xnet", "Zlib", "ZPL-2.0",
  "ZPL-2.1",
];
// "On the same terms" (the floor's example, matplotlib's licence); "the public domain", as npm packages write it, and,
// for data, the Open Data Commons dedication; GitHub's own services an audit may name, under GitHub's terms.
const SAME_TERMS = ["PSF-2.0"];
const PUBLIC_DOMAIN = { any: ["Public Domain"], data: ["PDDL-1.0"] };
const GITHUB_SERVICES = new Set(["CodeQL CLI", "GitHub's commit signing key"]);
const GITHUB_TERMS = "LicenseRef-GitHub-Terms";
const OWNER = "LicenseRef-Owner";
// What the floor never allows on either list or by any yes (non-commercial, no-derivatives and source-available
// terms, by the ids and the words they go by), and copyleft, never in what ships: a guard on the lists themselves.
const NEVER = new RegExp([
  "(^|[^a-z])(NC|ND|FSL)([^a-z]|$)", "non[-_ ]?commercial", "no[-_ ]?deriv", "BUSL", "business[-_ ]?source", "SSPL", "server[-_ ]?side",
  "(^|[^a-z])BSL(?![-_ ]?1\\.0)", // (the floor's "BSL", as the Business Source License is also written; BSL-1.0 is Boost's, on the list)
  "elastic", "commons[-_ ]?clause", "polyform", "functional[-_ ]?source", "source[-_ ]?available",
].join("|"), "iu");
const COPYLEFT = /GPL|MPL|EPL|CDDL|-SA(-|$)|MS-PL/iu;
// Licences the floor moved off the list for what ships, each with the day it moved (core archive 201): from then on
// what ships under one waits for the owner's yes, save what a project already shipped at the pull request's base (in
// the same lock file, shipped there by the base's own config, or in its audit as it stands), which is reported and
// passes, so that no sync fails a project over what it holds (the core's AGENTS.md, "Nothing locks a
// project"); one a pull request adds, updates or moves into what ships waits, that pull request alone.
export const MOVED_OFF = new Map([["MS-PL", "13 November 2026"]]);
/** Whether an expression off a list would pass but for a licence the floor moved off it. */
export function movedOff(expression, allow) {
  try { return !licenceOk(expression, allow) && licenceOk(expression, new Set([...allow, ...MOVED_OFF.keys()])); } catch { return false; }
}
/** A file's text at a commit of the repository at `root`, or null where git cannot give it. */
export function textAt(root, rev, file) {
  try { return execFileSync("git", ["show", `${rev}:${file}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 28 }); } catch { return null; }
}
/** The config at `path` as the commit `rev` held it, parsed, or null where it held none git can give as JSON. */
export function configAt(root, rev, path) {
  if (!rev) return null;
  try { const c = JSON.parse(textAt(root, rev, relative(root, resolve(path)).split(sep).join("/"))); return c && typeof c === "object" && !Array.isArray(c) ? c : null; } catch { return null; }
}
/** The base a pull request's checkout is read against: the first parent of GitHub's merge of it, or null. */
export function baseOf(root) {
  try { execFileSync("git", ["rev-parse", "-q", "--verify", "HEAD^2"], { cwd: root, stdio: "ignore" }); return "HEAD^1"; } catch { return null; }
}

/** Floor rule 10's list for what ships, read from its own words: { any, data, fonts, publicDomain }. */
export function floorList(file = new URL("../floor/topics/licences.md", import.meta.url)) {
  const text = readFileSync(file, "utf8").replace(/\s+/gu, " ");
  const found = /\*\*10\. Licences.*? is under (.+?); never copyleft/u.exec(text);
  if (!found) throw new Error("floor/topics/licences.md: rule 10's list for what ships (\"is under ...; never copyleft\") is not there. Mend: take the floor's topics/licences.md back as the core holds it (in a project, node core/scripts/sync.mjs <the pin>, which writes core/ whole)");
  const lists = { any: [], data: [], fonts: [], publicDomain: false };
  for (const piece of found[1].split(", ")) {
    const [, ids, purpose] = /^(?:or )?(.+?)(?: \(for ([^)]+)\))?$/u.exec(piece);
    if (ids === "the public domain") { lists.publicDomain = true; continue; }
    const key = { undefined: "any", "data and assets": "data", fonts: "fonts" }[purpose];
    if (!key) throw new Error(`floor/topics/licences.md, rule 10: a purpose it does not know: "${purpose}". Mend: take the floor's topics/licences.md back as the core holds it (in a project, node core/scripts/sync.mjs <the pin>, which writes core/ whole)`);
    for (const id of ids.split(" and ")) {
      if (!/^[A-Za-z0-9][A-Za-z0-9.+-]*$/u.test(id)) throw new Error(`floor/topics/licences.md, rule 10: "${id}" is not a licence id. Mend: take the floor's topics/licences.md back as the core holds it (in a project, node core/scripts/sync.mjs <the pin>, which writes core/ whole)`);
      lists[key].push(id);
    }
  }
  if (lists.any.length < 5) throw new Error("floor/topics/licences.md, rule 10: its list for what ships reads as almost empty. Mend: take the floor's topics/licences.md back as the core holds it (in a project, node core/scripts/sync.mjs <the pin>, which writes core/ whole)");
  return lists;
}

/**
 * The two lists by what reaches users, each widened for what is named as data or assets (CC-BY) or fonts (OFL), never
 * across: `allowedFor(name, shipped, kind)`, where `kind` ("data", "asset", "font") is an audit entry's, and a package
 * counts as data or a font only when the config names it. `tools` is the tools' list, for the dependency review;
 * `never`, what no list and no yes takes in.
 */
export function policy(config = {}) {
  const floor = floorList();
  const pd = floor.publicDomain ? PUBLIC_DOMAIN : { any: [], data: [] };
  const shipped = new Set([...floor.any, ...pd.any]);
  const tools = new Set([...OSI, ...SAME_TERMS, ...shipped]);
  const dataExtra = [...floor.data, ...pd.data];
  const never = [...tools, ...dataExtra, ...floor.fonts].filter((id) => NEVER.test(id));
  const copyleft = [...shipped, ...dataExtra, ...floor.fonts].filter((id) => COPYLEFT.test(id));
  if (never.length) throw new Error(`on a list, though floor rule 10 never allows it: ${never.join(", ")}. Mend: take the floor's topics/licences.md back as the core holds it (in a project, node core/scripts/sync.mjs <the pin>, which writes core/ whole)`);
  if (copyleft.length) throw new Error(`copyleft on the list for what ships: ${copyleft.join(", ")}. Mend: take the floor's topics/licences.md back as the core holds it (in a project, node core/scripts/sync.mjs <the pin>, which writes core/ whole)`);
  const widen = (base, extra) => new Set([...base, ...extra]);
  const sets = {
    shipped: { any: shipped, data: widen(shipped, dataExtra), font: widen(shipped, floor.fonts) },
    tools: { any: tools, data: widen(tools, dataExtra), font: widen(tools, floor.fonts) },
  };
  const data = new Set(config.data ?? []), fonts = new Set(config.fonts ?? []);
  return {
    allowedFor: (name, isShipped = true, kind = undefined) => {
      const set = isShipped ? sets.shipped : sets.tools;
      if (kind === "data" || kind === "asset" || (kind === undefined && data.has(name))) return set.data;
      if (kind === "font" || (kind === undefined && fonts.has(name))) return set.font;
      return set.any;
    },
    tools: [...tools].filter((id) => !pd.any.includes(id)).sort(),
    never: NEVER,
  };
}

/**
 * Whether an SPDX expression is allowed: read with its brackets, one side of an OR enough and every part of an AND
 * needed. AND and OR mixed without brackets (which SPDX reads with AND first, a reader perhaps not), an exception
 * (WITH) or anything unreadable is refused: a blank but a space within it, a character beyond printable ASCII, or a
 * WITH with no exception's name after it. A space, a tab or a line's end at its ends is read past, as before, so that
 * no lock file's field written with one newly fails. tests/readers-test.mjs, in the core's own tests, holds it to SPDX's own parser.
 */
export function licenceOk(expression, allow) {
  if (typeof expression !== "string") return false;
  expression = expression.replace(/^[ \t\r\n]+|[ \t\r\n]+$/gu, "");
  if (!expression || /[^\x20-\x7e]/u.test(expression)) return false;
  if (allow.has(expression)) return true;
  const tokens = expression.match(/\(|\)|[^ ()]+/gu) ?? [];
  let at = 0;
  const level = () => {
    const oks = [term()];
    let op;
    while (tokens[at] === "AND" || tokens[at] === "OR") {
      if (op && tokens[at] !== op) throw new Error("AND and OR mixed without brackets");
      op = tokens[at++];
      oks.push(term());
    }
    return op === "OR" ? oks.some(Boolean) : oks.every(Boolean);
  };
  const term = () => {
    const token = tokens[at++];
    if (token === "(") {
      const ok = level();
      if (tokens[at++] !== ")") throw new Error("unbalanced");
      return ok;
    }
    if (token === undefined || [")", "AND", "OR", "WITH"].includes(token)) throw new Error("unexpected token");
    if (tokens[at] === "WITH") {
      const exception = tokens[at + 1] ?? "";
      at += 2;
      if (!/^[A-Za-z0-9][A-Za-z0-9.-]*$/u.test(exception) || /^(?:AND|OR|WITH)$/iu.test(exception)) throw new Error("no exception's name");
      return false;
    }
    return allow.has(token);
  };
  try {
    const ok = level();
    return at === tokens.length && ok;
  } catch {
    return false;
  }
}

/** The package a registry tarball address names (`https://registry.npmjs.org/<name>/-/<file>.tgz`), or undefined: only
 *  an address in its one plain form, which a URL parser reads as it is written, and a name of the characters npm's
 *  names are spelled in, never starting with a dot or an underscore, so the name read is the package the address
 *  fetches. The pattern alone refuses every address a URL parser would rewrite; the parser's own reading is asked as
 *  well, so that a change to the pattern cannot let one through. */
export function registryName(resolved) {
  const match = /^https:\/\/registry\.npmjs\.org\/((?:@[A-Za-z0-9~-][\w.~-]*\/)?[A-Za-z0-9~-][\w.~-]*)\/-\/[A-Za-z0-9~-][\w.~+-]*\.tgz$/u.exec(resolved ?? "");
  if (!match) return undefined;
  try { return new URL(resolved).href === resolved ? match[1] : undefined; } catch { return undefined; }
}

/** The version a registry tarball address names (`.../-/<name>-<version>.tgz`, the name without its scope), or undefined. */
export function registryVersion(resolved) {
  const name = registryName(resolved);
  if (name === undefined) return undefined;
  const file = resolved.slice(resolved.lastIndexOf("/") + 1, -4), base = name.slice(name.indexOf("/") + 1);
  return file.startsWith(`${base}-`) ? file.slice(base.length + 1) : undefined;
}

/**
 * The lockfile paths of everything a package.json's runtime dependencies, and its workspaces', pull in, worked out from
 * the package.json files (`manifest(dir)`, dir "" for its own), not the lockfile's `dev` flags; each name resolved as
 * Node resolves it, from the nearest node_modules folder up. Peer and optional dependencies count, since they may be
 * bundled. Each package's own `dependencies` and `license` are the lockfile's, as npm wrote them: npm checks a
 * package's bytes against the lockfile, never those fields. Where the signatures workflow installs from a lockfile,
 * licence-installed.mjs, beside this file, reads each `license` back from the installed package; a hand edit to the
 * `dependencies` is a review finding.
 */
export function shippedPaths(packages, workspaces, manifest) {
  const deps = (m) => Object.keys({ ...m.dependencies, ...m.optionalDependencies, ...m.peerDependencies });
  const resolve = (from, name) => {
    for (let dir = from; ; dir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/node_modules/")) : "") {
      const path = dir ? `${dir}/node_modules/${name}` : `node_modules/${name}`;
      if (packages[path]) return path;
      if (!dir || !dir.includes("/node_modules/")) return packages[`node_modules/${name}`] ? `node_modules/${name}` : undefined;
    }
  };
  const seen = new Set();
  const queue = ["", ...workspaces].flatMap((ws) => deps(manifest(ws)).map((name) => resolve(ws, name)));
  while (queue.length) {
    const path = queue.pop();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const entry = packages[path];
    const real = entry.link ? entry.resolved : path;
    queue.push(...deps(entry.link ? manifest(real) : entry).map((name) => resolve(real, name)));
  }
  return seen;
}

// The lines of an `.npmrc` as npm reads them: split at each line feed and each carriage return, alone or together,
// after a leading byte-order mark. A line that holds a line or paragraph separator reads otherwise to npm than to the
// patterns below, so it is never one of the settings they vouch for: listed, and never counted as set. Every other
// space npm trims as they do, so a line that holds neither separator nor a lone carriage return reads as before.
const npmrcLines = (npmrc) => npmrc.replace(/^\uFEFF/u, "").split(/[\r\n]+/u);
const plain = (line) => !/[\u2028\u2029]/u.test(line);

/**
 * The lines of an `.npmrc` that are not one of a few settings known to leave where npm fetches from alone: npm reads
 * keys in many spellings (quoted, scoped, from variables), so anything else, a registry or `replace-registry-host` above
 * all, is listed, and `registryName` only vouches for what npm really fetches.
 */
export function registryOverrides(npmrc) {
  const harmless = /^((fund|audit|update-notifier|engine-strict|save-exact|progress|loglevel)\s*=\s*[\w.-]*|ignore-scripts\s*=\s*true|min-release-age\s*=\s*\d{1,5})$/u;
  return npmrcLines(npmrc).filter((l) => l.trim() && !/^[#;]/u.test(l.trim()) && !(plain(l) && harmless.test(l.trim()))).map((l) => l.trim());
}

/** Whether an `.npmrc` keeps packages' own install scripts off (floor rule 15): `ignore-scripts=true`, never undone. */
export function scriptsOff(npmrc) {
  return npmrcLines(npmrc).some((l) => plain(l) && /^ignore-scripts\s*=\s*true$/u.test(l.trim()));
}

/** The week's wait an `.npmrc` sets (floor rule 7: a new release is taken once it is WAIT days old): the days its last
 *  `min-release-age` line gives, which npm reads from version 11.10 on, or null where it gives none. */
export function releaseAge(npmrc) {
  const days = npmrcLines(npmrc).map((l) => (plain(l) ? /^min-release-age\s*=\s*(\d{1,5})$/u.exec(l.trim())?.[1] : undefined)).filter(Boolean).at(-1);
  return days === undefined ? null : Number(days);
}
export const WAIT = 7;

/** Each file of "ignoreScriptsIn" that sets no wait of WAIT days or more, as { failures, reports }: one that held the
 *  wait at `base`, or that `base` did not hold, fails, and one that stood without it is reported, as with no base at all
 *  (AGENTS.md, "Nothing locks a project": the sync's step asks the line). */
function waitFaults(root, base, files) {
  const failures = [], reports = [];
  for (const f of files) {
    const text = existsSync(join(root, f)) ? ownText(root, f) : "";
    if ((releaseAge(text) ?? 0) >= WAIT) continue;
    const was = base ? textAt(root, base, f) : null;
    const said = `${f} does not set min-release-age=${WAIT}, so npm may take a release under a week old where a session adds or updates a package (floor rule 7)`;
    if (base && (was === null || (releaseAge(was) ?? 0) >= WAIT)) failures.push(`${said}. Mend: add the line min-release-age=${WAIT} to ${f}`);
    else reports.push(`${said}; it stood so ${base ? "at the pull request's base" : "with no base to read it against"}, so it passes: add the line min-release-age=${WAIT} to ${f}, as the sync's step asks`);
  }
  return { failures, reports };
}

/** A file of the project's own at `f`, from its root `root`, as text: one reached through a link that leads out of the
 *  project is refused, never read. */
function ownText(root, f) {
  if (leadsOut(root, join(root, f))) throw new Error(`${f} is reached through a link that leads out of the project, so it is not read. Mend: make it a file of the project's own, in place of the link`);
  return readFileSync(join(root, f), "utf8");
}

/** What every npm config file of the project sets that is not allowed: each line, or the file, where a link leads it
 *  out of the project, which is not read. */
function npmrcFailures(root) {
  return npmrcFiles(root).flatMap((f) => {
    if (leadsOut(root, join(root, f))) return [`${f} is reached through a link that leads out of the project, so it is not read. Mend: make it a file of the project's own, in place of the link, or take it out`];
    return registryOverrides(readFileSync(join(root, f), "utf8")).map((l) => `${f}: npm setting not allowed (a package is known by the npm registry it comes from): ${l}. Mend: take that line out of ${f}`);
  });
}

/** Every npm config file under `root` (`.npmrc`, or any name ending in it), but in `node_modules` and `.git`. */
function npmrcFiles(root, dir = "") {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => {
    if (e.name === "node_modules" || e.name === ".git") return [];
    const path = dir ? `${dir}/${e.name}` : e.name;
    return e.isDirectory() ? npmrcFiles(root, path) : /npmrc$/iu.test(e.name) ? [path] : [];
  });
}

/** One spelling for every path in a config ("./package.json" is "package.json"), so "ships" matches its lockfile's. */
function normalised(config) {
  const out = { ...config };
  for (const key of ["lockfiles", "ships", "ignoreScriptsIn"]) if (Array.isArray(out[key])) out[key] = out[key].map((p) => posix.normalize(p));
  if (typeof out.audit === "string") out.audit = posix.normalize(out.audit);
  return out;
}

// An npm package and its one exact version, as "accepted" names it: "<name>@<version>", a scope before the name or none.
const ACCEPTED_NPM = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*@[0-9][0-9A-Za-z.+-]*$/u;

/** The config, read and checked: a key it does not know, or one of the wrong shape, would check less without a word. */
export function loadConfig(path) {
  let config = configRead(path);
  configShape(config);
  within(config);
  config = normalised(config);
  const beside = (config.lockfiles ?? []).map((f) => posix.join(posix.dirname(f), "package.json"));
  const loose = config.ships.filter((m) => !beside.includes(m));
  if (loose.length) throw new Error(`"ships" names a file that is no package.json beside a lockfile: ${loose.join(", ")}. Mend: name the package.json beside one of "lockfiles", or take it out`);
  const npmName = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/u;
  const odd = [...(config.data ?? []), ...(config.fonts ?? [])].filter((n) => !npmName.test(n));
  if (odd.length) throw new Error(`"data" or "fonts" names what is no npm package name: ${odd.join(", ")}. Mend: name each package as npm does`);
  acceptedList(config.accepted, "accepted", ACCEPTED_NPM, "<name>@<version>", { entries: true });
  if ((config.accepted ?? []).some((a) => a.entry !== undefined) && !config.audit) throw new Error('the config\'s "accepted" names an audit entry, and the config names no "audit". Mend: name the audit\'s file in "audit", or take that yes out');
  return config;
}

/** The config at `path`, read as JSON: a JSON object, or refused. */
function configRead(path) {
  let config;
  try { config = JSON.parse(readFileSync(path, "utf8")); } catch { throw new Error(`cannot read the config ${path} as JSON. Mend: name the config the licence workflow is given, and write it as JSON`); }
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("the config is not a JSON object. Mend: write it as one, as the starter kit writes it");
  return config;
}

const NOTHING = 'the config names nothing to check. Mend: name the lockfiles in "lockfiles", or the audit\'s file in "audit"';

/** The config's form: its schema's, the first fault refused, where ajv is installed; else the checks below. Then, either
 *  way, what a schema cannot say: that it names something to check, and that each path of its scan is written as git
 *  lists it. */
function configShape(config) {
  const faults = shapeFaults("licences", config);
  if (faults === null) {
    configLists(config);
    configPaths(config);
    if (config.scan !== undefined) configScan(config);
  } else if (faults.length) throw new Error(faults[0]);
  if (!config.lockfiles?.length && !config.audit) throw new Error(NOTHING);
  for (const key of ["served", "tools", "skip"]) {
    if (!(config.scan?.[key] ?? []).every((p) => scanPathOk(key, p))) throw new Error(`the config's "scan.${key}" is not a list of paths in the project. Mend: list each as a path from the project's root`);
  }
}

/** The config's keys, each one it knows, its lists each a list of names, and "ships" among them. */
function configLists(config) {
  const lists = ["lockfiles", "ships", "data", "fonts", "ignoreScriptsIn"];
  // ("nuget" is the NuGet check's own, which reads and checks it: nuget.mjs, beside this file; "agentTools" the agent-tools
  // check's: agent-tools.mjs)
  const unknown = Object.keys(config).filter((k) => !lists.includes(k) && !["audit", "notices", "scan", "nuget", "accepted", "agentTools"].includes(k));
  if (unknown.length) throw new Error(`the config holds keys it does not know: ${unknown.join(", ")}. Mend: take them out, or correct their spelling`);
  for (const key of lists) {
    const v = config[key];
    if (v !== undefined && (!Array.isArray(v) || v.some((x) => typeof x !== "string" || !x))) throw new Error(`the config's "${key}" is not a list of names. Mend: correct it in the config: a list of non-empty strings`);
  }
  if (!Array.isArray(config.ships)) throw new Error('the config does not say what ships. Mend: add "ships", the package.json of each lockfile whose packages reach users, or "ships": [] if none does');
}

/** The config's "audit" and "notices", each a path where it stands, and something named to check. */
function configPaths(config) {
  if (config.audit !== undefined && (typeof config.audit !== "string" || !config.audit)) throw new Error('the config\'s "audit" is not a path. Mend: name the audit\'s file, or take "audit" out');
  if (!config.lockfiles?.length && !config.audit) throw new Error(NOTHING);
  if (config.notices !== undefined && (typeof config.notices !== "string" || !config.notices || !config.audit)) throw new Error('the config\'s "notices" is not a path, or the config names no "audit" whose entries it holds. Mend: name the notices file by its path, beside an "audit", or take "notices" out');
}

/** The config's "scan": an object of lists of paths in the project, saying what reaches users, beside an "audit". */
function configScan(config) {
  const { scan: s } = config;
  if (!s || typeof s !== "object" || Array.isArray(s)) throw new Error('the config\'s "scan" is not a JSON object. Mend: write it as one: { "served": [...], "skip": [...] }');
  const odd = Object.keys(s).filter((k) => !["served", "tools", "skip"].includes(k));
  if (odd.length) throw new Error(`the config's "scan" holds keys it does not know: ${odd.join(", ")}. Mend: take them out, or correct their spelling`);
  for (const key of ["served", "tools", "skip"]) {
    const v = s[key];
    if (v !== undefined && (!Array.isArray(v) || !v.every((p) => scanPathOk(key, p)))) throw new Error(`the config's "scan.${key}" is not a list of paths in the project. Mend: list each as a path from the project's root`);
  }
  if (!Array.isArray(s.served)) throw new Error('the config\'s "scan" does not say what reaches users. Mend: add "served", the folders whose files reach users, or "served": [] if none does');
  if (!config.audit) throw new Error('the config\'s "scan" needs an "audit" to hold what it finds. Mend: name the audit\'s file in "audit"');
}

// (each written as git lists it: "site/" for a folder, never "./site/" or "site//", which would match nothing)
function scanPathOk(key, p) {
  return typeof p === "string" && (p === "" ? key === "served" : posix.normalize(p) === p && p !== "." && !p.startsWith("/") && !p.startsWith("../"));
}

/** The config's paths, each held to the project: one rooted, or with a ".." that leads above the project's root, is
 *  refused, and, given the project's `root`, so is one whose file is reached through a link that leads out of it: the
 *  config, where none is. */
function within(config, root) {
  const named = [...(config.lockfiles ?? []), ...(config.ships ?? []), ...(config.ignoreScriptsIn ?? []), config.audit, config.notices].filter((p) => p !== undefined);
  const out = named.filter((p) => !inProject(p) || (root !== undefined && leadsOut(root, join(root, p))));
  if (out.length) throw new Error(`the config names a path outside the project: ${out.map((p) => logged(p)).join(", ")}. Mend: name each file by its path from the project's root, with no ".." that leads above it, and make it a file of the project's own, reached through no link that leads out of it`);
  return config;
}

/** Whether a lock file names an entry as npm writes one: "" for the project itself, else folders joined by "/", none
 *  of them empty, "." or "..", and no backslash. A key of any other form is read one way here and perhaps another by
 *  an install, so a lock file that holds one is refused whole. */
export const lockPathOk = (path) => path === "" || (!path.includes("\\") && path.split("/").every((part) => part !== "" && part !== "." && part !== ".."));

/** Whether a lock entry is a package an install puts into a folder: the one test for every reader of a lock file. */
export const lockInstalled = (path) => path.includes("node_modules/");

/** A project's workspaces, by the paths its package.json (`pkg`, read; `where`, its name in a message) names: each by
 *  its path, never a pattern, so every reader of the lock file takes the same ones as the project's own. */
export function workspacesIn(pkg, where) {
  const named = pkg?.workspaces ?? [];
  if (!Array.isArray(named) || named.some((w) => typeof w !== "string" || /[*?[{]/u.test(w))) throw new Error(`${where}: a workspace is named by a pattern, or not by a path. Mend: name each workspace by its path`);
  return named.map((w) => posix.normalize(w));
}

/**
 * The packages of a lock file that every reader holds to a licence, as { path, at, entry }: each entry an install puts
 * into a folder, but a link to a workspace, which is the project's own. A link to any other folder (a dependency
 * written "file:"), the install puts in place as that folder stands: its `entry` is that folder's, and `at` the folder
 * its own files stand in, null where the link names no folder the lock file holds.
 */
export function lockRead(packages, workspaces) {
  return Object.entries(packages)
    .filter(([path, entry]) => lockInstalled(path) && !(entry.link && workspaces.includes(entry.resolved)))
    .map(([path, entry]) => {
      if (!entry.link) return { path, at: path, entry };
      const at = typeof entry.resolved === "string" && entry.resolved !== "" && lockPathOk(entry.resolved) && Object.hasOwn(packages, entry.resolved) ? entry.resolved : null;
      return { path, at, entry: at === null ? {} : packages[at] };
    });
}

/** Every package each lockfile installs, with its licence, whether it ships, and the name its registry address gives. */
function lockfilePackages(root, lockPath, ships, text = (f) => ownText(root, f)) {
  const base = posix.dirname(lockPath) === "." ? "" : posix.dirname(lockPath);
  const read = (p) => {
    const f = posix.join(base, p), t = text(f);
    try { return parseBounded(t); } catch (e) { throw new Error(`${f} cannot be read as JSON (${e.message}). Mend: ${posix.basename(p) === "package.json" ? "correct it to JSON, then write" : "write"} the lock file anew with npm, never by hand: its install, given --package-lock-only`); }
  };
  const lock = read(posix.basename(lockPath));
  if (!lock.packages || typeof lock.packages !== "object" || Array.isArray(lock.packages)) throw new Error(`${lockPath} has no "packages" (npm's lockfile version 2 or 3). Mend: write it anew with npm, version 7 or later: its install, given --package-lock-only`);
  const odd = Object.entries(lock.packages).find(([path, entry]) => !lockPathOk(path) || !entry || typeof entry !== "object" || Array.isArray(entry));
  if (odd) throw new Error(`${lockPath} holds an entry at ${JSON.stringify(odd[0]).slice(0, 200)} that is not written as npm writes one. Mend: write it anew with npm, never by hand: its install, given --package-lock-only`);
  const workspaces = workspacesIn(read("package.json"), posix.join(base, "package.json"));
  const shipped = ships ? shippedPaths(lock.packages, workspaces, (dir) => read(posix.join(dir, "package.json"))) : new Set();
  return lockRead(lock.packages, workspaces)
    .map(({ path, entry: target }) => {
      const entry = lock.packages[path];
      const name = path.slice(path.lastIndexOf("node_modules/") + 13);
      return { name, version: target.version, license: target.license, resolved: entry.resolved, registryName: entry.link ? undefined : registryName(entry.resolved), registryVersion: entry.link ? undefined : registryVersion(entry.resolved), shipped: shipped.has(path), lockPath };
    });
}

/**
 * The check, on the project at `root`, read against `base` (a commit, or null) and the config as the base held it
 * (`baseConfig`; null where the base held none at this config's path, so that nothing counts as shipped there):
 * { failures, reports, summary }.
 */
export function check(config, root, base = null, baseConfig = null) {
  config = normalised(within(config, root));
  const lists = policy(config);
  const ctx = {
    config, root, base, lists, failures: [], reports: [],
    // (what each lock file shipped at the base, by name@version, read once each, by the base's own config: a package the
    // base held only as a tool, or in a lock file whose packages did not ship then, was not shipped)
    heldIn: new Map(), then: baseConfig ? normalised(baseConfig) : { ships: [] },
    // (the owner's yeses, by what each names; `needed`: those something off its list stood on, `onList`: those nothing did)
    accepted: config.accepted ?? [], needed: new Set(), onList: new Set(),
  };
  const { failures, reports } = ctx;
  const packages = (config.lockfiles ?? []).flatMap((f) => lockfilePackages(root, f, config.ships.includes(posix.join(posix.dirname(f), "package.json"))));
  failures.push(...shrinkwrapFaults(root, config.lockfiles ?? []));
  for (const p of packages) checkPackage(ctx, p);
  const entries = config.audit ? checkAudit(ctx) : [];
  unneededYeses(ctx);
  const scanned = config.scan ? scan(config.scan, root, entries, config.audit, config.lockfiles ?? [], base, auditOf(ctx.then)) : undefined;
  if (scanned) failures.push(...scanned.failures);
  failures.push(...npmrcFailures(root));
  for (const f of config.ignoreScriptsIn ?? []) {
    if (!existsSync(join(root, f)) || !scriptsOff(readFileSync(join(root, f), "utf8"))) failures.push(`${f} does not set ignore-scripts=true (floor rule 15). Mend: add the line ignore-scripts=true to ${f}`);
  }
  const wait = waitFaults(root, base, config.ignoreScriptsIn ?? []);
  failures.push(...wait.failures);
  const all = [...new Set(failures)]; // (a package a lockfile holds twice fails once)
  const summary = summaryOf(ctx, packages, entries, scanned, all.length);
  return { failures: all, reports: [...reports, ...wait.reports, ...(scanned?.reports ?? [])], summary };
}

// (the audit's path a config names, or null)
const auditOf = (config) => (typeof config?.audit === "string" ? config.audit : null);

// (npm installs from a shrinkwrap file where one stands, whatever lock file a config names: only one of the two may)
function shrinkwrapFaults(root, lockfiles) {
  const faults = [];
  for (const f of lockfiles) {
    const other = posix.join(posix.dirname(f), posix.basename(f) === "npm-shrinkwrap.json" ? "package-lock.json" : "npm-shrinkwrap.json");
    if (existsSync(join(root, other))) faults.push(`${f}: ${other} stands beside it, and an install reads the shrinkwrap file of the two. Mend: delete one, keeping the file the project installs from`);
  }
  return faults;
}

// (a package is known by what it is, not the name it is installed under: its registry's name and version, or where it
// has none, its name, version and where it came from, so that an alias moved to another package is another)
function identity(q) {
  return q.registryName !== undefined ? `${q.registryName}@${q.registryVersion}` : `${q.name}@${q.version}@${q.resolved ?? ""}`;
}

// (with no base to read it against, as in a checkout of one commit, what ships under a licence moved off is reported
// and passes, as it passed before: held or not cannot be told, and no sync fails a project over it)
function held(ctx, lockPath, p) {
  const { root, base, heldIn, then } = ctx;
  if (!base) return true;
  if (!heldIn.has(lockPath)) {
    let names = new Set();
    const shipped = Array.isArray(then.ships) && then.ships.includes(posix.join(posix.dirname(lockPath), "package.json"));
    try { names = new Set(lockfilePackages(root, lockPath, shipped, (f) => textAt(root, base, f)).filter((q) => q.shipped).map(identity)); } catch { /* (none held) */ }
    heldIn.set(lockPath, names);
  }
  return heldIn.get(lockPath).has(identity(p));
}

/** The report on what ships under a licence moved off the list and passes, held at the base or with none to read. */
function movedOffReport(base, what, licence) {
  return `${what} ships under ${licence}, which since ${[...MOVED_OFF].filter(([id]) => licence.includes(id)).map(([id, day]) => `${day} (${id})`).join(", ")} waits for the owner's yes (floor rule 10): ${base ? "shipped at the pull request's base" : "with no base to read it against"}, it passes; file an issue for the owner, who gives the yes in "accepted" or has it replaced`;
}

/** One package a lockfile installs, held to its list, or to the owner's yes for it. */
function checkPackage(ctx, p) {
  const { allowedFor } = ctx.lists;
  // (a yes names a package and its version as the registry's address does, like "data" and "fonts": never by a
  // name or a version a lockfile could be given beside it)
  const a = p.registryName === undefined || p.registryVersion !== p.version ? undefined : ctx.accepted.find((y) => y.package === `${p.registryName}@${p.version}`);
  if (licenceOk(p.license, allowedFor(p.registryName ?? "", p.shipped))) { if (a) ctx.onList.add(a); return; }
  if (a) { ctx.needed.add(a); ctx.failures.push(...yesFaults(a.package, a, p.shipped, [p.license], ctx.lists, '"accepted"')); return; }
  if (p.shipped && movedOff(p.license, allowedFor(p.registryName ?? "", true)) && held(ctx, p.lockPath, p)) { ctx.reports.push(movedOffReport(ctx.base, `${p.name}@${p.version}, in ${p.lockPath},`, p.license)); return; }
  ctx.failures.push(offList(p));
}

/** The failure of a package off its list. */
function offList(p) {
  const never = p.license !== undefined && NEVER.test(typeof p.license === "string" ? p.license : JSON.stringify(p.license));
  return `off the ${p.shipped ? "list for what ships" : "tools' list"}: ${p.name}@${p.version} (${p.license === undefined ? "no licence" : typeof p.license === "string" ? p.license : JSON.stringify(p.license)}), in ${p.lockPath}${never ? ". Mend: replace it with a package under a licence on that list; floor rule 10 never takes these terms in" : `. Mend: replace it with a package under a licence on that list; or, where the owner wants it anyway, file an issue asking the owner's yes, which goes in the config's "accepted" with the owner's words (floor rule 10)`}`;
}

/** The audit the config names, each entry held to its list and its notice: its entries, for the scan. */
function checkAudit(ctx) {
  const { config, root, base } = ctx;
  const entries = auditEntries(root, config.audit);
  const auditHeld = heldInAudit(root, base, config.audit);
  const notices = noticesText(root, config.notices);
  if (notices === null) ctx.failures.push(`the config's "notices", ${config.notices}, names no file. Mend: write the notices file there, or correct the path`);
  for (const e of entries) checkEntry(ctx, e, notices, auditHeld);
  return entries;
}

/** The audit's entries, or refused. */
function auditEntries(root, audit) {
  let entries;
  try { entries = parseBounded(readFileSync(join(root, audit), "utf8")).entries; } catch { throw new Error(`${audit} cannot be read as JSON. Mend: write the audit there as JSON, { "entries": [...] }, or correct the config's "audit"`); }
  if (!Array.isArray(entries)) throw new Error(`${audit} has no "entries" list. Mend: write it as { "entries": [...] }, as the starter kit does`);
  return entries;
}

// (an entry held at the base as it stands: the same name, version and licence)
function heldInAudit(root, base, audit) {
  let before = [];
  try { before = base ? JSON.parse(textAt(root, base, audit)).entries ?? [] : []; } catch { /* (none held) */ }
  return (e) => !base || (Array.isArray(before) && before.some((b) => b && b.name === e.name && b.version === e.version && b.licence === e.licence && b.ships === true));
}

// (the notices file the config names; null when it names none there, which fails once, not for every entry)
function noticesText(root, notices) {
  const noticesFile = notices === undefined ? undefined : join(root, notices);
  return noticesFile === undefined ? undefined : existsSync(noticesFile) && statSync(noticesFile).isFile() ? readFileSync(noticesFile, "utf8") : null;
}

/** One entry of the audit, held to its shape, its list or the owner's yes, and, where it ships, its notice. */
function checkEntry(ctx, e, notices, auditHeld) {
  const { config, failures } = ctx;
  const fault = entryShapeFault(config.audit, e);
  if (fault) { failures.push(fault); return; }
  if (outsideLists(config.audit, e, failures)) return;
  entryLicence(ctx, e, auditHeld);
  if (e.ships === true && notices !== null && !(notices === undefined ? typeof e.notice === "string" && e.notice.trim() : notices.includes(e.name))) {
    failures.push(`${config.audit}: ${e.name}: it ships, so its notice ships too (floor rule 10): ${notices === undefined ? 'its "notice", for the notices the project builds' : `its name in ${config.notices}`}. Mend: add it there`);
  }
}

/** What is wrong with an audit entry's shape, or null. */
function entryShapeFault(audit, e) {
  if (!e || typeof e.name !== "string" || !e.name || typeof e.licence !== "string" || !e.licence) return `${audit}: an entry without a name or licence: ${JSON.stringify(e)}. Mend: give it its "name" and its "licence"`;
  // (a "ships" or "kind" of the wrong shape would check less without a word)
  if ((e.ships !== undefined && typeof e.ships !== "boolean") || (e.kind !== undefined && typeof e.kind !== "string")) return `${audit}: ${e.name}: "ships" is not true or false, or "kind" not a word. Mend: write "ships" as true or false, and "kind" as a word`;
  return null;
}

/** Whether an audit entry stands outside both lists: one of GitHub's services, or the owner's own work (failing where
 *  it is half written so). */
function outsideLists(audit, e, failures) {
  if (e.licence === GITHUB_TERMS && e.kind === "github-service" && GITHUB_SERVICES.has(e.name) && !e.ships) return true;
  if (e.kind !== "own" && e.licence !== OWNER) return false;
  if (e.kind !== "own" || e.licence !== OWNER) failures.push(`${audit}: ${e.name}: the owner's own work is "kind": "own" with ${OWNER}, and only it. Mend: give it both, or neither`);
  return true;
}

/** An audit entry held to its list, or to the owner's yes for it. */
function entryLicence(ctx, e, auditHeld) {
  const { config, needed, failures } = ctx;
  // (a yes names an entry with its version, where it has one: a new version is a new entry to it)
  const a = ctx.accepted.find((y) => y.entry === e.name && y.version === e.version);
  if (licenceOk(e.licence, ctx.lists.allowedFor(e.name, e.ships === true, e.kind ?? null))) { if (a) ctx.onList.add(a); }
  // (a NuGet package's yes stands in "nuget.accepted" alone, where the NuGet check holds it to its exact version)
  else if (a && e.kind === "nuget") { needed.add(a); failures.push(`${config.audit}: ${e.name}: a NuGet package's yes stands in "nuget.accepted", never in "accepted". Mend: move the yes to "nuget.accepted"`); }
  else if (a) {
    needed.add(a);
    // (the audit's own words for the licence are the yes's, letter for letter, readable or not)
    if (a.licence !== e.licence) failures.push(`${config.audit}: ${e.name}: accepted under ${a.licence}, and recorded as under ${e.licence}, and another licence is another yes. Mend: replace it, or file an issue asking the owner's yes under ${e.licence}`);
    failures.push(...yesFaults(`${config.audit}: ${e.name}`, a, e.ships === true, [e.licence], ctx.lists, null));
  }
  else if (e.ships === true && movedOff(e.licence, ctx.lists.allowedFor(e.name, true, e.kind ?? null)) && auditHeld(e)) ctx.reports.push(movedOffReport(ctx.base, `${config.audit}: ${e.name}`, e.licence));
  else failures.push(`${config.audit}: ${e.name}: ${e.licence} is not on the list for ${e.ships === true ? "what ships" : "tools that only run"}. Mend: replace it with a package under a licence on that list; or, where the owner wants it anyway, file an issue asking the owner's yes, which goes in the config's "accepted" with the owner's words (floor rule 10)`);
}

/** Each yes in "accepted" that nothing off its list stood on fails. */
function unneededYeses(ctx) {
  for (const a of ctx.accepted) {
    if (!ctx.needed.has(a)) ctx.failures.push(`"accepted" names ${a.package ?? `the audit entry ${a.entry}${a.version === undefined ? "" : ` at version ${a.version}`}`}, which ${ctx.onList.has(a) ? "is on its list and needs no yes" : a.package ? "nothing installs" : "the audit does not hold"}. Mend: take that yes out of "accepted"`);
  }
}

/** The check's summary line. */
function summaryOf(ctx, packages, entries, scanned, failing) {
  const { config, needed, reports } = ctx;
  const shippedCount = packages.filter((p) => p.shipped).length;
  return `${packages.length} packages checked (${shippedCount} shipped or may be, ${packages.length - shippedCount} tools that only run)` +
    `${config.audit ? `, ${entries.length} audit entries` : ""}${scanned ? `, ${scanned.scanned} files scanned for what the audit must hold` : ""}; ` +
    `${needed.size ? `${needed.size} accepted on the owner's yes; ` : ""}${reports.length ? `${reports.length} shipped at the base under a licence moved off the list, reported; ` : ""}${failing} failing (floor rule 10)`;
}

/**
 * The dependency review's lists, as lines for $GITHUB_OUTPUT. It holds every package it sees to the tools' list (it
 * cannot tell what ships), and lets the named data and font packages through to this check, which holds each to its
 * own list; and, of those the owner accepted, the ones whose accepted licence the tools' list would refuse, which this
 * check holds to its yes for that exact version (the review knows a package by its name alone, so it reads no version
 * of such a one).
 */
export function actionLists(config) {
  const lists = policy(config), tools = new Set(lists.tools);
  const yeses = (config.accepted ?? []).filter((a) => a.package !== undefined && !licenceOk(a.licence, tools)).map((a) => a.package.slice(0, a.package.lastIndexOf("@")));
  return [`allow-licenses=${lists.tools.join(",")}`, `allow-dependencies-licenses=${[...new Set([...(config.data ?? []), ...(config.fonts ?? []), ...yeses])].map((n) => `pkg:npm/${n}`).join(",")}`];
}

if (started(import.meta.url)) {
  const fail = (msg) => { console.error(`FAIL: ${logged(msg)}`); process.exit(1); };
  const configPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!configPath) fail("no config was named. Mend: name it: node core/scripts/licences.mjs <config> [--action]");
  let config, root;
  try {
    config = loadConfig(configPath);
    root = projectAt(fileURLToPath(new URL(".", import.meta.url))).root || execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: fileURLToPath(new URL(".", import.meta.url)), encoding: "utf8" }).trim();
  } catch (e) { fail(e.message); }
  if (process.argv.includes("--action")) {
    for (const line of actionLists(config)) console.log(line);
  } else {
    let result;
    try { const base = baseOf(root); result = check(config, root, base, configAt(root, base, configPath)); } catch (e) { fail(e.message); }
    for (const r of result.reports) console.log(`REPORT: ${logged(r)}`);
    for (const f of result.failures) console.error(`FAIL: ${logged(f)}`);
    console.log(result.summary);
    // (the checks floor rule 7 and floor topic 15 ask of the same lock files come with it, so a project's own job that
    // runs this script runs them too, its workflow unchanged; #1093, point 2): never awaited at the top, since
    // lookup.mjs imports this module, which would then never finish loading
    alongside(configPath, root).then((besides) => process.exit(result.failures.length || besides ? 1 : 0));
  }
}

// The exact-versions check (exact-versions.mjs) and the lookup of each package new to the project in npm's registry
// (lookup.mjs), run beside the licence check on the config at `configPath`, each printing its lines: whether either
// failed. The base is the one the job names (LOOKUP_BASE), else the merge's first parent. What stood there before the
// exact-versions check came is reported, never failed, and a pull request whose checkout holds no base has its lookup
// said as a warning that it did not run, failing nothing ("Nothing locks a project" in the core's AGENTS.md), save
// where the job names a base its checkout lacks, as the core's licences.yml does, which fails as lookup.mjs does.
export async function alongside(configPath, root) {
  const { report } = await import("./exact-versions.mjs");
  const { run, namedBase, summarise } = await import("./lookup.mjs");
  const at = namedBase(root) ?? baseOf(root);
  const exact = report(resolve(configPath), root, at ? (f) => textAt(root, at, f) : null, !at);
  for (const line of exact.err) console.error(line);
  for (const line of exact.out) console.log(line);
  if (!at && process.env.GITHUB_EVENT_NAME?.startsWith("pull_request")) {
    const mend = "give the job's checkout fetch-depth: 2 (the pull request merged into its base, with both parents)";
    if (/^[0-9a-f]{40}$/u.test(process.env.LOOKUP_BASE ?? "")) {
      console.error(`FAIL: the lookup of the packages new to the project cannot run: the job names the pull request's base (LOOKUP_BASE), and its checkout does not hold that commit. Mend: ${mend}`);
      return true;
    }
    console.log(`::warning::The lookup of the packages new to the project did not run: this is a pull request, and its checkout holds no base to read it against. Mend: ${mend}`);
    return exact.status !== 0;
  }
  const { lines, code } = await run(configPath, { root, base: at });
  for (const line of lines) (line.startsWith("FAIL") ? console.error : console.log)(line);
  summarise(lines, false);
  return exact.status !== 0 || code !== 0;
}
