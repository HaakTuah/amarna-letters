// What the core costs a project and what the project gets done beside it (AGENTS.md of the core, "The core is measured
// as a feature is"): run in a project's clone, it reads every pull request merged into the default branch (the merge
// commits on its first-parent line; a pull request merged any other way is not seen; a shallow clone that cannot show every merge is refused, with its
// mend, #1027) and sorts each by what it
// changed:
//   sync     only the copy of the core, the manifest and workflows, the copy among them: what a sync PR holds
//   upkeep   only the copy, the manifest, the rule files (rule-files.mjs), .github/ and .claude/: rules and checks
//   update   one of Dependabot's own
//   own      anything else: the project's own work, its docs included
// and prints, week by week, how many of each merged, the share that was the core's upkeep (sync and upkeep together)
// and the lines of its own work that changed. With --split it prints the same for all before a day and all from it
// on, as for the day the project took the core. Weeks and days are UTC's. With --cost it also reads each pull request's description (gh, page by
// page) for the line session-cost.mjs prints, and says what a pull request took: the answers and output tokens a
// session's line rose by since that session's pull request before it. That line was no steady count before
// session-cost.mjs kept a tally of its own (a session's record can lose answers, and the line then dropped), and
// drops still where a tally is lost, so a pull request is priced only where its session's line rose in every part,
// the rest are counted as not priced, and what is printed is a floor. It reads; it writes nothing and
// changes nothing. With --cap it reads the same and says the cap of a move that must happen all at once (core/tasks/
// choices.md, "A move that pays is built in steps"; #515): what the pull requests merged in the 14 days up to the
// newest merge took; with --pulls, what the pull requests named took, a move's own. Git, gh for --cost, --cap and
// --pulls, and Node's own modules.
//
//   node core/scripts/core-cost.mjs [--since YYYY-MM-DD] [--split YYYY-MM-DD] [--cost] [--cap] [--pulls <n,n,...>]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { CORE } from "./core-address.mjs";
import { ruleFiles } from "./rule-files.mjs";
import { started } from "./started.mjs";

export const DAY = /^\d{4}-\d{2}-\d{2}$/;
const git = args => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
const within = (file, dir) => file === dir || file.startsWith(`${dir}/`);

// A repository's name as GitHub has it: an account (letters, digits, hyphens, and the underscore a managed account
// holds) and a name that is not dots alone, so it is one repository's route and never a path out of it.
export const REPO = /^[A-Za-z0-9_-]+\/(?!\.+$)[\w.-]+$/;

// What a merged pull request was, by its branch and the files it changed (`rules`: the project's rule files). A branch
// counts as Dependabot's only where it is the repository's own (`ours`): a fork may name a branch anything.
export function classify(branch, files, rules, ours = true) {
  if (ours && /^dependabot\//.test(branch)) return "update";
  const copy = f => within(f, "core") || f === "core-manifest.md";
  if (files.length && files.some(f => within(f, "core")) && files.every(f => copy(f) || /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f))) return "sync";
  if (files.length && files.every(f => copy(f) || within(f, ".github") || within(f, ".claude") || rules.includes(f))) return "upkeep";
  return "own";
}

// The day (UTC) a moment falls on, as YYYY-MM-DD, whatever offset it was written with.
export const dayOf = iso => new Date(iso).toISOString().slice(0, 10);

// The branch whose merges are read: the default branch as the clone knows its origin's, else origin's main, else its
// own main (the core's projects all name it so: core.yml), by the first of them `has`; never the branch checked out,
// which may be a task's. Null where there is none of them.
export const defaultRef = has => ["refs/remotes/origin/HEAD", "refs/remotes/origin/main", "refs/heads/main"].find(has) ?? null;

// The Monday (UTC) of the week a moment falls in, as YYYY-MM-DD.
export function weekOf(iso) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}

// The counts of a session-cost line, or null where the text has none.
export function reading(body) {
  const m = /^Session so far: ([\d,]+) answers.*?tokens in ([\d,]+), cache written ([\d,]+), cache read ([\d,]+), out ([\d,]+)\./m.exec(String(body ?? ""));
  if (!m) return null;
  const [answers, input, written, read, out] = m.slice(1).map(n => Number(n.replace(/,/g, "")));
  return [answers, input, written, read, out].every(Number.isSafeInteger) ? { answers, input, written, read, out } : null;
}

// The session a description names (the link a cloud session ends it with: the last, so a link it quotes of another
// session's further up is not taken for its own), or "" where it names none.
export const sessionOf = body => [...String(body ?? "").matchAll(/claude\.ai\/code\/(session_[A-Za-z0-9]+)/g)].at(-1)?.[1] ?? "";

// The pull requests whose descriptions count, from what gh gave of each ([number, the repository its branch is in, its
// description]): only those from a branch of the repository itself, at or past the oldest merge read. A fork's is left
// out whole, as if it were not there: anyone can open one, name a session in it and write a line of any size, and
// counted even as "no line" it would wipe that session's reading.
export function readings(rows, repo, oldest) {
  // (a number that is no whole number GitHub could give, text "12" or one past the safe integer, is read as none)
  return rows.filter(([number, from]) => Number.isSafeInteger(number) && number > 0 && number >= oldest && String(from ?? "").toLowerCase() === repo.toLowerCase())
    .map(([number, , body]) => ({ number, session: sessionOf(body), reading: reading(body) }));
}

// What each pull request took: `pulls` are { number, session, reading } in any order. A pull request is priced by how
// far its session's line rose since that session's pull request before it, and only where every part of the line rose
// or stood: the first of a session, one with no session or no line, and one whose line dropped are not priced. Nor is
// the one after a pull request of that session with no line, since what rose since the reading before belongs to both.
// Each priced one: the answers, output tokens and tokens carried in (input, cache written and read) it rose by.
export function priced(pulls) {
  const last = new Map(), took = new Map();
  for (const p of [...pulls].sort((a, b) => a.number - b.number)) {
    if (!p.session) continue;
    if (!p.reading) { last.delete(p.session); continue; }
    const before = last.get(p.session);
    last.set(p.session, p.reading);
    if (!before) continue;
    const rose = Object.keys(p.reading).every(k => p.reading[k] >= before[k]);
    if (rose && p.reading.answers > before.answers) {
      const read = r => r.input + r.written + r.read; // (what went into the answers, the cache included)
      took.set(p.number, { answers: p.reading.answers - before.answers, out: p.reading.out - before.out, into: read(p.reading) - read(before) });
    }
  }
  return took;
}

// What the pull requests numbered `numbers` took, of those `took` (priced()) prices: { answers, out, into, priced, of },
// a floor, since one not priced adds nothing.
export function sumOf(took, numbers) {
  const sum = { answers: 0, out: 0, into: 0, priced: 0, of: numbers.length };
  for (const n of numbers) { const t = took.get(n); if (t) { sum.answers += t.answers; sum.out += t.out; sum.into += t.into; sum.priced++; } }
  return sum;
}

// The days a move's cap reads back from the newest merge (#515, point 9: a first guess).
export const CAP_DAYS = 14;

// The cap of a move that must happen all at once: what the pull requests `merged` (mergedPulls()) in the CAP_DAYS up
// to the newest of them took, as sumOf() gives it, with the days it read from and to; null where none merged.
export function cap(merged, took) {
  if (!merged.length) return null;
  const newest = Math.max(...merged.map(m => Date.parse(m.when)));
  const from = newest - CAP_DAYS * 86400000;
  return { ...sumOf(took, merged.filter(m => Date.parse(m.when) > from).map(m => m.number)), from: dayOf(new Date(from).toISOString()), to: dayOf(new Date(newest).toISOString()) };
}

// A sum as one line: what it is, then the answers, output tokens and tokens carried in, and how many were priced.
export const summed = (what, s) => `${what}: ${s.answers.toLocaleString("en-US")} answers, ${s.out.toLocaleString("en-US")} output tokens, ${s.into.toLocaleString("en-US")} tokens carried in, from ${s.priced} of ${s.of} pull requests priced (a floor: one not priced adds nothing).`;

// The pull requests --pulls names, as numbers, or null where it is not given; `fail` where it names none.
export function pullsOf(argv, fail) {
  if (!argv.includes("--pulls")) return null;
  const named = String(argv[argv.indexOf("--pulls") + 1] ?? "");
  if (!/^\d+(,\d+)*$/.test(named)) fail("--pulls takes the numbers of pull requests, separated by commas: --pulls 12,15,20");
  return named.split(",").map(Number);
}

// What --cap and --pulls print: the cap of a move, and what the pull requests named took, each a line.
export function sums(merged, took, capped, named) {
  const c = capped ? cap(merged, took) : null;
  return [c && summed(`The cap of a move (core/tasks/choices.md), what the pull requests merged from ${c.from} to ${c.to} took`, c),
    named && summed(`What pull requests ${named.map(n => `#${n}`).join(", ")} took`, sumOf(took, named))].filter(Boolean).join("\n");
}

export const median = list => { const s = [...list].sort((a, b) => a - b); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : null; };

// The rows of the table: one for each group (a week, or a side of the split), in order, each with its counts.
export function table(merged, groupOf) {
  const rows = new Map();
  for (const m of merged) {
    const key = groupOf(m);
    const row = rows.get(key) ?? { key, all: 0, own: 0, sync: 0, upkeep: 0, update: 0, lines: 0, took: { own: [], core: [] }, unpriced: 0 };
    row.all++; row[m.kind]++; row.lines += m.lines;
    if (!m.took) row.unpriced++;
    else if (m.kind !== "update") row.took[m.kind === "own" ? "own" : "core"].push(m.took);
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => a.key < b.key ? -1 : 1);
}

// The rows of a table as text, the first column left and the rest right, each as wide as its widest cell.
export function grid(lines) {
  const width = lines[0].map((_, i) => Math.max(...lines.map(l => l[i].length)));
  return lines.map(l => l.map((c, i) => i ? c.padStart(width[i]) : c.padEnd(width[i])).join("  ")).join("\n");
}

export function print(rows, cost) {
  const pct = (a, b) => b ? `${Math.round(100 * a / b)}%` : "-";
  const head = ["", "merged", "own", "sync", "upkeep", "update", "the core's share", "own lines"];
  if (cost) head.push("own PR: answers", "out tokens", "core PR: answers", "priced");
  const lines = [head, ...rows.map(r => {
    const row = [r.key, r.all, r.own, r.sync, r.upkeep, r.update, pct(r.sync + r.upkeep, r.all), r.lines];
    if (cost) {
      const med = (list, k) => { const v = median(list.map(t => t[k])); return v === null ? "-" : Math.round(v).toLocaleString("en-US"); };
      const of = (list, k) => list.length ? `${med(list, k)} (of ${list.length})` : "-";
      row.push(of(r.took.own, "answers"), med(r.took.own, "out"), of(r.took.core, "answers"), `${r.all - r.unpriced} of ${r.all}`);
    }
    return row.map(String);
  })];
  return grid(lines);
}

// The repository this clone is of (GitHub's own variable, else origin's address), or null where it is not known.
export function repoOf() {
  let repo = process.env.GITHUB_REPOSITORY;
  if (!repo) try { repo = /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(git(["remote", "get-url", "origin"]).trim())?.[1]; } catch { /* (no origin) */ }
  return REPO.test(repo ?? "") ? repo : null;
}

// The project's rule files for `classify`: in the core's own repository every file is protected (its SECURITY.md, rule 3),
// so every file is a rule file and its pull requests count as upkeep; anywhere else, the list its SECURITY.md gives
// (`read`, rule-files.mjs).
export const EVERY = { includes: () => true };
export const rulesFor = (repo, read = ruleFiles) => (repo === CORE ? EVERY : read());

// Why the merges cannot all be read from this clone, or null where they can: a shallow clone holds no merge older than
// its boundary, and a count from it would pass a part for the whole (#1027). It is shallow and `since` is no day after
// its newest boundary commit (the clone then holds every merge from `since` on), or none is given. The mend is the
// words of the failure; the clone is never deepened here, since a reader changes nothing.
export function shallowGap(since = null) {
  if (git(["rev-parse", "--is-shallow-repository"]).trim() !== "true") return null;
  const file = git(["rev-parse", "--git-path", "shallow"]).trim();
  const days = (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean) : [])
    .map(sha => dayOf(git(["log", "-1", "--format=%cI", sha]).trim()));
  const newest = days.sort().at(-1);
  if (since && newest && since > newest) return null;
  return `the clone is shallow, so it holds no merge older than its boundary${newest ? ` (${newest})` : ""}${since ? ` and --since ${since} reaches before it` : ""}, and a count from it would pass a part for the whole. Mend: run git fetch --unshallow in this clone, then run the command again`;
}

// The pull requests merged into the default branch from `since` (a day, or none), as { number, when, kind, lines },
// and the repository ({ repo, merged }): read from the clone the process runs in, whose root is its directory. It
// throws where the clone knows no default branch. Without a repository no branch counts as Dependabot's, which it says.
export function mergedPulls(rules, since = null) {
  const ref = defaultRef(name => { try { git(["rev-parse", "--verify", "--quiet", `${name}^{commit}`]); return true; } catch { return false; } });
  if (!ref) throw new Error("the clone knows no default branch: neither origin's, nor a main of origin's or of its own");
  const gap = shallowGap(since);
  if (gap) throw new Error(gap);
  const log = git(["log", "--first-parent", "--merges", "--format=%H%x09%cI%x09%s", ...(since ? [`--since=${since}T00:00:00Z`] : []), ref]);
  const repo = repoOf();
  // (said, never passed over: without it no branch counts as Dependabot's, and its merges count by what they changed)
  if (!repo) console.error("note: the repository is not known (GITHUB_REPOSITORY, or origin's address), so no merge is counted as an update of Dependabot's");
  const owner = repo?.split("/")[0].toLowerCase();
  const merged = [];
  for (const line of log.split("\n").filter(Boolean)) {
    const [sha, when, subject] = line.split("\t");
    const m = /^Merge pull request #(\d+) from ([^/\s]+)\/(\S+)/.exec(subject ?? "");
    if (!m) continue;
    const files = git(["diff", "--name-only", "-z", "--no-renames", `${sha}^1`, sha]).split("\0").filter(Boolean);
    const kind = classify(m[3], files, rules, m[2].toLowerCase() === owner);
    let lines = 0;
    if (kind === "own") {
      for (const row of git(["diff", "--numstat", "--no-renames", `${sha}^1`, sha]).split("\n").filter(Boolean)) {
        const [add, del, file] = row.split("\t");
        if (classify("", [file], rules) === "own" && /^\d+$/.test(add)) lines += Number(add) + Number(del);
      }
    }
    merged.push({ number: Number(m[1]), sha, when, kind, lines });
  }
  return { repo, merged };
}

// What each pull request took (priced()), read from the descriptions gh gives of the repository's pull requests,
// page by page, newest first, until the oldest of `merged` is passed: a cloud session's gh cannot follow pages by
// itself. Every pull request of the repository's own from that one on is read, merged or not, open or closed: one a
// session left unmerged between two merged ones holds a reading of its own, and without it the later one would be
// charged for both.
function tookFrom(repo, merged) {
  const pulls = [], oldest = Math.min(...merged.map(m => m.number));
  for (let page = 1; page <= 200; page++) {
    const out = execFileSync("gh", ["api", `repos/${repo}/pulls?state=all&sort=created&direction=desc&per_page=100&page=${page}`,
      "--jq", ".[] | [.number, (.head.repo.full_name // \"\"), (.body // \"\")] | @json"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 28 });
    const rows = out.split("\n").filter(Boolean).map(l => JSON.parse(l));
    pulls.push(...readings(rows, repo, oldest));
    if (rows.length < 100 || rows.some(([number]) => number < oldest)) break;
  }
  return priced(pulls);
}

const fail = msg => { console.error(`FAIL: ${msg}`); process.exit(1); };

// What each merged pull request took, each merge given its price in `took`; and what --cap and --pulls print, where
// either is given (sums()).
function addCosts(merged, repo, capped, named) {
  if (!repo) fail("--cost: the repository is not known (GITHUB_REPOSITORY, or origin's address)");
  const took = tookFrom(repo, merged);
  for (const m of merged) m.took = took.get(m.number) ?? null;
  return sums(merged, took, capped, named);
}

function main(argv) {
  const value = name => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
  const since = value("--since"), split = value("--split"), capped = argv.includes("--cap"), named = pullsOf(argv, fail);
  const cost = [argv.includes("--cost"), capped, named].some(Boolean);
  for (const [name, v] of [["--since", since], ["--split", split]]) if (argv.includes(name) && !DAY.test(v ?? "")) fail(`${name} takes a day, YYYY-MM-DD`);
  let rules;
  try { process.chdir(git(["rev-parse", "--show-toplevel"]).trim()); rules = rulesFor(repoOf()); } catch (e) { fail(`run it in a project that takes the core: ${e.message.split("\n")[0]}`); }
  let repo, merged;
  try { ({ repo, merged } = mergedPulls(rules, since)); } catch (e) { fail(e.message); }
  if (!merged.length) fail("no merged pull request found on the default branch's first-parent line");

  if (cost) {
    const said = addCosts(merged, repo, capped, named);
    if (said) return console.log(said);
  }

  const groupOf = split ? m => (dayOf(m.when) < split ? `before ${split}` : `from ${split} on`) : m => `week of ${weekOf(m.when)}`;
  const rows = table(merged, groupOf);
  if (split) rows.sort((a, b) => a.key.startsWith("before") ? -1 : 1);
  console.log(print(rows, cost));
  if (cost) console.log("\nAnswers and output tokens are the median of the pull requests that could be priced (of how many: in brackets), and a floor: a session's line can lose answers. A core PR is a sync or other upkeep.");
}

if (started(import.meta.url)) main(process.argv.slice(2));
