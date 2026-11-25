// The order of a pull request's checks and reviews (tasks/reviews.md, point 10, "The order follows cost"; #397), worked
// out from what can be read exactly and never asked (the core's AGENTS.md, "What can be read is never asked or
// declared"); nothing of it is written in the repository, and no manifest row is read. It reads:
// - whether the host bills the proof: the repository is private (the host says) and a job that starts a suite runs on
//   the host's runners (the checkout's workflows, as runners.mjs reads them, and none for another repository; with no
//   suite read there, a runner, called workflow or file not read leaves it not read, and so does a path there that is
//   no folder that can be listed, and a workflows folder missing where no checkout's root holds it or under a .github
//   that is no real folder), with the costliest such runner's rate, a Linux minute 1, a Windows one
//   2, a macOS one 10, which is printed and weighed against no allowance;
// - which agent tools built the last 30 merged pull requests and which reviewed them (tools-read.mjs: the owner's own
//   pull requests and the closing attribution line, a tool's own bot's pull request by its login, a bot's review named by its login), a tool that builds counting as short for reviewing too, its
//   allowance being the one the owner works from; a name is taken only where it is a tool the core knows
//   (staged-tools.json) or a bot's login of the plain form, and any other is passed over as not read;
// - which reviews start by themselves: a bot's review on a pull request where no comment asked one by mention;
// - whether the session's own tool shows its usage warning, which the session says (--warning <its tool, as its
//   attribution line names it>), since only the session sees it.
// What is short, most first: the allowance of the tool under its warning, then the billed proof, then the allowance of a
// tool that builds. The session's own run of the tests its change can reach comes first, then the stages that spend
// nothing short, together; then each stage that spends something short, the least short first, so the stage that spends
// most of it goes last, once, on settled code. Where none of these is read, every stage
// starts together when the pull request is ready, as before. It prints what it read and the order, writes nothing and
// fails nothing; the owner's word, said in person, for now or as the pace, overrides it. gh, Node's own modules and the
// core's yaml package (runners.mjs).
//
//   node core/scripts/stage-order.mjs [--repo <owner/name>] [--last <n, 30 where none is given>] [--warning <tool>]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { aRepository, logged } from "./guards.mjs";
import { repoOf } from "./inbox.mjs";
import { workflowsIn } from "./runners.mjs";
import { started } from "./started.mjs";
import { NONE, ownerFor, readPulls, tally } from "./tools-read.mjs";

export const LAST = 30;
// (the host's own runners' labels, as runners.mjs names them, each with its minute's rate against a Linux one)
const RATES = [[/^macos(-|$)/u, 10], [/^windows(-|$)/u, 2], [/^ubuntu(-|$)/u, 1]];
const ASKED = /^\s*@[\w-]+(?:\[bot\])?\s+review\b/iu;
// (the agent tools the core knows, each with its part in tools/, beside this file; and a bot's login of the plain form)
const TOOLS = JSON.parse(fs.readFileSync(new URL("./staged-tools.json", import.meta.url), "utf8")).tools;
const PLAIN_BOT = /^[a-z0-9][a-z0-9-]{0,38}\[bot\]$/iu;

/** Whether a name read from the record may stand in the order: a tool the core knows, in any case, or a bot's login of
 *  the plain form. */
export const known = name => TOOLS.some(t => t.toLowerCase() === String(name).toLowerCase()) || PLAIN_BOT.test(String(name));

/** The costliest rate among a suite's runners' labels, as a Linux minute's multiple; null where none is the host's. */
export function rateOf(labels) {
  const rates = labels.map(l => RATES.find(([re]) => re.test(String(l)))?.[1]).filter(Boolean);
  return rates.length ? Math.max(...rates) : null;
}

/** Whether the proof is billed: true, false, or null where it was not read, from whether the repository is private
 *  (`priv`, null where the host did not answer) and the workflows read (`w`, workflowsIn's, or ELSEWHERE's): a suite on
 *  the host's runners is billed; with none, a runner, a called workflow or a file not read leaves it not read. */
export function billedOf(priv, w) {
  if (priv === false) return false;
  if (priv !== true) return null;
  if (w.testRunners.includes("hosted")) return true;
  return w.testRunners.includes(null) || w.unknown || w.unread?.length ? null : false;
}

// (the workflows of a repository other than the checkout, which are not read: only the checkout's own are; those of the
// checkout are read by runners.mjs, which says where its folder is no folder that can be listed)
const ELSEWHERE = Object.freeze({ testRunners: [], testLabels: [], unknown: true, unread: [], elsewhere: true });
const workflowsAt = (dir, parse) => (dir === null ? ELSEWHERE : workflowsIn(dir, parse));

/** Whether a reviewer, a tool by its attribution line's name or a bot by its login, is the tool `tool`: the same name in
 *  any case, or a login one of whose words is the tool's first word other than the host's name ("codex" of "Codex" in
 *  "chatgpt-codex-connector", "copilot" of "GitHub Copilot"). */
export function isTool(reviewer, tool) {
  const r = String(reviewer).toLowerCase(), t = String(tool).toLowerCase();
  if (r === t) return true;
  const first = t.split(/[^a-z0-9]+/u).find(w => w && w !== "github");
  return !!first && /\[bot\]$/u.test(r) && r.split(/[^a-z0-9]+/u).includes(first);
}

/** The bots whose review started by itself on any of `pulls` (readPulls's): one that reviewed a pull request on which no
 *  comment of the owner's account or a bot's asked a review by mention ("@<name> review"). */
export function byThemselves(pulls, owner = null) {
  const trusted = x => x?.type === "Bot" || (typeof owner === "string" && String(x?.login ?? "").toLowerCase() === owner.toLowerCase());
  const out = new Set();
  for (const p of pulls) {
    if ((p.comments ?? []).some(c => trusted(c) && ASKED.test(String(c.body ?? "")))) continue;
    for (const r of [...(p.reviews ?? []), ...(p.comments ?? [])]) if (r?.type === "Bot" && r.login !== p.login) out.add(String(r.login));
  }
  return [...out].sort();
}

/** What is short, most first, from what was read (order's input): each { kind: "review" with its tools, or "proof",
 *  said }. */
export function shortOf({ billed = null, rate = null, builders = null, warning = null }) {
  const building = (builders ?? []).map(([name]) => name).filter(name => name !== NONE && !(warning && isTool(name, warning)));
  const proof = billed === true ? [{ kind: "proof", said: `the billed proof${rate ? `, at ${rate}× a Linux minute` : ""}` }] : [];
  const builds = building.length ? [{ kind: "review", tools: building, said: `the allowance of ${building.map(logged).join(" and ")}, which ${building.length > 1 ? "build" : "builds"}` }] : [];
  return [...warning ? [{ kind: "review", tools: [warning], said: `the allowance of ${logged(warning)}, which shows its usage warning` }] : [], ...proof, ...builds];
}

const FIRST = "the session's own run, where it works, of the tests its change can reach (core/scripts/select.mjs), and what fails mended";
const named = list => list.map(logged).join(", ");
const either = list => list.map(logged).join(" or ");

// The stages after the first, from what is short (shortOf's, most first), the reviewers read and those that start by
// themselves: the stages that spend nothing short, together, then the others, the least short first; a review spends the
// first short thing whose tool gives it. Where the proof is short, the stages before it run on the draft.
function stagesOf(short, reviewers, themselves) {
  let left = [...reviewers];
  const groups = short.map(s => {
    if (s.kind === "proof") return s;
    const mine = left.filter(r => s.tools.some(t => isTool(r, t)));
    left = left.filter(r => !mine.includes(r));
    return { ...s, mine };
  });
  const p = groups.findIndex(g => g.kind === "proof"), auto = list => list.filter(r => themselves.includes(r));
  const free = list => (list.length ? `the reviews by ${named(list)} and ` : "");
  // (the fallback reviewer's and the design check are named as examples only where one tool's stage stands)
  const one = groups.filter(g => g.kind !== "proof").length === 1;
  const reviews = g => `every review a session of ${either(g.tools)} gives${one ? ", such as the fallback reviewer's and the design check" : ""}`;
  const after = g => `once the checks passed and the reviews before hold nothing blocking on that head: ${reviews(g)}${p < 0 && auto(g.mine).length ? `; one that starts by itself (${named(auto(g.mine))}) has started at the ready, and is waited for and read` : ""}`;
  const out = [];
  if (p < 0) out.push(`the pull request marked ready: the host's checks, ${free(left)}every review not named below, asked or starting by itself, together`);
  else {
    const started = auto(reviewers);
    out.push(`on the draft: ${free(left.filter(r => !started.includes(r)))}every review not named below that can be asked there, together, and their blocking findings mended`,
      ...groups.slice(p + 1).reverse().map(g => `on the draft, once those before hold nothing blocking: ${reviews(g)}, and its blocking findings mended`),
      `once: the pull request marked ready, and the host's checks, its proof, run on that settled head; ${started.length ? `a review that starts by itself (${named(started)})` : "any review that starts by itself"} starts then, and is waited for and read`);
  }
  out.push(...groups.slice(0, p < 0 ? groups.length : p).reverse().map(after));
  return out.map((x, i) => (i === out.length - 1 && out.length > 1 ? `last, ${x}` : x));
}

/** What is short, most first, and the order, from what was read: { billed, rate, builders, reviewers, themselves,
 *  warning } (builders as tally's list and reviewers as names, each null where the record was not read). */
export function order(r) {
  const short = shortOf(r);
  if ((r.billed ?? null) === null && (r.builders ?? null) === null && !r.warning) return { short, stages: [FIRST, "the pull request marked ready: the host's checks and every review together, as before, nothing being read of what the run is short of"] };
  if (!short.length) return { short, stages: [FIRST, "the pull request marked ready: the host's checks and every review together, nothing read being short"] };
  return { short, stages: [FIRST, ...stagesOf(short, r.reviewers ?? [], r.themselves ?? [])] };
}

/** What it read, from the host through `ask` (gh's arguments, its output back) and from the workflows in `dir`, the
 *  checkout's own, or none (null) where `repo` is another repository's. */
export function read({ repo, last = LAST, warning = null, dir = ".github/workflows", ask, local = true, parse }) {
  let priv = null;
  try { const v = JSON.parse(ask(["api", `repos/${repo}`]))?.private; priv = typeof v === "boolean" ? v : null; } catch { /* (not read) */ }
  const w = workflowsAt(dir, parse);
  const billed = billedOf(priv, w), rate = billed ? rateOf(w.testLabels) : null;
  let pulls = null, owner = null;
  try { pulls = readPulls(repo, last, ask); owner = ownerFor(repo, local, ask, () => {}); } catch { pulls = null; }
  const t = pulls ? tally(pulls, owner) : null;
  // (a name the core does not know, a tool's or a bot's, is passed over: a builder counts as no tool named)
  const builders = t ? [...t.builders.reduce((m, [n, k]) => { const name = known(n) ? n : NONE; return m.set(name, (m.get(name) ?? 0) + k); }, new Map())].sort(([a, x], [b, y]) => y - x || a.localeCompare(b)) : null;
  return { priv, billed, rate, pulls, builders, reviewers: t ? t.reviewers.map(([name]) => name).filter(known) : null, themselves: pulls ? byThemselves(pulls, owner).filter(known) : [], warning, unread: w.unread, elsewhere: !!w.elsewhere, nowhere: !!w.unlisted };
}

/** The lines it prints: what was read, what is short, the order. */
export function said(repo, r) {
  const o = order(r), list = l => (l.length ? l.map(([n, k]) => `${logged(n)} ${k}`).join(", ") : "none");
  const proof = r.billed === true ? `billed, the repository being private and a job that starts a suite running on the host's runners${r.rate ? `, its costliest at ${r.rate}× a Linux minute` : ""}`
    : r.billed === false ? (r.priv === false ? "not billed, the repository being public" : "not billed, no job that starts a suite running on the host's runners")
    : r.priv === null ? "not read: the host did not say whether the repository is private"
    : r.elsewhere ? "not read: the workflows are read only from the repository's own checkout, so run it there"
    : r.nowhere ? "not read: no workflows folder was found here, so run it from the project's root"
    : "not read: a job's runner, a workflow a job calls or a workflow file could not be read";
  const record = r.pulls ? `the last ${r.pulls.length} merged pull requests${r.pulls.length ? ` (#${r.pulls.at(-1).number} to #${r.pulls[0].number})` : ""}: built by ${list(r.builders)}; reviewed by ${r.reviewers.length ? r.reviewers.map(logged).join(", ") : "none"}; starting by themselves: ${r.themselves.length ? r.themselves.map(logged).join(", ") : "none"}`
    : "the merged pull requests: not read";
  return [`what a run is short of, read for ${repo}:`, `  the proof: ${proof}${r.unread?.length ? ` (workflows not read: ${r.unread.map(logged).join(", ")})` : ""}`, `  ${record}`,
    `  the session's own tool's usage warning: ${r.warning ? `shown, for ${logged(r.warning)}` : "not said (--warning <its tool> where it shows)"}`,
    `short, most first: ${o.short.length ? o.short.map(s => s.said).join("; ") : "nothing read"}`, "the order:", ...o.stages.map((s, i) => `  ${i + 1}. ${s}`),
    "the owner's word, said in person, for now or as the pace, overrides it (core/tasks/reviews.md, point 10)"].join("\n");
}

export function main(argv, { ask = a => execFileSync("gh", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }), say = console.log, here = process.env.GITHUB_REPOSITORY } = {}) {
  const at = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  if (!here) try { here = repoOf(execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })); } catch { /* (no origin) */ }
  const repo = at("--repo") ?? here, last = Number(at("--last") ?? LAST), warning = at("--warning") ?? null;
  // (nothing read is said so, and every stage starts together: it fails nothing)
  if (!aRepository(repo) || !(Number.isInteger(last) && last > 0 && last <= 100)) { say("note nothing was read: give --repo <owner/name> and --last a whole number up to 100; every stage starts together when the pull request is ready (core/tasks/reviews.md, point 10)"); return 0; }
  const local = String(repo).toLowerCase() === String(here ?? "").toLowerCase();
  say(said(repo, read({ repo, last, warning, ask, local, dir: local ? ".github/workflows" : null })));
  return 0;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
