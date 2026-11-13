// What the core costs a project and what the project gets done beside it (AGENTS.md of the core, "The core is measured
// as a feature is"): run in a project's clone, it reads every pull request merged into the default branch (the merge
// commits on its first-parent line; a pull request merged any other way is not seen) and sorts each by what it
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
// changes nothing. Git, gh for --cost, and Node's own modules.
//
//   node core/scripts/core-cost.mjs [--since YYYY-MM-DD] [--split YYYY-MM-DD] [--cost]
import { execFileSync } from "node:child_process";
import { ruleFiles } from "./rule-files.mjs";
import { started } from "./started.mjs";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
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

// The session a description names (the link a cloud session ends it with), or "" where it names none.
export const sessionOf = body => /claude\.ai\/code\/(session_[A-Za-z0-9]+)/.exec(String(body ?? ""))?.[1] ?? "";

// The pull requests whose descriptions count, from what gh gave of each ([number, the repository its branch is in, its
// description]): only those from a branch of the repository itself, at or past the oldest merge read. A fork's is left
// out whole, as if it were not there: anyone can open one, name a session in it and write a line of any size, and
// counted even as "no line" it would wipe that session's reading.
export function readings(rows, repo, oldest) {
  return rows.filter(([number, from]) => number >= oldest && String(from ?? "").toLowerCase() === repo.toLowerCase())
    .map(([number, , body]) => ({ number, session: sessionOf(body), reading: reading(body) }));
}

// What each pull request took: `pulls` are { number, session, reading } in any order. A pull request is priced by how
// far its session's line rose since that session's pull request before it, and only where every part of the line rose
// or stood: the first of a session, one with no session or no line, and one whose line dropped are not priced. Nor is
// the one after a pull request of that session with no line, since what rose since the reading before belongs to both.
export function priced(pulls) {
  const last = new Map(), took = new Map();
  for (const p of [...pulls].sort((a, b) => a.number - b.number)) {
    if (!p.session) continue;
    if (!p.reading) { last.delete(p.session); continue; }
    const before = last.get(p.session);
    last.set(p.session, p.reading);
    if (!before) continue;
    const rose = Object.keys(p.reading).every(k => p.reading[k] >= before[k]);
    if (rose && p.reading.answers > before.answers) took.set(p.number, { answers: p.reading.answers - before.answers, out: p.reading.out - before.out });
  }
  return took;
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
  const width = head.map((_, i) => Math.max(...lines.map(l => l[i].length)));
  return lines.map(l => l.map((c, i) => i ? c.padStart(width[i]) : c.padEnd(width[i])).join("  ")).join("\n");
}

function main(argv) {
  const fail = msg => { console.error(`FAIL: ${msg}`); process.exit(1); };
  const value = name => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
  const since = value("--since"), split = value("--split"), cost = argv.includes("--cost");
  for (const [name, v] of [["--since", since], ["--split", split]]) if (argv.includes(name) && !DAY.test(v ?? "")) fail(`${name} takes a day, YYYY-MM-DD`);
  let rules;
  try { process.chdir(git(["rev-parse", "--show-toplevel"]).trim()); rules = ruleFiles(); } catch (e) { fail(`run it in a project that takes the core: ${e.message.split("\n")[0]}`); }
  const ref = defaultRef(name => { try { git(["rev-parse", "--verify", "--quiet", `${name}^{commit}`]); return true; } catch { return false; } });
  if (!ref) fail("the clone knows no default branch: neither origin's, nor a main of origin's or of its own");
  const log = git(["log", "--first-parent", "--merges", "--format=%H%x09%cI%x09%s", ...(since ? [`--since=${since}T00:00:00Z`] : []), ref]);
  // (the repository, from GitHub's own variable or origin's address: whose branches are its own, and where --cost asks)
  let repo = process.env.GITHUB_REPOSITORY;
  if (!repo) try { repo = /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(git(["remote", "get-url", "origin"]).trim())?.[1]; } catch { /* (no origin) */ }
  if (!REPO.test(repo ?? "")) repo = null;
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
    merged.push({ number: Number(m[1]), when, kind, lines });
  }
  if (!merged.length) fail("no merged pull request found on the default branch's first-parent line");

  if (cost) {
    if (!repo) fail("--cost: the repository is not known (GITHUB_REPOSITORY, or origin's address)");
    const pulls = [], oldest = Math.min(...merged.map(m => m.number));
    // (page by page, newest first, until the oldest merge here is passed: a cloud session's gh cannot follow pages by
    // itself. Every pull request of the repository's own from that one on is read, merged or not, open or closed: one
    // a session left unmerged between two merged ones holds a reading of its own, and without it the later one would
    // be charged for both)
    for (let page = 1; page <= 200; page++) {
      const out = execFileSync("gh", ["api", `repos/${repo}/pulls?state=all&sort=created&direction=desc&per_page=100&page=${page}`,
        "--jq", ".[] | [.number, (.head.repo.full_name // \"\"), (.body // \"\")] | @json"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 28 });
      const rows = out.split("\n").filter(Boolean).map(l => JSON.parse(l));
      pulls.push(...readings(rows, repo, oldest));
      if (rows.length < 100 || rows.some(([number]) => number < oldest)) break;
    }
    const took = priced(pulls);
    for (const m of merged) m.took = took.get(m.number) ?? null;
  }

  const groupOf = split ? m => (dayOf(m.when) < split ? `before ${split}` : `from ${split} on`) : m => `week of ${weekOf(m.when)}`;
  const rows = table(merged, groupOf);
  if (split) rows.sort((a, b) => a.key.startsWith("before") ? -1 : 1);
  console.log(print(rows, cost));
  if (cost) console.log("\nAnswers and output tokens are the median of the pull requests that could be priced (of how many: in brackets), and a floor: a session's line can lose answers. A core PR is a sync or other upkeep.");
}

if (started(import.meta.url)) main(process.argv.slice(2));
