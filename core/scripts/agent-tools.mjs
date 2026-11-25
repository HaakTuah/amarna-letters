// The agent-tools check (floor topic 15, "An agent's own tools are code with its sign-ins"; core archive 225): every
// plug-in, tool server, skill and hook a project configures for its agents is listed under "agentTools" in its licence
// check's config, each entry { "kind", "name", "publisher", "version" }: kind one of plugin, server, skill, hook; a
// publisher named; a version that is one exact version (as SemVer writes one) or a full 40-character commit, which a
// plug-in and a tool server must give and a skill or hook may (each is a file of the project's, pinned by its commit).
// The hooks the starter kit writes for Claude Code, Kiro and Codex (setup/template/claude-settings.json.tmpl,
// kiro-hook.json.tmpl and codex-hooks.json.tmpl, beside this copy) are the core's, listed by it at the core's pin; so is
// each hook or setting a way of running sessions writes, as its part's line "*Installs:*" names it (tasks/ways.md,
// beside this copy, read by ways.mjs; #397), printed as installed by that way, and a line in no form read fails. An
// entry nothing configures fails too, so the list stays true.
//
// A hook the starter kit writes counts as the core's only where it is the kit's hook, of the same event and matcher and the
// same in every field, in this copy or in the base's, so the sync that changes the kit's hooks fails nothing; a release that
// changes them asks in its sync note that a project whose list is written lists the hooks it kept.
//
// Where each part is read: the files a tool configures and what each configures in agent-tools-configured.mjs (Claude
// Code's), agent-tools-kiro.mjs and agent-tools-codex.mjs, one hook, tool server, skill or marketplace in
// agent-tools-read.mjs, the pins in agent-tools-pins.mjs, the project at a commit in agent-tools-project.mjs, its files
// and links in agent-tools-listing.mjs and agent-tools-links.mjs, what a pull request changes against its base in
// agent-tools-base.mjs, and the list's own entries in agent-tools-entries.mjs.
//
// Nothing locks a project (AGENTS.md): until the config holds "agentTools", a pull request's base counts as the list,
// read against the first parent of GitHub's merge (licences.mjs's baseOf), so only what the pull request itself adds
// fails; with no base, as on a push, what is unlisted is noted and nothing fails. So too a pin that differs from its
// entry, or a tool fetched at no fixed version: it fails only where the pull request changed that tool's configuration
// or its entry, and is noted where the base held both as they stand, or where there is no base; and a hook that takes a
// file from the working tree, unmarked, fails only where the base held no such hook or marked it, and is noted
// otherwise. The sync note of 16 November 2026 has the step that reads the list written, each pin matched and each such
// hook marked (steps.mjs). In the core's own repository (`--core`) a missing list counts as an empty one, so nothing
// unlisted stands, and no pin breach or hook from the working tree does, marked or not. Node's own modules and git only.
//
//   node core/scripts/agent-tools.mjs <the licence check's config>     from a project's root, as licences.yml runs it
//   node scripts/agent-tools.mjs .github/licences.json --core          in the core's own repository
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { readCore, atCopy, hooksAt, manifestText } from "./core-path.mjs";
import { waysOf } from "./ways.mjs";
import { baseOf } from "./licences.mjs";
import { forget, textAt } from "./git-objects.mjs";
import { parseBounded, logged } from "./guards.mjs";
import { notInstalled, unreached } from "./packages.mjs";
import { started } from "./started.mjs";
import { configured } from "./agent-tools-configured.mjs";
import { describe, show, MAIN, listed } from "./agent-tools-entries.mjs";
import { listings, shown, modules, notFile, listing, shownNotBlob } from "./agent-tools-listing.mjs";
import { readProject } from "./agent-tools-project.mjs";
import { configAtBase, mendedBase, heldBy, heldBefore, sortPins, sortSources, sortBehind, sortUnlisted } from "./agent-tools-base.mjs";

const KITS = { ".claude/settings.json": "claude-settings.json.tmpl", ".kiro/hooks/work-saved.json": "kiro-hook.json.tmpl", ".codex/hooks.json": "codex-hooks.json.tmpl" };
const KIT_DIR = fileURLToPath(new URL("../setup/template/", import.meta.url));
// The hooks the starter kit writes, Claude Code's, Kiro's and Codex's, each by what it is (configured()'s ids): the
// core's, listed by it. `template(name)` gives the text of one of the kit's templates as a copy holds it, or null.
const kitTemplate = name => { try { return fs.readFileSync(path.join(KIT_DIR, name), "utf8"); } catch { return null; } };
// `core` is the manifest's "Core:" line as core-path.mjs reads it, or null for the usual core/: the kit writes the copy as
// core/, and a project whose manifest names another path holds the commands `core-path.mjs --hooks` gives for it, never the
// kit's own with the path written in (#628).
export const coreOf = text => { const core = text === null || text === undefined ? null : readCore(text); return core && !core.wrong ? core : null; };
export function kitHooks(template = kitTemplate, core = null) {
  const copy = core?.path ?? "core/";
  const read = f => { const text = Object.hasOwn(KITS, f) ? template(KITS[f]) : null; return text === null ? text : atCopy(text, copy); };
  const swapped = f => {
    const text = read(f);
    if (f !== ".claude/settings.json" || text === null || copy === "core/") return text;
    return hooksAt(text, core);
  };
  const files = dir => Object.keys(KITS).filter(f => path.posix.dirname(f) === dir).map(f => path.posix.basename(f));
  const ids = r => [...configured(r, () => [], files).ids.values()].flatMap(set => [...set]);
  // (at another path only the commands for it are the kit's, which the fresh comparison expects too: the kit's own, with the
  // path written in, lets a session start without the floor, which the commands for a path stop, and where a library carries
  // the core reads the script from a path main's tree holds as a commit alone; #628)
  return copy === "core/" ? ids(read) : ids(swapped);
}
// What breaks the rule in a project: { problems, unlisted, missing, unconfigured, pins, sources, marked }, the first held against the list
// where there is one, the second the tools configured that neither the list nor the core lists (where there is no
// list, so that a caller may hold them against a base), `missing` those of `problems` that are a tool configured and
// not listed where there is a list, as [key, problem] (the caller holds them against a base too), the third each listed tool whose configuration pins it
// otherwise than its entry, or fetches it at no fixed version, as [key, problem], the fourth, as [key, problem], each
// hook that takes a file of the project from the working tree and whose entry does not say so, and the fifth those
// whose entry says so ("from": "the working tree", or "main" where its command fetches from main), as [key, what is
// said of it, its mend, the mark], the baseline, which the caller holds to what its base held. `head` is configured()'s
// answer, `list` listed()'s or null, `kit` kitHooks()'s, `installs`
// each key a way's part names on its line "*Installs:*" to that way's name (installedBy()): such a tool is no
// project's own, so it is never unlisted, and `installed` names each configured one, as [key, way], to be printed.
export function check(head, list, kit, file, installs = new Map()) {
  const { tools, ids } = head;
  const problems = [...(list?.problems ?? [])];
  const installed = [...tools.keys()].filter(k => installs.has(k)).map(k => [k, installs.get(k)]);
  const unlisted = [...tools.keys()].filter(k => ![...ids.get(k)].every(id => kit.includes(id)) && !list?.keys.has(k) && !installs.has(k));
  const missing = [], unconfigured = [];
  if (list) {
    for (const k of unlisted) missing.push([k, `${describe(k)}, configured in ${tools.get(k)}, is not listed. Mend: list it under "agentTools" in ${file} with its publisher and, for a plug-in or tool server, one exact version, in this pull request, where its task names it; else take it out`]);
    problems.push(...missing.map(([, problem]) => problem));
    for (const k of list.keys) if (!tools.has(k) && !codexUnread(head, k)) unconfigured.push([k, `${file}: "agentTools" lists ${describe(k)}, which nothing configures. Mend: take its entry out of the list, in this pull request`]);
    problems.push(...unconfigured.map(([, problem]) => problem));
  }
  const pins = [];
  for (const [k, p] of head.pins ?? []) {
    if (!list?.keys.has(k)) continue;
    const v = list.versions.get(k);
    if (p.loose) pins.push([k, `${describe(k)} is fetched at no fixed version: ${p.where} ${p.loose}. Mend: ${p.mend}, and list that same version under "agentTools" in ${file}, in this pull request`]);
    else if (p.pin !== v) pins.push([k, `${describe(k)} is listed at ${show(v)} in ${file}, but ${p.where} pins it at ${show(p.pin)}. Mend: make the two the same, the list's version or the pin, whichever is the one meant, in this pull request`]);
  }
  return { problems, unlisted: list ? [] : unlisted, missing, unconfigured, pins, installed, ...sourcesOf(head, list, file, problems) };
}
// What the ways of running sessions install (tasks/ways.md, "What a way installs is listed"; #397), as `ways`
// (ways.mjs's answer) names it: { installs, fail, notes }, `installs` each key to its way's name, `fail` each line
// "*Installs:*" in no form read, and `notes` that the module could not be read, which fails nothing.
export function installedBy(ways = waysOf()) {
  const installs = new Map();
  for (const w of ways.ways) for (const k of w.installs ?? []) installs.set(k, w.name);
  const unread = ways.ways.length ? [] : ways.problems;
  return { installs, fail: ways.ways.filter(w => w.problem).map(w => w.problem), notes: unread.map(p => `what the ways install is not read: ${p.replace(". Mend: ", ". To mend: ")}`) };
}
// Whether a listed tool may be one of Codex's config, which was left unread (configured()'s `unread`), so that its
// entry is not failed as configured nowhere: a hook or tool server Codex's files configure is named "Codex ...".
const codexUnread = (head, k) => !!head.unread?.has(".codex/config.toml") && /^(?:hook|server) Codex /u.test(k);
// check()'s `sources` and `marked`, and into `problems` each mark on a hook in the starter kit's form.
function sourcesOf(head, list, file, problems) {
  const sources = [], marked = [];
  for (const [k, { why, how }] of head.sources ?? []) {
    const said = `${describe(k)}, configured in ${head.tools.get(k)}, ${why}, so nothing shows that it runs its copy on main, where floor rule 3 has what an agent tool starts by itself run from its copy on main, and not the working tree's, which the branch it runs on can change`;
    if (list?.from?.has(k)) marked.push([k, said, how, list.from.get(k)]);
    else sources.push([k, `${said}. Mend: ${how}, in this pull request`]);
  }
  for (const [k, mark] of list?.from ?? []) {
    if (!head.tools.has(k)) continue;
    if (!head.sources?.has(k)) problems.push(`${file}: "agentTools" says of ${describe(k)} "from": ${show(mark)}, but its command is the starter kit's form, which runs its copy on main. Mend: take "from" out of its entry, in this pull request`);
    // (a hook marked as run from main whose command fetches no file from main: the mark fits not what it reads; #1273)
    else if (mark === MAIN && !head.sources.get(k).main) problems.push(`${file}: "agentTools" says of ${describe(k)} "from": ${show(MAIN)}, but its command fetches no file from main (\`git show refs/remotes/origin/main:<the file>\`), so what it runs is read from the working tree. Mend: write "from": "the working tree" in its entry, in this pull request`);
  }
  return { sources, marked };
}
// The whole check, from the project's root: { fail, notes }.
function run(root, file, { core = false, base = baseOf(root), ways = installedBy() } = {}) {
  // (each run reads the commits as they stand when it starts: what an earlier run in the same process listed of "HEAD"
  // may be another commit's)
  listings.clear();
  shown.clear();
  modules.clear();
  forget();
  let config;
  try { config = parseBounded(fs.readFileSync(path.resolve(root, file), "utf8")); } catch (e) {
    return { fail: [`${file} cannot be read (${logged(e.message)}). Mend: name the licence check's config, written as JSON`], notes: [] };
  }
  const head = readProject(root, null, base ? at => notFile(listing(root, base), at) || shownNotBlob(root, base, at) : undefined, undefined, base);
  const atBase = name => textAt(root, base, path.relative(root, path.join(KIT_DIR, name)).split(path.sep).join("/"));
  const place = coreOf(manifestText(path.join(root, "core-manifest.md"))), kit = [...kitHooks(undefined, place), ...(base ? kitHooks(atBase, place) : [])];
  let list = listed(config, file);
  const baseConfig = configAtBase(root, base, file);
  // (a list the base held is no longer missing: taking it out does not bring back the time before it was written)
  if (!list && base) {
    if (baseConfig && Object.hasOwn(baseConfig, "agentTools")) {
      return { fail: [`${file}: "agentTools" is gone, which the base held. Mend: put the list back as the base held it, changing only the entries this pull request's task names`], notes: [] };
    }
  }
  if (!list && core) list = { keys: new Set(), versions: new Map(), from: new Set(), problems: [] };
  const checked = check(head, list, kit, file, ways.installs), { problems, unlisted, pins } = checked;
  const baseProject = base ? readProject(root, base) : null, baseList = base ? listed(baseConfig, file) : null;
  const mended = mendedBase(root, base), held = heldBy(head, baseProject, mended);
  const stood = heldBefore(checked, { head, baseProject, baseList, held, core, mended });
  const unread = unreadOf(head, baseProject, core);
  const fail = [...head.problems, ...problems].filter(p => !stood.has(p) && !unread.has(p)).concat(ways.fail);
  const notes = [...[...stood].map(p => `as the base held it, nothing fails here: ${p.replace(". Mend: ", ". To mend: ")}`), ...[...unread].map(p => `with no base to read against, nothing fails here: ${p.replace(". Mend: ", ". To mend: ")}`),
    ...[...head.notRead].map(p => `not read: ${p}`), ...ways.notes, ...checked.installed.map(([k, way]) => `installed by the way \`${way}\` (tasks/ways.md), so listed by it: ${describe(k)}, configured in ${head.tools.get(k)}`)];
  sortPins(pins, { head, list, baseProject, baseList, core, mended }, fail, notes);
  sortSources(checked, { head, baseProject, baseList, core, file, mended }, fail, notes);
  if (base && !core) sortBehind(root, base, fail, notes);
  sortUnlisted(unlisted, { head, base, held, file }, fail, notes);
  return { fail, notes };
}
// The part of the check that did not run, or null (asked only where a Codex config is held, so that a copy installs
// its packages for none other): where the TOML package could not be installed (packages.mjs,
// unreached(): the registry not answering, or a copy's install failing; #1093, point 1), a project's Codex config, which the TOML package reads, is left unread, at the head and the base alike,
// and its entries in the list are not failed as configured nowhere; every other failure stands (#654, point 4).
function partlyUnread(root, base = baseOf(root)) {
  const codex = ".codex/config.toml";
  const held = () => fs.existsSync(path.join(root, codex)) || (!!base && textAt(root, base, codex) !== null);
  return held() && unreached("smol-toml") ? `The agent-tools check did not read ${codex}, and ran every other part: ${notInstalled("smol-toml")}` : null;
}
// With no base to read against, as before a commit or on a push, each problem a project may hold, noted as sortSources
// notes its own; in the core's own repository none may stand.
function unreadOf(head, baseProject, core) {
  return new Set(!core && !baseProject ? head.problems.filter(p => head.baselined.has(p)) : []);
}
// What the check prints, in order, and its exit status: { lines: [[stream ("out" or "err"), line]], status }.
export function printed(root, file, opts) {
  // (the base read once a run, for both)
  const base = opts?.base === undefined ? baseOf(root) : opts.base;
  const { fail, notes } = run(root, file, { ...opts, base }), partly = partlyUnread(root, base);
  const lines = [...(partly ? [["out", `::warning::${partly}`]] : []), ...notes.map(n => ["out", `note ${logged(n)}`]), ...fail.map(f => ["err", `FAIL: ${logged(f)}`]),
    ["out", fail.length ? `${fail.length} of the agent's own tools not as floor topic 15 asks` : "ok   every tool the project configures for its agents is listed"]];
  return { lines, status: fail.length ? 1 : 0 };
}
if (started(import.meta.url)) {
  const args = process.argv.slice(2), file = args.find(a => !a.startsWith("--"));
  if (!file) { console.error("usage: node core/scripts/agent-tools.mjs <the licence check's config> [--core]"); process.exit(2); }
  const { lines, status } = printed(process.cwd(), file, { core: args.includes("--core") });
  for (const [stream, line] of lines) (stream === "err" ? console.error : console.log)(line);
  process.exitCode = status;
}
