// The pruning of the core's rules (AGENTS.md, "Rules are pruned by their numbers"; #303). With every second monthly
// state report (state-report.mjs, beside this file, says when one is due), and in a month whose session runs on a newer
// generation of model than the last pruning's, the session that takes the report runs each staged case (staged.mjs)
// set from the core with the rules the case holds taken out, records the counts the rules' numbers read for the span
// since the last pruning, and adds the list this prints. The list names each rule of the floor, the modules and the
// core's AGENTS.md that:
//   - names a number (an entry of scripts/holders/, its "number", in outcomes.mjs's form NUMBER) that did not move since the last pruning;
//   - stands in for an outcome (its number not one of the outcome's direct measures) and moved at two prunings in a row
//     while those measures did not, each by the count outcomes.mjs's MEASURES give (DIRECT: a median left out; fast,
//     readable and usable have none);
//   - is held by a check that fired nowhere in the span: no step of a workflow that runs it failed on a pull request,
//     read from GitHub's record of each failed run's jobs and their steps, and from the workflows' steps as the core's
//     own reader of YAML gives them (parse-yaml.mjs, beside this file); a check no step names is not judged so;
//   - is held by a staged case that passed without it.
// Ahead of those, the rules holders.mjs (beside this file) counts as having no holder, worst first, a rule read at a
// role's start before one read on need, each with its proposal from UNHELD (#545): "check" or "case" (a check or a
// staged case could hold it, "by" the issue queued to build it), "move" (to a module read on need), "goes", or
// "describes", and beside a case, a move or a removal the form of the rule a check could hold, or why none exists
// (form(), #887); one with none, or a rule that guards against rare and severe harm proposed anything but a holder, is said so, and a
// proposal whose rule now has a holder or no longer stands is named to be taken out.
// Each listed with its step of the pruning: a rule read at a role's start (an AGENTS.md rule is, here) is at step 1, to
// move to a module read on need; one read on need is at step 2, to go where nothing changed since it moved. A rule
// fewer than EARLY merged pull requests came under since it joined (read from git: the first commit that wrote its lead
// in bold, and the merges on the first-parent line since) is "too early" and not judged; one that guards against rare
// and severe harm, of the floor or with a number marked "; rare harm", is never listed for its check alone. Beside the list, under "in use", the citations of each rule in the span
// (cited.mjs, beside this file), which say a rule is applied and never that it helps. It removes nothing: the owner
// decides which go. The record is RECORD, written by --read and --record into the pruning in progress (open()), which
// --record ends, and committed in a pull request of its own.
// The core's own repository alone. Git, gh and Node's own modules.
// The parts stand beside this file (#888), each read alone by whoever changes it, and are exported from here: the list in
// pruning-list.mjs (pure functions over the rules, numbers, steps and record), what is read from git, the workflows, the
// holders' list and gh in pruning-read.mjs, the record and when a pruning is due in pruning-record.mjs; this file holds
// the commands.
//
//   node scripts/pruning.mjs                               the list, from the record's newest pruning
//   node scripts/pruning.mjs --due [--model <id>]          whether a pruning is due this month, and why
//   node scripts/pruning.mjs --set <case> <dir>            sets the staged case up in <dir>, a new folder under the
//                                                          system's temporary folder, from the core at HEAD with the
//                                                          rules it holds taken out, and prints the brief
//   node scripts/pruning.mjs --read <case> <dir>           once that session has ended: its verdict, written into
//                                                          the pruning in progress
//   node scripts/pruning.mjs --record --repo <owner/name> [--model <id>] [--owner <login>]
//                                                          the counts of the span since the last pruning, read through
//                                                          gh and written into the pruning in progress, which ends it
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { git, holdersAt, joinedIn, stepsAt, counts } from "./pruning-read.mjs";
import { checksOf, list, readUnheld, stepsOf, without } from "./pruning-list.mjs";
import { EVERY, RECORD, due, open, ordered, readRecord, writeRecord } from "./pruning-record.mjs";
import { ROOT, rules } from "./rules.mjs";
import { started } from "./started.mjs";

// (what the list, the reader of the host and the record hold, exported from here as before they were split)
export { EARLY, MARKS, rare, unheldLines } from "./pruning-list.mjs";
export { firedOf } from "./pruning-read.mjs";
export { DIRECT, UNHELD, generation, said } from "./pruning-record.mjs";
export { RECORD, EVERY, checksOf, counts, due, joinedIn, list, open, readRecord, readUnheld, stepsAt, stepsOf, without };

const fail = msg => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };

// The staged case named, with the folder after it, or null where either is missing, said with its mend.
async function caseAndDir(argv, flag) {
  const { caseOf, CASES } = await import("./staged.mjs");
  const c = caseOf(argv[argv.indexOf(flag) + 1]), dir = argv[argv.indexOf(flag) + 2];
  if (!c) return fail(`no staged case is named ${argv[argv.indexOf(flag) + 1] ?? "(none)"}. Mend: name one of ${CASES.map(x => x.name).join(", ")}`), null;
  if (!dir) return fail(`${flag} needs the case's folder after its name. Mend: give a new folder under the system's temporary folder`), null;
  return { c, dir: path.resolve(dir) };
}

// --set: a clone of the core at HEAD, the case's rules taken out in a commit of its own, from which the case is set.
async function setCmd(argv) {
  const got = await caseAndDir(argv, "--set");
  if (!got) return;
  const { setCase } = await import("./staged.mjs");
  const core = fs.mkdtempSync(path.join(os.tmpdir(), "pruning-core-"));
  try {
    // (with no origin, the kit holds the pin to no main: the commit that takes the rules out stands on none)
    git(["clone", "--quiet", ROOT, core]);
    git(["remote", "remove", "origin"], core);
    const all = rules(core, { agents: true }), cut = without(got.c.holds, all, f => fs.readFileSync(path.join(core, f), "utf8"));
    if (cut.missing.length) return fail(`${got.c.name} holds rules that no longer stand: ${cut.missing.join("; ")}. Mend: bring the case's list of rules up to date in scripts/staged/${got.c.name}.mjs, in a pull request of its own`);
    for (const [f, t] of Object.entries(cut.texts)) fs.writeFileSync(path.join(core, f), t);
    git(["-c", "user.name=pruning", "-c", "user.email=pruning@example.invalid", "-c", "commit.gpgsign=false", "commit", "-q", "-am", `Taken out for the pruning: ${got.c.holds.join("; ")}`], core);
    console.log(setCase(got.c, got.dir, { core, at: git(["rev-parse", "HEAD"], core).trim() }));
  } catch (e) {
    fail(`${got.c.name} could not be set without its rules in ${got.dir}: ${String(e.message).split("\n").filter(Boolean).join(" ")}. Mend: give a new folder under the system's temporary folder, from a clone of the core with git on its path`);
  } finally { fs.rmSync(core, { recursive: true, force: true }); }
}

// --read: the verdict of a case set by --set, into today's pruning.
async function readCmd(argv, get) {
  const got = await caseAndDir(argv, "--read");
  if (!got) return;
  const { memoOf, sealOf, Unreadable } = await import("./staged/scratch.mjs"), { unplaced } = await import("./staged.mjs");
  if (!fs.existsSync(got.dir) || !fs.existsSync(path.join(sealOf(fs.realpathSync(got.dir)), "meta.json"))) return fail(`${got.dir} holds no case set by --set. Mend: give the folder the case was set in`);
  const meta = memoOf(fs.realpathSync(got.dir), "meta");
  if (meta.case !== got.c.name || Object.values(meta.rules ?? {}).some(f => f !== null)) return fail(`${got.dir} was not set for ${got.c.name} with its rules taken out. Mend: set it with \`node scripts/pruning.mjs --set ${got.c.name} <a new folder>\`, and run it again`);
  let v;
  try { v = got.c.read(fs.realpathSync(got.dir)); } catch (e) { if (!(e instanceof Unreadable)) throw e; v = { pass: false, why: `its repositories could not be read: ${e.message}` }; }
  const record = readRecord(), p = open(record, get("--model"));
  (p.without ??= {})[got.c.name] = { verdict: v.pass ? "pass" : "fail", why: unplaced(v.why) };
  writeRecord(record);
  console.log(`${got.c.name}, without its rules: ${v.pass ? "pass" : "fail"}: ${v.why}\nrecorded in ${RECORD}`);
}

// --record: the counts of the span, into today's pruning.
async function recordCmd(get) {
  const repo = get("--repo");
  if (!/^[\w-]+\/[\w.-]+$/u.test(repo ?? "")) return fail("--record needs --repo <owner/name>. Mend: name the core's repository, as GitHub spells it");
  const { ghApi } = await import("./labels.mjs");
  const record = readRecord(), last = ordered(record).filter(x => x.recorded).at(-1);
  const to = new Date().toISOString().replace(/\.\d{3}Z$/u, "Z"), from = last ? `${last.at}T00:00:00Z` : new Date(Date.now() - EVERY * 31 * 864e5).toISOString().replace(/\.\d{3}Z$/u, "Z");
  let c;
  const h = await holdersAt(ROOT), steps = await stepsAt(ROOT), stepsOfRule = key => checksOf(key, h.holders ?? {}).flatMap(by => stepsOf(by, steps));
  try { c = await counts({ repo, from, to, owner: get("--owner") ?? repo.split("/")[0], gh: ghApi, all: rules(ROOT, { agents: true }), numbers: h.numbers ?? {}, stepsOfRule, known: new Set(Object.entries(steps).flatMap(([w, list]) => list.map(x => `${w}#${x.name}`))) }); }
  catch (e) { return fail(`GitHub did not answer for ${repo}: ${String(e.message).split("\n")[0]}. Mend: run it where gh answers for the owner's account, or try again once GitHub does`); }
  Object.assign(open(record, get("--model")), { from, ...c, recorded: true });
  writeRecord(record);
  console.log(`the counts from ${from} recorded in ${RECORD}`);
}

async function main(argv) {
  const get = flag => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] ?? null : null; };
  if (argv.includes("--set")) return setCmd(argv);
  if (argv.includes("--read")) return readCmd(argv, get);
  if (argv.includes("--record")) return recordCmd(get);
  if (argv.includes("--due")) { const d = due({ month: new Date().toISOString().slice(0, 7), record: readRecord(), model: get("--model") }); return console.log(`${d.due ? "due" : "not due"}: ${d.why}`); }
  const { startRules } = await import("./cited.mjs");
  const { CASES } = await import("./staged.mjs");
  // (the core's AGENTS.md, which every builder here reads at its start, with the floor and the modules)
  const all = rules(ROOT, { agents: true }), h = await holdersAt(ROOT), starts = new Set([...all.filter(r => r.file === "AGENTS.md").map(r => r.key), ...[...startRules(all).values()].flatMap(x => [...x])]);
  const { counts: heldCounts, holders } = await import("./holders.mjs");
  console.log(list({ all, named: h.holders ?? {}, numbers: h.numbers ?? {}, record: readRecord(), cases: CASES, steps: await stepsAt(ROOT), starts, toolStarts: new Set(all.filter(r => r.file.startsWith("tools/")).map(r => r.key)), joined: r => joinedIn(r), none: heldCounts(holders()).none, ...readUnheld() }).join("\n"));
}

if (started(import.meta.url)) await main(process.argv.slice(2));
