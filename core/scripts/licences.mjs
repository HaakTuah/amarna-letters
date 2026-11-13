// The licence check (floor rule 10, in floor/topics.md beside this folder), for every project that takes the core:
// every package its lockfiles install, the ones packages pull in included, and every entry of its audit (what no
// lockfile holds: a script loaded from elsewhere, a font, an image, a tool a script installs), each held to its list.
// What ships is held to floor rule 10's list, read from floor/topics.md itself, so the list stands in one place; a tool
// that only runs, to the tools' list: every licence the Open Source Initiative approves (OSI below), one on the same
// terms, and everything what ships may be under. CC-BY is allowed only for what is named as data or assets, OFL only
// for fonts, as the floor says. No licence, or an expression it cannot read, fails. Node's own modules only, so the
// check needs no install. It checks the project it lies in (core/scripts/ there), whatever the directory it is started
// from; the config's own path is read from that directory, the paths inside it from the project's root.
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
// .npmrc files that must keep packages' own install scripts off (floor rule 15); and "scan", which folders reach users,
// for the scan that nothing used is left out of the audit (licence-scan.mjs, beside this file, which says what it
// finds). Every .npmrc in the project may hold only settings that leave where npm fetches from alone, since a data or
// font package is known by its registry address.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "./licence-scan.mjs";
import { started } from "./started.mjs";

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
const GITHUB_SERVICES = new Set(["CodeQL CLI"]);
const GITHUB_TERMS = "LicenseRef-GitHub-Terms";
const OWNER = "LicenseRef-Owner";
// What the floor never allows on either list, and copyleft, never in what ships: a guard on the lists themselves.
const NEVER = /(^|-)(NC|ND)(-|$)|BUSL|SSPL|Elastic|Commons-Clause/iu;
const COPYLEFT = /GPL|MPL|EPL|CDDL|-SA(-|$)/iu;

/** Floor rule 10's list for what ships, read from its own words: { any, data, fonts, publicDomain }. */
export function floorList(file = new URL("../floor/topics.md", import.meta.url)) {
  const text = readFileSync(file, "utf8").replace(/\s+/gu, " ");
  const found = /\*\*10\. Licences.*? is under (.+?); never copyleft/u.exec(text);
  if (!found) throw new Error("floor/topics.md: rule 10's list for what ships (\"is under ...; never copyleft\") is not there");
  const lists = { any: [], data: [], fonts: [], publicDomain: false };
  for (const piece of found[1].split(", ")) {
    const [, ids, purpose] = /^(?:or )?(.+?)(?: \(for ([^)]+)\))?$/u.exec(piece);
    if (ids === "the public domain") { lists.publicDomain = true; continue; }
    const key = { undefined: "any", "data and assets": "data", fonts: "fonts" }[purpose];
    if (!key) throw new Error(`floor/topics.md, rule 10: a purpose it does not know: "${purpose}"`);
    for (const id of ids.split(" and ")) {
      if (!/^[A-Za-z0-9][A-Za-z0-9.+-]*$/u.test(id)) throw new Error(`floor/topics.md, rule 10: "${id}" is not a licence id`);
      lists[key].push(id);
    }
  }
  if (lists.any.length < 5) throw new Error("floor/topics.md, rule 10: its list for what ships reads as almost empty");
  return lists;
}

/**
 * The two lists by what reaches users, each widened for what is named as data or assets (CC-BY) or fonts (OFL), never
 * across: `allowedFor(name, shipped, kind)`, where `kind` ("data", "asset", "font") is an audit entry's, and a package
 * counts as data or a font only when the config names it. `tools` is the tools' list, for the dependency review.
 */
export function policy(config = {}) {
  const floor = floorList();
  const pd = floor.publicDomain ? PUBLIC_DOMAIN : { any: [], data: [] };
  const shipped = new Set([...floor.any, ...pd.any]);
  const tools = new Set([...OSI, ...SAME_TERMS, ...shipped]);
  const dataExtra = [...floor.data, ...pd.data];
  const never = [...tools, ...dataExtra, ...floor.fonts].filter((id) => NEVER.test(id));
  const copyleft = [...shipped, ...dataExtra, ...floor.fonts].filter((id) => COPYLEFT.test(id));
  if (never.length) throw new Error(`on a list, though floor rule 10 never allows it: ${never.join(", ")}`);
  if (copyleft.length) throw new Error(`copyleft on the list for what ships: ${copyleft.join(", ")}`);
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
  };
}

/**
 * Whether an SPDX expression is allowed: read with its brackets, one side of an OR enough and every part of an AND
 * needed. AND and OR mixed without brackets (which SPDX reads with AND first, a reader perhaps not), an exception
 * (WITH) or anything unreadable is refused.
 */
export function licenceOk(expression, allow) {
  if (typeof expression !== "string" || !expression.trim()) return false;
  if (allow.has(expression.trim())) return true;
  const tokens = expression.match(/\(|\)|[^\s()]+/gu) ?? [];
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
    if (tokens[at] === "WITH") { at += 2; return false; }
    return allow.has(token);
  };
  try {
    const ok = level();
    return at === tokens.length && ok;
  } catch {
    return false;
  }
}

/** The package a registry tarball address names (`https://registry.npmjs.org/<name>/-/<file>.tgz`), or undefined. */
export function registryName(resolved) {
  const match = /^https:\/\/registry\.npmjs\.org\/((?:@[^/]+\/)?[^/@]+)\/-\/[^/]+\.tgz$/u.exec(resolved ?? "");
  return match?.[1];
}

/**
 * The lockfile paths of everything a package.json's runtime dependencies, and its workspaces', pull in, worked out from
 * the package.json files (`manifest(dir)`, dir "" for its own), not the lockfile's `dev` flags; each name resolved as
 * Node resolves it, from the nearest node_modules folder up. Peer and optional dependencies count, since they may be
 * bundled. Each package's own `dependencies` and `license` are the lockfile's, as npm wrote them: npm checks a
 * package's bytes against the lockfile, never those fields, so a hand edit to them is a review finding.
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

/**
 * The lines of an `.npmrc` that are not one of a few settings known to leave where npm fetches from alone: npm reads
 * keys in many spellings (quoted, scoped, from variables), so anything else, a registry or `replace-registry-host` above
 * all, is listed, and `registryName` only vouches for what npm really fetches.
 */
export function registryOverrides(npmrc) {
  const harmless = /^((fund|audit|update-notifier|engine-strict|save-exact|progress|loglevel)\s*=\s*[\w.-]*|ignore-scripts\s*=\s*true)$/u;
  return npmrc.split(/\r?\n/u).map((l) => l.trim()).filter((l) => l && !/^[#;]/u.test(l) && !harmless.test(l));
}

/** Whether an `.npmrc` keeps packages' own install scripts off (floor rule 15): `ignore-scripts=true`, never undone. */
export function scriptsOff(npmrc) {
  return npmrc.split(/\r?\n/u).some((l) => /^ignore-scripts\s*=\s*true$/u.test(l.trim()));
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

/** The config, read and checked: a key it does not know, or one of the wrong shape, would check less without a word. */
export function loadConfig(path) {
  let config;
  try { config = JSON.parse(readFileSync(path, "utf8")); } catch { throw new Error(`cannot read the config ${path} as JSON`); }
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("the config is not a JSON object");
  const lists = ["lockfiles", "ships", "data", "fonts", "ignoreScriptsIn"];
  const unknown = Object.keys(config).filter((k) => !lists.includes(k) && !["audit", "notices", "scan"].includes(k));
  if (unknown.length) throw new Error(`the config holds keys it does not know: ${unknown.join(", ")}`);
  for (const key of lists) {
    const v = config[key];
    if (v !== undefined && (!Array.isArray(v) || v.some((x) => typeof x !== "string" || !x))) throw new Error(`the config's "${key}" is not a list of names`);
  }
  if (!Array.isArray(config.ships)) throw new Error('the config does not say what ships ("ships": [] if no package does)');
  if (config.audit !== undefined && (typeof config.audit !== "string" || !config.audit)) throw new Error('the config\'s "audit" is not a path');
  if (!config.lockfiles?.length && !config.audit) throw new Error('the config names nothing to check ("lockfiles", "audit")');
  if (config.notices !== undefined && (typeof config.notices !== "string" || !config.notices || !config.audit)) throw new Error('the config\'s "notices" is not a path, or names no "audit" whose entries it holds');
  if (config.scan !== undefined) {
    const { scan: s } = config;
    if (!s || typeof s !== "object" || Array.isArray(s)) throw new Error('the config\'s "scan" is not a JSON object');
    const odd = Object.keys(s).filter((k) => !["served", "tools", "skip"].includes(k));
    if (odd.length) throw new Error(`the config's "scan" holds keys it does not know: ${odd.join(", ")}`);
    for (const key of ["served", "tools", "skip"]) {
      const v = s[key];
      // (each written as git lists it: "site/" for a folder, never "./site/" or "site//", which would match nothing)
      const ok = (p) => typeof p === "string" && (p === "" ? key === "served" : posix.normalize(p) === p && p !== "." && !p.startsWith("/") && !p.startsWith("../"));
      if (v !== undefined && (!Array.isArray(v) || !v.every(ok))) throw new Error(`the config's "scan.${key}" is not a list of paths in the project`);
    }
    if (!Array.isArray(s.served)) throw new Error('the config\'s "scan" does not say what reaches users ("served": [] if nothing does)');
    if (!config.audit) throw new Error('the config\'s "scan" needs an "audit" to hold what it finds');
  }
  config = normalised(config);
  const beside = (config.lockfiles ?? []).map((f) => posix.join(posix.dirname(f), "package.json"));
  const loose = config.ships.filter((m) => !beside.includes(m));
  if (loose.length) throw new Error(`"ships" names a file that is no package.json beside a lockfile: ${loose.join(", ")}`);
  const npmName = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/u;
  const odd = [...(config.data ?? []), ...(config.fonts ?? [])].filter((n) => !npmName.test(n));
  if (odd.length) throw new Error(`"data" or "fonts" names what is no npm package name: ${odd.join(", ")}`);
  return config;
}

/** Every package each lockfile installs, with its licence, whether it ships, and the name its registry address gives. */
function lockfilePackages(root, lockPath, ships) {
  const base = posix.dirname(lockPath) === "." ? "" : posix.dirname(lockPath);
  const read = (p) => JSON.parse(readFileSync(join(root, base, p), "utf8"));
  const lock = read(posix.basename(lockPath));
  if (!lock.packages || typeof lock.packages !== "object") throw new Error(`${lockPath} has no "packages" (npm's lockfile version 2 or 3)`);
  const named = read("package.json").workspaces ?? [];
  if (!Array.isArray(named) || named.some((w) => typeof w !== "string" || /[*?[{]/u.test(w))) throw new Error(`${posix.join(base, "package.json")}: name each workspace by its path`);
  const workspaces = named.map((w) => posix.normalize(w));
  const shipped = ships ? shippedPaths(lock.packages, workspaces, (dir) => read(posix.join(dir, "package.json"))) : new Set();
  return Object.entries(lock.packages)
    .filter(([path, entry]) => path.includes("node_modules/") && !(entry.link && workspaces.includes(entry.resolved)))
    .map(([path, entry]) => {
      const target = entry.link ? lock.packages[entry.resolved] ?? {} : entry;
      const name = path.slice(path.lastIndexOf("node_modules/") + 13);
      return { name, version: target.version, license: target.license, registryName: entry.link ? undefined : registryName(entry.resolved), shipped: shipped.has(path), lockPath };
    });
}

/** The check, on the project at `root`: { failures, summary }. */
export function check(config, root) {
  config = normalised(config);
  const { allowedFor } = policy(config);
  const failures = [];
  const packages = (config.lockfiles ?? []).flatMap((f) => lockfilePackages(root, f, config.ships.includes(posix.join(posix.dirname(f), "package.json"))));
  for (const p of packages) {
    if (!licenceOk(p.license, allowedFor(p.registryName ?? "", p.shipped))) failures.push(`off the ${p.shipped ? "list for what ships" : "tools' list"}: ${p.name}@${p.version} (${p.license ?? "no licence"}), in ${p.lockPath}`);
  }
  let entries = [];
  if (config.audit) {
    entries = JSON.parse(readFileSync(join(root, config.audit), "utf8")).entries;
    if (!Array.isArray(entries)) throw new Error(`${config.audit} has no "entries" list`);
    // (the notices file the config names; null when it names none there, which fails once, not for every entry)
    const noticesFile = config.notices === undefined ? undefined : join(root, config.notices);
    const notices = noticesFile === undefined ? undefined : existsSync(noticesFile) && statSync(noticesFile).isFile() ? readFileSync(noticesFile, "utf8") : null;
    if (notices === null) failures.push(`the config's "notices", ${config.notices}, names no file`);
    for (const e of entries) {
      if (!e || typeof e.name !== "string" || !e.name || typeof e.licence !== "string" || !e.licence) { failures.push(`${config.audit}: an entry without a name or licence: ${JSON.stringify(e)}`); continue; }
      // (a "ships" or "kind" of the wrong shape would check less without a word)
      if ((e.ships !== undefined && typeof e.ships !== "boolean") || (e.kind !== undefined && typeof e.kind !== "string")) { failures.push(`${config.audit}: ${e.name}: "ships" must be true or false, and "kind" a word`); continue; }
      if (e.licence === GITHUB_TERMS && e.kind === "github-service" && GITHUB_SERVICES.has(e.name) && !e.ships) continue;
      if (e.kind === "own" || e.licence === OWNER) {
        if (e.kind !== "own" || e.licence !== OWNER) failures.push(`${config.audit}: ${e.name}: the owner's own work is "kind": "own" with ${OWNER}, and only it`);
        continue;
      }
      if (!licenceOk(e.licence, allowedFor(e.name, e.ships === true, e.kind ?? null))) failures.push(`${config.audit}: ${e.name}: ${e.licence} is not on the list for ${e.ships === true ? "what ships" : "tools that only run"}`);
      if (e.ships === true && notices !== null && !(notices === undefined ? typeof e.notice === "string" && e.notice.trim() : notices.includes(e.name))) {
        failures.push(`${config.audit}: ${e.name}: it ships, so its notice ships too (floor rule 10): ${notices === undefined ? 'its "notice", for the notices the project builds' : `its name in ${config.notices}`}`);
      }
    }
  }
  const scanned = config.scan ? scan(config.scan, root, entries, config.audit, config.lockfiles ?? []) : undefined;
  if (scanned) failures.push(...scanned.failures);
  for (const f of npmrcFiles(root)) {
    for (const l of registryOverrides(readFileSync(join(root, f), "utf8"))) failures.push(`${f}: npm setting not allowed (a package is known by the npm registry it comes from): ${l}`);
  }
  for (const f of config.ignoreScriptsIn ?? []) {
    if (!existsSync(join(root, f)) || !scriptsOff(readFileSync(join(root, f), "utf8"))) failures.push(`${f} must set ignore-scripts=true (floor rule 15)`);
  }
  const shippedCount = packages.filter((p) => p.shipped).length;
  const summary = `${packages.length} packages checked (${shippedCount} shipped or may be, ${packages.length - shippedCount} tools that only run)` +
    `${config.audit ? `, ${entries.length} audit entries` : ""}${scanned ? `, ${scanned.scanned} files scanned for what the audit must hold` : ""}; ` +
    `${failures.length} failing (floor rule 10)`;
  return { failures, summary };
}

if (started(import.meta.url)) {
  const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exit(1); };
  const configPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!configPath) fail("name the config: node core/scripts/licences.mjs <config> [--action]");
  let config, root;
  try {
    config = loadConfig(configPath);
    root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: fileURLToPath(new URL(".", import.meta.url)), encoding: "utf8" }).trim();
  } catch (e) { fail(e.message); }
  if (process.argv.includes("--action")) {
    // The dependency review holds every package it sees to the tools' list (it cannot tell what ships), and lets the
    // named data and font packages through to this check, which holds each to its own list.
    console.log(`allow-licenses=${policy(config).tools.join(",")}`);
    console.log(`allow-dependencies-licenses=${[...(config.data ?? []), ...(config.fonts ?? [])].map((n) => `pkg:npm/${n}`).join(",")}`);
  } else {
    let result;
    try { result = check(config, root); } catch (e) { fail(e.message); }
    for (const f of result.failures) console.error(`FAIL: ${f}`);
    console.log(result.summary);
    process.exit(result.failures.length ? 1 : 0);
  }
}
