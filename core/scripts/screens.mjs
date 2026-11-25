// The screen checks' baseline (tasks/screens.md, "What holds it"; core archive 230; #284): a project that turns on a
// check of a screen names it in its config, and its own tool, which the core leaves to it, writes what it found; this
// script holds that against the check's baseline, in the shape check's form (shape.mjs, beside this file; its
// `unclaimed`), so nothing gets worse. A finding no listed entry covers is new: one of a check the config marks
// "binds" fails, saying its mend, and one of a check that "reports" is said and fails nothing ("Nothing locks a
// project" in the core's AGENTS.md), each with its check's own mend (MENDS). A listed entry may shrink and may not
// grow, and one of a binding check that a run of its screen no longer finds fails until --write lowers the baseline;
// a run covers only the screens a pull request changes, so an entry of a screen not run is never read as gone.
// Against the pull request's base (SCREENS_BASE, set by the project's workflow) an entry may join the baseline only
// with its reason under "grown", as in the shape check's (tasks/code-shape.md, "Never worse"), and the config the
// base holds may not be taken out.
//
// The config (left out: the one the manifest's *screen checks* row names, in backticks, else checks/screens.json; with
// none, every check is off and nothing is read):
// { "baseline": "<path>", "checks": { "<check>": "reports" | "binds" } }, each check one of CHECKS (`settings`, a
// player's settings kept, and `first-choice`, the time from opening the game to its first real choice, are those a game
// asks: game-design.md, beside the module; a first-choice finding names the screen the game opens on). What was found
// (a file the project's tool writes): { "screens": [<the screens it ran>],
// "all": true where it ran every screen, "found": { "<check>: <screen>: <what>": true | { "count": <n> } } }. The
// baseline holds, beside shape.mjs's "listed" and "grown", "checks": those whose findings it listed from a run over
// every screen. A check turned on that it has not listed fails until --write lists it from such a run, so what stands
// on a screen no pull request has changed since is listed first and never turns a later one red.
//
//   node core/scripts/screens.mjs <found> [<config>]           the check
//   node core/scripts/screens.mjs <found> [<config>] --first   write the first baseline, from a run over every screen;
//                                                              only where none exists yet
//   node core/scripts/screens.mjs <found> [<config>] --write   lower the baseline to what still stands on the screens
//                                                              run, and list each check turned on since, from a run
//                                                              over every screen
// Run from the project's root by the project's own workflow, after its tool. Reads only, but for the baseline it writes
// when told; git and Node's own modules.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { notLinked, parseBaseline, unclaimed } from "./shape.mjs";
import { started } from "./started.mjs";

// Each check of the module's, with what a session does about a new finding of it (#254).
export const MENDS = {
  values: "take the value from the one system the direction names (its scales of type and spacing, colours by role, corner and motion values), or, where none fits, add one there and use it",
  rendered: "bring what the finding names within the floor: contrast of 4.5:1 for text and 3:1 for large text and controls, targets of at least 24 pixels (44 where touch is the main input), body text of at least 16 pixels, lines of 45 to 75 characters, nothing wider than the screen at any width between the screen sizes",
  pictures: "build the state the finding names, or take its picture at the size it names; where the picture differs from its baseline on purpose, take the baseline picture again in this pull request and say why",
  timing: "make what the finding names answer within a tenth of a second, show work going on past a second and progress past ten, keep the layout from jumping while it loads, or bring the load within its limit",
  console: "mend the error, the failing request or the font or picture that does not load, which the finding names",
  settings: "give the product the setting the finding names and keep it when the product is closed and opened again (the module that asks for the check names the settings: in a game, core/tasks/game-design.md, \"A player's settings are remembered\": controls remapped, the size of text, less shake and flashing, each volume apart)",
  "first-choice": "shorten what stands between opening the product and the first real choice the finding names until it comes within the target the module that asks for the check names (in a game, the game page's target: core/tasks/game-design.md, \"Teaching has an order\"), teaching one thing at a time in play rather than in text; or, only where play has shown that target, a first guess, wrong, change it there and give in this pull request the time measured before and after and the play that showed it, which its review reads, since a target raised alone takes the finding away",
};
export const CHECKS = Object.keys(MENDS);
export const KIT = "checks/screens.json";
const MODES = ["reports", "binds"];

class Refused extends Error {}
const refuse = (what, mend) => { throw new Refused(`${what}. Mend: ${mend}`); };
const isObject = v => !!v && typeof v === "object" && !Array.isArray(v);
const json = (text, at, mend) => { try { return JSON.parse(text); } catch { return refuse(`${at} could not be read as JSON`, mend); } };
const tolerant = read => { try { return read(); } catch { return null; } };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// An entry's check and screen, from its id: "<check>: <screen>: <what>".
export const partsOf = id => { const [check, screen] = id.split(": "); return { check, screen }; };
// Each id is its own group: a finding is claimed only by the entry of its own id, never one of another screen.
const own = id => ({ kind: partsOf(id).check, group: id });
// The entries of the baseline (`want`) that the base's (`pool`) does not cover, as shape.mjs's `unclaimed` reads them,
// but for one thing: an entry listed as true where the base listed a count is new, since true covers any count. The
// other way, a count where the base listed true, narrows it, and findings are read against the baseline by `unclaimed`
// alone, so a tool that changes how it reports a finding locks nothing.
export function widened(want, pool) {
  const loosened = [...want].filter(([id, n]) => n === true && pool.has(id) && pool.get(id) !== true).map(([id]) => id);
  return [...loosened, ...unclaimed(new Map([...want].filter(([id]) => !loosened.includes(id))), pool, {}, own)];
}

// The config the manifest's *screen checks* row names (its first path to a .json file, in backticks), else the kit's.
export const where = manifest => /`([\w./-]+\.json)`/u.exec(/^.*\*screen checks\*.*$/mu.exec(String(manifest ?? ""))?.[0] ?? "")?.[1] ?? KIT;

// The config's text as the check reads it: { baseline, checks: Map of check to mode }; it throws where it cannot.
export function parseConfig(text, at) {
  const form = `write it as {"baseline": "<path>", "checks": {"<check>": "reports" or "binds"}}, each check one of ${CHECKS.join(", ")} (core/tasks/screens.md, "What holds it")`;
  const c = json(text, at, form);
  if (!isObject(c) || typeof c.baseline !== "string" || !/^[\w.-][\w./-]*$/u.test(c.baseline) || c.baseline.includes("..") || !isObject(c.checks)) refuse(`${at} is not in the form the check reads`, form);
  const unknown = Object.keys(c).filter(k => !["baseline", "checks"].includes(k));
  if (unknown.length) refuse(`${at} holds ${unknown.join(", ")}, which the check does not read`, `take ${unknown.length === 1 ? "it" : "them"} out: ${form}`);
  for (const [name, mode] of Object.entries(c.checks)) {
    if (!CHECKS.includes(name)) refuse(`${at} names the check "${name}", which is none of the module's`, `name it as one of ${CHECKS.join(", ")}`);
    if (!MODES.includes(mode)) refuse(`${at} gives the check "${name}" the mode ${JSON.stringify(mode)}`, `give it "reports", which fails nothing, or "binds", where a session can mend what it finds`);
  }
  return { baseline: c.baseline, checks: new Map(Object.entries(c.checks)) };
}

// Whether what the project's tool wrote has the form the check reads: its screens, whether it ran all, its findings.
const foundForm = f => isObject(f) && Array.isArray(f.screens) && f.screens.every(s => typeof s === "string" && s) && isObject(f.found) && [undefined, true, false].includes(f.all);

// What the project's tool found, as the check reads it: { screens: Set, all: whether it ran every screen, found: Map
// of id to numbers or true, off: the count of findings of checks the config leaves off }; it throws where it cannot.
export function parseFound(text, at, config) {
  const form = `have the project's tool write {"screens": [<the screens it ran>], "all": true where it ran every screen, "found": {"<check>: <screen>: <what>": true or {"count": <n>}}}`;
  const f = json(text, at, form);
  if (!foundForm(f)) refuse(`${at} is not in the form the check reads`, form);
  const found = new Map();
  let off = 0;
  for (const [id, n] of Object.entries(f.found)) {
    const { check, screen } = partsOf(id);
    if (!CHECKS.includes(check) || !f.screens.includes(screen) || id.split(": ").length < 3) refuse(`${at} holds the finding "${id}", which names no check of the module's and screen it ran`, form);
    if (!(n === true || (isObject(n) && Number.isInteger(n.count) && n.count > 0 && Object.keys(n).length === 1))) refuse(`${at} gives "${id}" what is neither true nor a count`, form);
    if (config.checks.has(check)) found.set(id, n); else off++;
  }
  return { screens: new Set(f.screens), all: f.all === true, found, off };
}

// The verdict on what was found against the baseline and, where known, the base's baseline: { fail, said, listed }.
export function verdict({ config, at, self, found, baseline, base }) {
  const fail = [], said = [];
  // a check turned on whose findings were never listed from a run over every screen: what stands on the screens no
  // pull request has changed since is listed first, so none of it turns a later one red
  const unlisted = [...config.checks.keys()].filter(check => !baseline.checks.has(check));
  if (unlisted.length) fail.push(`FAIL: ${config.baseline} has never listed what the ${unlisted.join(", ")} ${unlisted.length === 1 ? "check finds" : "checks find"} on every screen. Mend: run the project's tool over every screen, writing "all": true, then node ${self} <found> ${at} --write, which lists what stands, and commit the baseline`);
  for (const id of unclaimed(new Map([...found.found].filter(([id]) => baseline.checks.has(partsOf(id).check))), baseline.listed, {}, own)) {
    if (config.checks.get(partsOf(id).check) === "binds") fail.push(`FAIL: ${id}: new, and the check ${partsOf(id).check} binds here. Mend: ${MENDS[partsOf(id).check]}; then run the project's tool and this check again`);
    else said.push(`said ${id}: new; the check ${partsOf(id).check} reports here and fails nothing`);
  }
  const gone = [...baseline.listed].filter(([id, n]) => config.checks.get(partsOf(id).check) === "binds" && JSON.stringify(lowered(new Map([[id, n]]), found, config.checks).get(id)) !== JSON.stringify(n)).map(([id]) => id);
  if (gone.length) fail.push(`FAIL: ${config.baseline} lists ${plural(gone.length, "entry", "entries")} of a screen this run read that ${gone.length === 1 ? "is" : "are"} mended or smaller now, and the baseline lists only what stands. Mend: lower it with node ${self} <found> ${at} --write, and commit the baseline`, ...gone.map(id => `  ${id}`));
  if (base?.listed) {
    // an entry of a check the base had not listed joins freely: the check reads more, and what stood is listed
    const joined = widened(baseline.listed, base.listed).filter(id => base.checks.has(partsOf(id).check) && !(baseline.grown[id] ?? "").trim());
    if (joined.length) fail.push(`FAIL: ${config.baseline} lists ${plural(joined.length, "entry", "entries")} that ${base.name} did not, and the baseline only shrinks. Mend: take each out of the baseline (git checkout ${base.name} -- ${config.baseline}, then node ${self} <found> ${at} --write) and mend the screen; only where there is no other way, give each its reason under "grown" by its id, and in the pull request, with a fresh session's word there that it found no other way`, ...joined.map(id => `  ${id}`));
  }
  return { fail, said, listed: baseline.listed.size };
}

// A baseline as the check reads it: shape.mjs's form, and "checks", those whose findings it has listed from a run over
// every screen (null where the key is missing).
export function readBaseline(text, at, restore) {
  const b = parseBaseline(text, at, restore), { checks } = JSON.parse(text);
  if (checks !== undefined && !(Array.isArray(checks) && checks.every(c => CHECKS.includes(c)))) refuse(`"checks" in ${at} is not a list of the module's checks`, restore);
  return { ...b, checks: checks === undefined ? null : new Set(checks) };
}

// A baseline as the check writes it: the checks it has listed, what grew kept for what stays, the entries sorted.
const written = (listed, grown, checks) => {
  const kept = Object.fromEntries(Object.entries(grown).filter(([id]) => listed.has(id)));
  return `${JSON.stringify({ checks: [...checks].sort(), ...(Object.keys(kept).length ? { grown: kept } : {}), listed: Object.fromEntries([...listed].sort(([a], [b]) => a.localeCompare(b))) }, null, 2)}\n`;
};

// What --write lists: the baseline lowered to what stands, and, of each check turned on that it has not listed yet,
// what a run over every screen found; it throws where the run did not cover every screen.
export function rewritten(baseline, config, found, self) {
  const listed = lowered(baseline.listed, found, config.checks), checks = new Set(baseline.checks);
  const unlisted = [...config.checks.keys()].filter(check => !checks.has(check));
  if (unlisted.length && !found.all) refuse(`the ${unlisted.join(", ")} ${unlisted.length === 1 ? "check has" : "checks have"} never been listed, and this run did not cover every screen`, `run the project's tool over every screen, writing "all": true, then node ${self} <found> --write again`);
  for (const check of unlisted) {
    for (const [id, n] of found.found) if (partsOf(id).check === check) listed.set(id, n);
    checks.add(check);
  }
  return { listed, checks };
}

// The baseline lowered to what still stands: an entry of a screen that was run, of a check turned on (`on`), stays
// only where it was found again, at the smaller count; one of a screen not run, or of a check switched off, whose
// findings the run does not read, stays as it is.
export function lowered(listed, found, on) {
  const out = new Map();
  for (const [id, n] of listed) {
    if (!found.screens.has(partsOf(id).screen) || !on.has(partsOf(id).check)) { out.set(id, n); continue; }
    const now = found.found.get(id);
    if (now === undefined) continue;
    out.set(id, now === true || n === true ? n : { count: Math.min(now.count, n.count) });
  }
  return out;
}

// A path of the project's own, relative and inside it, read through no link (floor rule 13), or refused with its mend.
const inside = (file, what) => {
  if (path.isAbsolute(file) || file.split(/[\\/]/u).includes("..")) refuse(`${what} ${file} is not inside the project`, `give a path relative to the project's root with no "..": the check reads nothing outside it`);
  return notLinked(file);
};

// The base a pull request merges into, as SCREENS_BASE names it: { name, show: file => its text there or null }, or
// null where none is named.
function baseOf() {
  const name = process.env.SCREENS_BASE || "";
  if (!name) return null;
  if (!/^\w[\w./^~-]*$/u.test(name)) refuse(`SCREENS_BASE (${JSON.stringify(name).slice(0, 80)}) is no plain name of a commit or branch`, "set it to the pull request's base, such as origin/main");
  const git = args => execFileSync("git", ["-c", "core.fsmonitor=false", ...args], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["pipe", "pipe", "ignore"] });
  try { git(["rev-parse", "--verify", "--quiet", `${name}^{commit}`]); } catch { refuse(`${name} is not a commit here`, `fetch it (git fetch origin ${name.replace(/^origin\//u, "")}), or set SCREENS_BASE to the pull request's base`); }
  // a file the base does not hold is null; one it holds and that cannot be read refuses, never reading as none
  const show = file => {
    if (tolerant(() => git(["cat-file", "-e", `${name}:${file}`])) === null) return null;
    try { return git(["show", `${name}:${file}`]); } catch { return refuse(`${name}:${file} could not be read`, "run the check again; where it fails again, the file at the base is too large for git's output here: say so in the pull request"); }
  };
  // the config the base held: where the run names it, where the base's own manifest's row does, or the kit's path; the
  // first that reads as a config, else the first that stands
  const config = at => {
    const held = [...new Set([at, where(show("core-manifest.md")), KIT])].filter(file => show(file) !== null);
    return held.find(file => tolerant(() => parseConfig(show(file), file)) !== null) ?? held[0] ?? null;
  };
  return { name, show, config };
}

// What the base's baseline listed, read where the base's own config put it, and the checks it had listed: null only
// where the base had no config (the pull request turns the checks on, and writes the first baseline). Where the base's
// baseline is gone or names no checks, its config's checks; where its config does not read, every check, so nothing
// joins freely.
function baseListed(base, at) {
  const held = base.config(at);
  if (held === null) return null;
  const was = tolerant(() => parseConfig(base.show(held), `${base.name}:${held}`));
  const b = was && tolerant(() => readBaseline(base.show(was.baseline) ?? "", `${base.name}:${was.baseline}`, ""));
  return { listed: b?.listed ?? new Map(), checks: b?.checks ?? new Set(was ? was.checks.keys() : CHECKS) }; // (a baseline with no "checks": its config's)
}

function first(config, at, self, found) {
  if (fs.existsSync(inside(config.baseline, "the baseline"))) refuse(`${config.baseline} stands already`, `lower it with node ${self} <found> ${at} --write instead`);
  if (!found.all) refuse("the first baseline lists what stands on every screen, and this run did not cover every screen", `run the project's tool over every screen, writing "all": true, then node ${self} <found> ${at} --first again`);
  fs.mkdirSync(path.dirname(config.baseline), { recursive: true });
  fs.writeFileSync(inside(config.baseline, "the baseline"), written(found.found, {}, config.checks.keys()));
  console.log(`${config.baseline}: ${plural(found.found.size, "entry", "entries")} listed, the first baseline`);
  return 0;
}

function run(config, at, self, found, command) {
  if (command === "--first") return first(config, at, self, found);
  if (!fs.existsSync(inside(config.baseline, "the baseline"))) refuse(`there is no baseline at ${config.baseline}`, `write the project's first with node ${self} <found> ${at} --first, and commit it`);
  const restore = `take it back as the base holds it, or write it again with node ${self} <found> ${at} --first, in a pull request the reviews read`;
  const read = readBaseline(fs.readFileSync(config.baseline, "utf8"), config.baseline, restore);
  const baseline = { ...read, checks: read.checks ?? new Set() }; // (one with no "checks" has listed none from a whole run)
  if (command === "--write") {
    const { listed, checks } = rewritten(baseline, config, found, self);
    fs.writeFileSync(config.baseline, written(listed, baseline.grown, checks));
    return console.log(`${config.baseline}: ${plural(listed.size, "entry", "entries")} listed, ${baseline.listed.size} before`), 0;
  }
  const b = baseOf(), was = b && baseListed(b, at);
  const v = verdict({ config, at, self, found, baseline, base: was && { name: b.name, ...was } });
  for (const line of v.said) console.log(line);
  if (found.off) console.log(`note ${plural(found.off, "finding")} of checks the config leaves off, not read`);
  if (!b) console.log("note no base to compare with (set SCREENS_BASE to the branch the work started from), so the baseline was not checked for what joined it");
  else if (was === null) console.log(`note ${b.name} had no config at ${at}: this pull request turns the checks on, and its baseline is the first`);
  for (const line of v.fail) console.error(line);
  if (v.fail.length) return 1;
  console.log(`ok   nothing new that binds on ${plural(found.screens.size, "screen")}; ${plural(v.listed, "old finding")} listed in ${config.baseline}`);
  return 0;
}

// Where no config stands: every check is off, unless the base held one, which no pull request takes out.
function off(at, named) {
  if (named) refuse(`there is no config at ${at}`, `write it as core/tasks/screens.md, "What holds it", says, or run with no config named`);
  const held = baseOf()?.config(at);
  if (held) refuse(`${held} is gone, and ${process.env.SCREENS_BASE} holds it: no pull request takes the screen checks' config out`, `take it back as ${process.env.SCREENS_BASE} holds it (git checkout ${process.env.SCREENS_BASE} -- ${held}), with its row in core-manifest.md where the base had one`);
  console.log(`ok   no screen check is on here (${at} does not stand): each is off until the project names it`);
  return 0;
}

function main(argv) {
  const self = path.relative(process.cwd(), fileURLToPath(import.meta.url)).replace(/\\/gu, "/");
  const command = ["--first", "--write"].includes(argv.at(-1)) ? argv.at(-1) : null;
  const args = command ? argv.slice(0, -1) : argv;
  if (args.length < 1 || args.length > 2 || args.some(a => a.startsWith("--"))) refuse(`the check does not know ${argv.join(" ") || "a run with no file of findings"}`, `run node ${self} <found> [<config>] [--first | --write]`);
  const at = args[1] ?? where(tolerant(() => fs.readFileSync("core-manifest.md", "utf8")));
  if (!fs.existsSync(inside(at, "the config"))) return off(at, args[1]);
  const config = parseConfig(fs.readFileSync(at, "utf8"), at);
  if (!fs.existsSync(inside(args[0], "the file of findings"))) refuse(`there is no file of findings at ${args[0]}`, "run the project's tool first, which writes it inside the project");
  return run(config, at, self, parseFound(fs.readFileSync(args[0], "utf8"), args[0], config), command);
}

if (started(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { if (!(e instanceof Refused) && !/\. Mend: /u.test(e.message)) throw e; console.error(`FAIL: ${e.message}`); process.exitCode = 1; }
}
