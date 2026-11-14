// The stalled lanes (modules/orchestrating.md, "A stalled lane"; core archive 200): run in a project's clone on every
// wake of its orchestrator, it reads the repository's open pull requests (gh, page by page) and the time of each one's
// newest commit, and prints those whose branch has had no push for longer than the given hours (3 unless --hours says
// otherwise), oldest first, so that no session's word that a lane is "running" stands in for the clock. Pull requests
// from a fork and Dependabot's own are no lanes and are left out. It prints one line when none has stalled, reads
// only, posts nothing and always exits 0 where it could read: what to do with a stalled lane stays the orchestrator's.
// gh and Node's own modules.
//
//   node core/scripts/stalled.mjs [--hours N] [--repo owner/name]
import { execFileSync } from "node:child_process";
import { REPO } from "./core-cost.mjs";
import { started } from "./started.mjs";

// The lanes, given as { number, title, ref, own (its branch is in this repository), at (its newest commit) }, that have
// had no push for longer than `hours` at `now`, oldest first, each with how long it has waited.
export function stalled(pulls, now, hours) {
  return pulls
    .filter(p => p.own && !String(p.ref).startsWith("dependabot/") && Number.isFinite(Date.parse(p.at)))
    .map(p => ({ ...p, waited: (now - Date.parse(p.at)) / 3600000 }))
    .filter(p => p.waited > hours)
    .sort((a, b) => b.waited - a.waited);
}

// A title or a branch's name as it may be printed: no control characters.
const plain = text => String(text ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");

export function print(lanes, open, hours) {
  if (!lanes.length) return `No lane stalled: ${open} open, none without a push for over ${hours} h.`;
  return [`Stalled, no push for over ${hours} h: ${lanes.length} of ${open} open`,
    ...lanes.map(l => `  #${l.number} ${plain(l.ref)}: ${l.waited.toFixed(1)} h since ${l.at} (${plain(l.title)})`)].join("\n");
}

function main(args) {
  const fail = msg => { console.error(`FAIL: ${msg}`); process.exit(1); };
  const at = args.indexOf("--repo"), h = args.indexOf("--hours");
  if (at >= 0 && !REPO.test(args[at + 1] ?? "")) fail("--repo needs owner/name after it");
  const hours = h >= 0 ? Number(args[h + 1]) : 3;
  if (!(hours > 0 && hours <= 168)) fail("--hours needs a number of hours above 0 and up to 168 after it");
  let repo = at >= 0 ? args[at + 1] : process.env.GITHUB_REPOSITORY;
  if (!repo) try {
    repo = /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim())?.[1];
  } catch { /* (no origin) */ }
  if (!REPO.test(repo ?? "")) fail("the repository is not known: give --repo owner/name, or run in a clone of it");
  const api = (path, jq) => execFileSync("gh", ["api", path, "--jq", jq], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 26 });
  const pulls = [];
  // (page by page: a cloud session's gh cannot follow pages by itself)
  for (let page = 1; page <= 50; page++) {
    const rows = api(`repos/${repo}/pulls?state=open&per_page=100&page=${page}`,
      ".[] | [.number, .title, .head.ref, .head.sha, ((.head.repo.full_name // \"\") | ascii_downcase)] | @json")
      .split("\n").filter(Boolean).map(l => JSON.parse(l));
    for (const [number, title, ref, sha, from] of rows) pulls.push({ number, title, ref, sha, own: from === repo.toLowerCase() });
    if (rows.length < 100) break;
  }
  for (const p of pulls) if (p.own && /^[0-9a-f]{40}$/.test(p.sha)) p.at = api(`repos/${repo}/commits/${p.sha}`, ".commit.committer.date").trim();
  console.log(print(stalled(pulls, Date.now(), hours), pulls.length, hours));
}

if (started(import.meta.url)) main(process.argv.slice(2));
