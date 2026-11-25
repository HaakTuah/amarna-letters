// The caps on the core's rules (README.md, "Two layers"): what a role reads at its start stays under that role's cap, so
// a new rule there replaces text rather than adding to it (core archive 134 and 234; #304). A role's start is what the
// reading script gives for it (reading.mjs, beside this file): the floor's security.md, the role's own file under
// roles/ and the files that names, with every module a tool's session reads at its start (a builder's own part); a
// file read only when a task calls for it is held instead by the reviews' "content put where its readers must read
// past it" (roles/shared/review-guidelines.md; core archive 201). A cap keeps the rules lean and decides nothing else: no
// rule is moved, cut short or left out to fit, and a change that honest trimming gives no room for raises that role's
// cap in the same pull request, saying why, once a fresh session has read all the rules for room and found too little
// (AGENTS.md, "How changes are made here"; core archive 179 and 181). That session's answer stands in the pull
// request as a comment that opens "Leanness check:" (roles/shared/review-guidelines.md, "A mark on what every session
// reads"), and with --raise this script fails a pull request that raises a role's cap and has no such comment from an
// account the security-review check counts (security-review.mjs's counted: the repository's owner, or a person whose
// rights the host gives as letting them write, read by the size workflow for those who posted one), and one that raises
// it by more than one step. It holds that the comment is there, not what it says, when it was written or that a fresh session
// wrote it: whether the session found too little room stays with the reviews, as does any change to this check itself
// and the first cap of a role that had none. A start or the queue past its cap fails a pull request only where its own
// change grows it there, against the base; where the default branch itself stands past one, since pull requests that
// each fitted merged together, it is a task, never a red: a warning here, and an issue the scheduled look keeps (`due`,
// which look.mjs reads; #750, point 6). The size workflow (.github/workflows/size.yml) runs the raise twice: the
// default branch's version, from the base's own copy before any of the pull request's code runs, reads the head's file
// as text alone, so that no change to this file decides whether the raise its text sets has its answer; and the pull
// request's version, as itself, which holds that the caps its text sets are those it runs with. What caps the head's
// code really holds the rules to, and its count of each role's start, stay its own and its reviews'. Run from this
// repository's root by the size workflow; git and Node's own modules only.
//
//   node scripts/size.mjs [--base <revision>]              what each role reads at its start, against its cap, and
//                                                          the queue against its own mark; with --base, the pull
//                                                          request's base, a start or the queue that this change
//                                                          grows past its cap fails, and one past it there already
//                                                          that it does not grow is a warning, as with no base
//   node scripts/size.mjs --raise <base> <comments> [<rights> [<head>]]
//                                                          a raise has its leanness check: <base>, this file as the
//                                                          pull request's base holds it; <comments>, the pull
//                                                          request's comments as GitHub's API gives them; <rights>,
//                                                          the host's answers on the rights of those who posted one;
//                                                          <head>, this file as the pull request would merge it, read
//                                                          as text, its caps those the text sets (left out, this
//                                                          file itself, its caps those it runs with); OWNER, the
//                                                          repository's owner's login
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { counted as bytesOf, sizeOf } from "./file-size.mjs";
import { gather, library, reading } from "./reading.mjs";
import { counted as countedBy, writersOf } from "./security-review.mjs";
import { started } from "./started.mjs";

// Each role's cap, a whole number of KB: one line a role, spelled exactly so. The record of each cap's raises, with its
// leanness check's numbers, stands in scripts/size-raises.md; whoever raises a cap adds its entry there.
export const CAPS = {
  builder: 32 * 1024,
  design: 33 * 1024,
  orchestrator: 49 * 1024,
  adviser: 34 * 1024,
  reviewer: 28 * 1024,
  "stand-in": 20 * 1024,
  auditor: 20 * 1024,
};
// The core's *progress file*, read at every session's start here, held to a mark of its own, below the general mark a
// project's size marks give each such file (roles/shared/inbox.md, "The progress file holds order only"; core archive 216):
// set at its first trim, as each project sets its own, and raised one step on 17 November 2026 for #534's lines (#537),
// its leanness check having found at most 220 bytes of room for 273 over. A raise of it is read by the reviews, as any
// mark's is (roles/shared/review-guidelines.md, "A mark on what every session reads"); a pull request that grows the
// queue past it, or lowers it below the queue, fails, and the default branch past it is a task (#750, point 6).
export const QUEUE = { file: "QUEUE.md", mark: 5 * 1024 };
const WRITERS = ["OWNER", "MEMBER", "COLLABORATOR"]; // GitHub's own word for who wrote a comment, not the comment's
const ANSWER = /^(?:\*\*)?Leanness check:/u;

// The files a role reads at its start, in the core at `dir`, by their paths there: what the reading script gives for
// the role, and each module a tool's session reads at its start. Null where the role has no file.
export const counted = (role, dir = ".") => startIn(library(dir, ""), role);
function startIn(lib, role) {
  const got = reading(lib, { role });
  if (got.error) return null;
  const parts = Object.entries(lib.modules).filter(([, w]) => w?.start && (w.tools.length || w.others.length)).map(([f]) => f);
  return [...new Set([...got.start, ...parts])];
}

// What each role reads at its start and the queue come to at a revision of this repository, read from git: { role:
// bytes }, with the queue under QUEUE.file. Null where the revision is not named as one or git cannot read it, so that
// the caller fails.
const SAFE = ["-c", "core.fsmonitor=false"]; // (no command of git's settings runs as it reads)
const BASE_FORM = /^\w[\w./^~-]*$/u; // (a revision's name, never an option)
export function sizesAt(revision) {
  if (!BASE_FORM.test(String(revision ?? ""))) return null;
  const show = f => { try { return execFileSync("git", [...SAFE, "show", `${revision}:${f}`], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }); } catch { return null; } };
  try { execFileSync("git", [...SAFE, "rev-parse", "--verify", "--quiet", `${revision}^{commit}`], { stdio: "ignore" }); } catch { return null; }
  const list = folder => { try { return execFileSync("git", [...SAFE, "ls-tree", "--name-only", `${revision}:${folder}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(f => f.endsWith(".md")).sort().map(f => `${folder}/${f}`); } catch { return []; } };
  const lib = gather(f => show(f)?.toString("utf8") ?? null, list), size = f => { const b = show(f); return b === null ? 0 : bytesOf(b); };
  const sizes = { [QUEUE.file]: size(QUEUE.file) };
  for (const role of Object.values(lib.roles).map(r => r.name)) sizes[role] = (startIn(lib, role) ?? []).reduce((sum, f) => sum + size(f), 0);
  return sizes;
}
// The caps the revision `revision` set, { role or QUEUE.file: bytes }, read from its text of this file (capsOf, and
// the queue's mark as QUEUE spells it); {} where it cannot be read, so no cap reads as lowered.
const QUEUE_MARK = /^export const QUEUE = \{ file: "QUEUE\.md", mark: ([1-9][0-9]{0,5}) \* 1024 \};\r?$/m;
export function capsAt(revision) {
  if (!BASE_FORM.test(String(revision ?? ""))) return {};
  let text;
  try { text = execFileSync("git", [...SAFE, "show", `${revision}:scripts/size.mjs`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return {}; }
  const mark = QUEUE_MARK.exec(text);
  return { ...capsOf(text), ...(mark ? { [QUEUE.file]: Number(mark[1]) * 1024 } : {}) };
}
// The roles the core has a file for, at `dir`.
export const rolesAt = (dir = ".") => Object.values(library(dir, "").roles).map(r => r.name);

// The caps a version of this file sets, in bytes, read from its text, { role: bytes }: the one block that sets CAPS,
// a line a role, each a whole number of KB, spelled exactly as above; or, of a version from before each role had its
// own, the one line that set CAP, read as the builder's (with `export` before it or, as it stood at first, without).
// Null where there is no one such block or line, or both: a caller that gets null fails, and never guesses.
const ONE = /^(?:export )?const CAP = ([1-9][0-9]{0,5}) \* 1024;\r?$/m;
export function capsOf(text) {
  if (typeof text !== "string") return null;
  const blocks = [...text.matchAll(/^export const CAPS = \{\r?\n((?:  (?:[a-z][a-z0-9-]*|"[a-z][a-z0-9-]*"): [1-9][0-9]{0,5} \* 1024,\r?\n)+)\};\r?$/gm)];
  const one = [...text.matchAll(/^(?:export )?const CAP = ([1-9][0-9]{0,5}) \* 1024;\r?$/gm)];
  if (blocks.length + one.length !== 1) return null;
  if (one.length) return { builder: Number(one[0][1]) * 1024 };
  const caps = {};
  for (const m of blocks[0][1].matchAll(/^  "?([a-z][a-z0-9-]*)"?: ([1-9][0-9]{0,5}) \* 1024,\r?$/gm)) {
    if (m[1] in caps) return null;
    caps[m[1]] = Number(m[2]) * 1024;
  }
  return caps;
}

// Whether the comments of a pull request, as GitHub's API gives them (a list, or a list of pages), hold a leanness
// check's answer: a comment that opens with it, from the owner, a member or a collaborator, by GitHub's own word, whose
// account `whose` counts (a function of a comment's user, as whoseOf gives it; none, where it is not given).
export function answered(comments, whose = () => false) {
  return (Array.isArray(comments) ? comments.flat() : []).some(c => c !== null && typeof c === "object"
    && WRITERS.includes(c.author_association) && typeof c.body === "string" && ANSWER.test(c.body) && whose(c.user) === true);
}
// Whose answer counts: the repository's owner (`owner`, a login) and the people the host's answers on rights
// (`rights`, as security-review.mjs's writersOf reads them) let write.
export const whoseOf = (owner, rights) => countedBy({ base: { repo: { owner: { login: owner } } } }, [], writersOf(rights));

// What is wrong with a pull request's raise of a cap, as one line; null where nothing is: no cap is raised, or one is
// raised one step and the raise has its answer. `base` and `head` are this file's text at the pull request's base and
// as it would merge, and `running` the caps the head's script really holds the rules to: where the block read from its
// text says another (a look-alike block in a comment, the real one spelled otherwise), the text is not trusted and the
// check fails. A role the base gives no cap is at its first cap: no raise against the one cap of before, which counted
// no role but the builder; against a base with a cap a role, no raise up to the smallest cap that base holds, and above
// it a raise that needs its answer, so that a role's file given another name takes no room its old name had not.
export function raised(base, head, comments, running = capsOf(head), whose = () => false) {
  const from = capsOf(base), to = capsOf(head);
  const same = (a, b) => a !== null && b !== null && JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  if (!same(to, running)) return "scripts/size.mjs: its block that sets CAPS is not the one block the check reads, or does not set the caps the script runs with. Mend: write it as export const CAPS = {, then a line a role as   <role>: <KB> * 1024, and }; with nothing else that sets CAPS or CAP";
  if (from === null) return "the base's scripts/size.mjs has no block that sets CAPS, nor the one line that set CAP, as the check reads them, so whether this pull request raises a cap cannot be told. Mend: bring the branch up to date with main, whose scripts/size.mjs sets them so, and run the check again";
  for (const [role, cap] of Object.entries(to)) {
    const was = from[role], least = Math.min(...Object.values(from));
    if (was === undefined) {
      if (ONE.test(base) || cap <= least || answered(comments, whose)) continue;
      return `scripts/size.mjs: the role ${role}, new here, takes a first cap of ${cap} bytes, above the smallest the base holds (${least}), and the pull request has no comment that opens "Leanness check:" from the owner or a person the host lets write. Mend: have a fresh session read what the role reads at its start for room, post its answer from such an account in a comment that opens "Leanness check:", and run this check again; or set its cap at ${least / 1024} * 1024 or under`;
    }
    if (cap <= was) continue;
    if (cap - was !== 1024) return `scripts/size.mjs: the cap of the role ${role} rises from ${was} to ${cap} bytes, more than one step. Mend: set it to ${was / 1024 + 1} * 1024, one step of a whole KB, or leave it and say the rules in fewer words`;
    if (!answered(comments, whose)) return `scripts/size.mjs: the cap of the role ${role} rises from ${was} to ${cap} bytes, and the pull request has no comment that opens "Leanness check:" from the owner or a person the host lets write. Mend: have a fresh session read all the rules for room, post its answer from such an account in a comment that opens "Leanness check:", and run this check again; or leave the cap and say the rules in fewer words`;
  }
  return null;
}

function raise(baseFile, commentsFile, rightsFile, headFile) {
  let base = null, comments = null, rights = [], head = null;
  try { base = fs.readFileSync(baseFile, "utf8"); comments = JSON.parse(fs.readFileSync(commentsFile, "utf8")); } catch { /* (said below) */ }
  // (rights that cannot be read let no one write: the owner's answer still counts)
  try { if (rightsFile) rights = JSON.parse(fs.readFileSync(rightsFile, "utf8")); } catch { rights = []; }
  try { head = fs.readFileSync(headFile ?? fileURLToPath(import.meta.url), "utf8"); } catch { /* (said below) */ }
  if (comments === null || head === null) { console.error("FAIL: the base's size.mjs, the pull request's comments or the head's size.mjs could not be read. Mend: name them, readable: node scripts/size.mjs --raise <base> <comments, as JSON> [<rights> [<head>]]"); return 1; }
  const running = headFile === undefined ? CAPS : capsOf(head);
  const wrong = raised(base, head, comments, running, whoseOf(process.env.OWNER, rights));
  if (wrong) { console.error(`FAIL: ${wrong}`); return 1; }
  const from = capsOf(base), up = Object.keys(running).filter(r => from[r] !== undefined && from[r] < running[r]);
  console.log(up.length ? `ok   the cap of ${up.join(", ")} rises one step, and the pull request holds a leanness check's answer` : "ok   no role's cap is raised");
  return 0;
}
// One role's start against its cap: { total, wrong }, wrong the failure with its mend where the start cannot be counted.
function startOf(role, roles) {
  const files = roles.includes(role) ? counted(role) : null, cap = CAPS[role];
  if (files === null) return { wrong: `scripts/size.mjs gives the role ${role} a cap, and roles/ holds no file for it. Mend: take its line out of CAPS, or put its file back` };
  if (cap === undefined) return { wrong: `the role ${role} has no cap. Mend: give it a line in CAPS of scripts/size.mjs, the whole KB next above what it reads at its start, and say so in the pull request` };
  const missing = files.filter(f => !fs.existsSync(f));
  if (missing.length) return { wrong: `what the role ${role} reads at its start cannot be counted: ${missing.join(", ")}. Mend: put back the file moved or taken out, or name it as it now stands in roles/${role}.md` };
  const total = files.reduce((sum, f) => sum + sizeOf(f), 0);
  console.log(`what the role ${role} reads at its start (${files.join(", ")}): ${total} bytes of ${cap}`);
  return { total };
}

const TRIM = {
  role: "say the rules this\npull request changes in fewer words and trim what is said twice; raise the role's cap by one KB only once a fresh session\n"
    + "has read all the rules for room and found too little, its answer posted in a comment that opens \"Leanness check:\".",
  queue: "take out each finished line, and any\nnote, which belongs in the description of its line's pull request: the file holds what is next and nothing done.",
};

// What is past its cap, each { what, total, cap, kind }: kind "role" or "queue". `wrong` gathers what cannot be counted.
function measured(roles, wrong) {
  const out = [];
  for (const role of [...new Set([...roles, ...Object.keys(CAPS)])]) {
    const got = startOf(role, roles);
    if (got.wrong) wrong.push(got.wrong);
    else out.push({ what: role, total: got.total, cap: CAPS[role], kind: "role", said: `what the role ${role} reads at its start` });
  }
  const queue = sizeOf(QUEUE.file);
  console.log(`the queue (${QUEUE.file}): ${queue} bytes of its mark, ${QUEUE.mark}`);
  out.push({ what: QUEUE.file, total: queue, cap: QUEUE.mark, kind: "queue", said: QUEUE.file });
  return out.filter(m => m.total > m.cap);
}

// What a pull request or the default branch makes of each start or the queue past its cap: { fail, task }. Against
// `base` ({ role or QUEUE.file: bytes }) and the caps it set (`caps`, the same form), one this change grows past its
// cap fails, and so does one past a cap this change lowered; one past it at the base already that the change neither
// grows nor lowers the cap of, and any where no base is told, is a task (#750, point 6).
export function judged(over, base = null, caps = {}) {
  const fail = [], task = [];
  for (const m of over) {
    const was = base?.[m.what] ?? 0, by = m.total - m.cap, had = caps[m.what];
    if (base && had !== undefined && m.cap < had) fail.push(`${m.said} is ${by} bytes over its ${m.kind === "queue" ? "mark" : "cap"}, which this change lowers from ${had / 1024} KB to ${m.cap / 1024} KB. Mend: set it back to ${had / 1024} * 1024, the base's ${m.kind === "queue" ? "mark" : "cap"}, in scripts/size.mjs, or trim what stands to fit under the lower one in the same pull request`);
    else if (base && m.total > was) fail.push(`${m.said} is ${by} bytes over its cap${was > m.cap ? `, ${m.total - was} of them this change's own` : ""}. Mend: ${TRIM[m.kind]}`);
    else task.push(`${m.said} is ${by} bytes over its cap${base ? ", as it stood before this change, which does not grow it" : ""}`);
  }
  return { fail, task };
}

// The issue the scheduled look keeps while what a role reads at its start, or the queue, stands past its cap on the
// default branch (look.mjs, its readers of what is due): in the core alone, where no manifest stands; a body of null,
// once nothing stands past one, closes it. Counted at the root it is run from.
export const DUE_TITLE = "What a role reads at its start passes its cap";
export function due({ manifest }) {
  if (manifest !== null || !fs.existsSync("roles") || !fs.existsSync(QUEUE.file)) return null;
  const log = console.log, wrong = [];
  console.log = () => {};
  let over;
  try { over = measured(rolesAt(), wrong); } finally { console.log = log; }
  const { task } = judged(over);
  if (!task.length) return { title: DUE_TITLE, body: null };
  return { title: DUE_TITLE, body: [`Pull requests that each fitted merged together and took the default branch past a cap (\`node scripts/size.mjs\`; AGENTS.md, "The size caps keep the rules lean and decide nothing else"). A task to trim, which fails no pull request: say the rules in fewer words and trim what is said twice, the role's cap raised one KB only as that rule says.`, "", ...task.map(t => `- ${t}.`)].join("\n") };
}

function main([flag, baseFile, commentsFile, rightsFile, headFile]) {
  if (flag === "--raise") return raise(baseFile, commentsFile, rightsFile, headFile);
  const roles = rolesAt();
  if (!roles.length || !fs.existsSync(QUEUE.file)) { console.error(`FAIL: what each role reads at its start cannot be counted: ${roles.length ? QUEUE.file : "roles/"} is not here. Mend: run it from the core's root, where roles/ and ${QUEUE.file} stand, or put back what was moved or taken out`); return 1; }
  if (flag !== undefined && flag !== "--base") { console.error(`FAIL: ${flag} is no option of this check. Mend: run node scripts/size.mjs, with --base <the pull request's base> on a pull request, or --raise <base> <comments> [<rights> [<head>]]`); return 1; }
  const base = flag === "--base" ? sizesAt(baseFile) : null;
  if (flag === "--base" && base === null) { console.error(`FAIL: git cannot read the base ${baseFile ?? "(none named)"}. Mend: name a revision git holds here (the workflow fetches the merge commit's parents: HEAD^1)`); return 1; }
  const wrong = [], { fail, task } = judged(measured(roles, wrong), base, base ? capsAt(baseFile) : {});
  for (const t of task) console.log(`::warning::${t}, which fails nothing: a task to trim, which the scheduled look keeps as the issue "${DUE_TITLE}"`);
  for (const w of [...wrong, ...fail]) console.error(`FAIL: ${w}`);
  return wrong.length || fail.length ? 1 : 0;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
