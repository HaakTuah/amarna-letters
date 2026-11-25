// A change to the floor or the review guidelines that keeps the meaning asks no yes of the owner (floor rule 3;
// roles/shared/review-guidelines.md, "A change that keeps the meaning is stated so"; #886, point 2). Two readers:
//   - stated: for the description check (pr-description.mjs, beside this file), of the files that ask the yes and that
//     path-only.mjs does not prove, those the design check states keep their meaning. Of the pull request's comments
//     written by an account the host gives its higher right and edited, where at all, by such accounts alone
//     (owner-yes.mjs's countedOf; never its description, which its builder writes), the newest that opens
//     "Design check:" decides: a path it names on a line of its own "Meaning unchanged:" is stated where the commit its
//     first line names by its whole SHA holds that file as the same blob as the pull request's head. It states nothing
//     where the pull request changes a file that decides the check (path-only.mjs's read: the description check, what
//     it imports, its workflow and what that sets up), so the code that reads the statement is `main`'s. What it does
//     not read: whether the meaning is kept, and who wrote the comment, since builder and reviewer post under one login
//     (tasks/reviews.md, point 3): the reviewer's word and the state report's list hold those.
//   - floorChanges: for the core's monthly state report (state-report.mjs, beside this file), the pull requests merged in
//     a month that changed a file that asks the yes, each saying whether it quotes anything under "The owner's word", so
//     the owner can look them over; the session that takes the report runs it:
//
//       node scripts/meaning-kept.mjs --month <YYYY-MM> [--repo <owner>/<name>]
//
// It never guesses: what it cannot read states nothing, and the yes is asked. gh, git and Node's own modules.
import { spawnSync } from "node:child_process";
import { after, mergedIn } from "./cited.mjs";
import { CORE } from "./core-address.mjs";
import { asks, countedOf, ghCall, quoted } from "./owner-yes.mjs";
import { read } from "./path-only.mjs";
import { started } from "./started.mjs";

export const LINE = "Meaning unchanged:", ABSENT = "absent";
const DESIGN = /^Design check:[ \t]*([0-9a-f]{40})(?![0-9a-f])/u;

// The paths a comment states keep their meaning, on lines of their own that open LINE: split at commas or blanks, each
// taken out of backticks, a closing "." dropped.
export function pathsOf(body) {
  const lines = String(body ?? "").split(/\r\n|\r|\n/u).filter(l => l.trimStart().startsWith(LINE));
  return lines.flatMap(l => l.trimStart().slice(LINE.length).split(/[,\s]+/u)).map(p => p.replace(/^`+|[`.]+$/gu, "")).filter(Boolean);
}

// Of `asked` (paths that ask the yes), those the newest design check among `notes` (countedOf's, in the host's order)
// states keep their meaning, where the change it read is the change that merges: `blob(at, path)` gives the same blob
// at the commit it names as at "head", and the same at `base(sha)`, that commit's merge base with the base branch, as
// at "base", the base branch now; each may be ABSENT (a file the change adds or deletes, its text moved or merged),
// none null. So a merge from the base branch whose settling undoes what the base branch changed in the file states
// nothing, and the base branch's moving the file asks the design check again.
export function stated({ notes, asked, blob, base }) {
  const design = [...notes].reverse().find(n => n.comment && DESIGN.test(String(n.body).trimStart()));
  if (!design) return [];
  const sha = String(design.body).trimStart().match(DESIGN)[1], named = new Set(pathsOf(design.body)), from = base(sha);
  const same = (p, x, y) => { const one = blob(x, p); return one !== null && one === blob(y, p); };
  return from === null ? [] : asked.filter(p => named.has(p) && same(p, sha, "head") && same(p, from, "base"));
}

// (owner-yes.mjs's call, a REST route or "graphql" with its query, null where gh's answer is no JSON)
const ghJson = (route, query) => { try { return ghCall(route, query); } catch { return null; } };
const git = (cwd, args) => { const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 26 }); return r.status === 0 ? r.stdout : null; };

// The paths of `asked` the design check of pull request `number` of `repo` states keep their meaning, in `cwd` with the
// merge commit checked out (HEAD^1 the base, HEAD^2 the head): [] where anything cannot be read, the pull request's
// comments whole among it, since a newer design check may take the statement back. `gh`, `run` (git's output for its
// arguments, null where it fails) and `change` (path-only.mjs's read) stand in for the host and git in the tests.
export function statedOf({ cwd, repo, number, asked, gh = ghJson, run = args => git(cwd, args), change = () => read(cwd, "HEAD^1", "HEAD") }) {
  if (!asked.length || !/^\d{1,7}$/u.test(String(number)) || !/^[\w.-]+\/[\w.-]+$/u.test(repo)) return [];
  const got = change();
  if (got === null || got.self) return [];
  const { notes, read: whole } = countedOf(repo, [Number(number)], gh);
  if (!whole) return [];
  // (a commit read whole from the host's tree once; a tree it gives cut short is unread)
  const trees = new Map(), parent = { head: "HEAD^2", base: "HEAD^1" };
  const blob = (at, p) => {
    if (at in parent) {
      const out = run(["--literal-pathspecs", "ls-tree", "-z", "--full-tree", parent[at], "--", p]);
      if (out === null) return null;
      if (out === "") return ABSENT;
      const m = out.match(/^\d{6} blob ([0-9a-f]{40})\t([^\0]*)\0$/u);
      return m && m[2] === p ? m[1] : null;
    }
    if (!trees.has(at)) { const t = gh(`repos/${repo}/git/trees/${at}?recursive=1`); trees.set(at, Array.isArray(t?.tree) && t.truncated === false ? t.tree : null); }
    const tree = trees.get(at);
    if (tree === null) return null;
    const entry = tree.find(e => e?.path === p);
    return entry === undefined ? ABSENT : entry.type === "blob" && typeof entry.sha === "string" ? entry.sha : null;
  };
  // (the merge base, as the host gives it, of the base branch now and the commit the design check names)
  const base = sha => {
    const now = run(["rev-parse", "--verify", "--quiet", "HEAD^1"])?.trim();
    const got = /^[0-9a-f]{40}$/u.test(now ?? "") ? gh(`repos/${repo}/compare/${now}...${sha}?per_page=1`)?.merge_base_commit?.sha : null;
    return /^[0-9a-f]{40}$/u.test(String(got)) ? got : null;
  };
  return stated({ notes, asked, blob, base });
}

// The pull request's number in the run of a pull request's event (GITHUB_REF refs/pull/<n>/merge), or null.
export const numberOf = ref => String(ref ?? "").match(/^refs\/pull\/(\d{1,7})\/merge$/u)?.[1] ?? null;

// Of `pulls` merged ({ number, title, body, files }), those whose files ask the yes, each saying whether its description
// quotes anything under "The owner's word", those that quote nothing first: the lines of the state report, every such
// change listed, since a quote for one file says nothing of another's statement and no script reads whose a quote is;
// null where `pulls` could not be read.
export function floorChanges(pulls) {
  if (pulls === null) return null;
  const found = pulls.filter(p => p.files !== null && p.files.some(asks)), line = (p, how) => `- #${p.number} ${p.title}: ${p.files.filter(asks).join(", ")}; ${how}.`;
  const unread = pulls.filter(p => p.files === null).length;
  return [
    ...found.filter(p => quoted(p.body).length === 0).map(p => line(p, "no yes quoted")),
    ...found.filter(p => quoted(p.body).length > 0).map(p => line(p, "a yes quoted")),
    ...(found.length ? [] : ["- None."]),
    ...(unread ? [`- Not read: the files of ${unread} merged pull request${unread === 1 ? "" : "s"}, which the host did not give whole (gh).`] : []),
  ];
}

// The pull requests of `repo` merged in `month` ("YYYY-MM") with the files each changed, its own and those it renamed
// away from, as the host gives them (a merge of any method, rebased ones too), null where they could not be listed.
export function mergedFiles({ repo, from, to, list = mergedIn, gh = ghJson }) {
  try {
    return list(repo, from, to).map(p => {
      const files = [];
      for (let page = 1; page <= 30; page++) {
        const one = /^\d{1,7}$/u.test(String(p.number)) ? gh(`repos/${repo}/pulls/${p.number}/files?per_page=100&page=${page}`) : null;
        if (!Array.isArray(one)) return { number: p.number, title: p.title, body: p.body ?? "", files: null };
        files.push(...one.flatMap(f => [f?.filename, f?.previous_filename]).filter(f => typeof f === "string"));
        if (one.length < 100) return { number: p.number, title: p.title, body: p.body ?? "", files };
      }
      // (past the host's 3,000 files a list is cut short)
      return { number: p.number, title: p.title, body: p.body ?? "", files: null };
    });
  } catch { return null; }
}

// The command's run: its exit code, what it printed through `say`.
export function main(args, say = console.log) {
  const at = name => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1] ?? null; };
  const month = at("--month"), repo = at("--repo") ?? CORE;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(month ?? "") || !/^[\w.-]+\/[\w.-]+$/u.test(repo)) {
    say("FAIL: the month or the repository is not given in its form. Mend: run node scripts/meaning-kept.mjs --month <YYYY-MM> [--repo <owner>/<name>]");
    return 1;
  }
  const lines = floorChanges(mergedFiles({ repo, from: `${month}-01T00:00:00Z`, to: `${after(month)}-01T00:00:00Z` }));
  say((lines ?? [`- Not read: the pull requests merged in ${month} could not be listed (gh).`]).join("\n"));
  return 0;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
