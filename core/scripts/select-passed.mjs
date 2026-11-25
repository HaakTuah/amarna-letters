// Whether a tree that passed whole is run again (select.mjs; tasks/tests.md, "A tree that passed is not run again";
// #457): the question of whether the tree HEAD holds passed whole on the pull request it merges, and the one question
// asked of the host, whether a check passed on a commit. Split from the selection so that what changes this is read
// apart from what a change selects (#943). Reads only, but for that one question to the host (GITHUB_API_URL, the
// repository GITHUB_REPOSITORY names, the token GH_TOKEN holds); git and Node's own modules.
import { execFileSync } from "node:child_process";

// The one git call of the selection's files.
export const git = args => execFileSync("git", ["-c", "core.fsmonitor=false", ...args], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });

// Whether the tree HEAD holds passed whole on the pull request it merges (the header): { none: true, why } where it did,
// else { all: true, why }. `selects` gives what the change from HEAD's first parent selects; `asked` answers whether
// the check `check` passed on a commit, from the host.
export async function passedWhole({ check, selects, asked = askHost }) {
  let parents;
  try { parents = git(["rev-list", "--parents", "-n", "1", "HEAD"]).trim().split(" "); } catch { parents = []; }
  if (parents.length !== 3) return { all: true, why: "HEAD merges no two commits (a squash, a rebase, or no merge), so what ran on a pull request's head cannot be told" };
  const [, , head] = parents, tree = c => { try { return git(["rev-parse", "--verify", "--quiet", `${c}^{tree}`]).trim(); } catch { return null; } };
  const at = tree("HEAD");
  if (!at || at !== tree(head)) return { all: true, why: `the merged head ${head.slice(0, 12)} held another tree: it was not up to date with the branch it merged into` };
  const s = selects();
  if (!s.all) return { all: true, why: `the pull request's run selected ${s.tests.length} tests, not the whole suite` };
  const passed = await asked(head, check);
  if (passed !== true) return { all: true, why: `the check ${check} did not pass on the merged head ${head.slice(0, 12)}${typeof passed === "string" ? ` (${passed})` : ""}` };
  return { none: true, why: `the merged head ${head.slice(0, 12)} held this tree, ran the whole suite and passed ${check} on it: a tree that passed is not run again` };
}

// The newest of a check's runs on one head, which decides, as it does for a ruleset: a draft's gate fails by design and
// the run started when the pull request was marked ready, on the same head, is the newer (#733). A run with no start
// time reads as the oldest; of two that started together, the higher id.
const startOf = run => (typeof run?.started_at === "string" ? Date.parse(run.started_at) || 0 : 0);
const newestOf = runs => runs.reduce((a, b) => (startOf(b) > startOf(a) || (startOf(b) === startOf(a) && Number(b?.id ?? 0) > Number(a?.id ?? 0)) ? b : a));

// Whether the check `check` passed on the commit `sha`, as the host says: true; else what kept it from saying so.
async function askHost(sha, check) {
  const api = process.env.GITHUB_API_URL || "https://api.github.com", repo = process.env.GITHUB_REPOSITORY || "", token = process.env.GH_TOKEN || "";
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repo) || !token) return "no repository or token to ask the host with (GITHUB_REPOSITORY, GH_TOKEN)";
  try {
    const r = await fetch(`${api}/repos/${repo}/commits/${sha}/check-runs?check_name=${encodeURIComponent(check)}&filter=latest&per_page=100`,
      { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return `the host answered ${r.status}`;
    const runs = (await r.json())?.check_runs;
    if (!Array.isArray(runs) || !runs.length) return "the host knows no such run";
    // (only GitHub Actions' own runs: an app of another's, or a check of that name it posts, says nothing of the suite)
    const ours = runs.filter(run => run?.app?.slug === "github-actions");
    if (!ours.length) return "no run of it by GitHub Actions";
    const newest = newestOf(ours);
    return (newest?.name === check && newest?.status === "completed" && newest?.conclusion === "success") || "its newest run did not pass";
  } catch (e) { return `the host could not be asked: ${String(e?.message ?? e).slice(0, 80)}`; }
}

