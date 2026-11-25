// The part of the core that reads and writes the host for the steps (#1092; AGENTS.md, "The host is read and written by
// the look"): what GitHub answers for a project's repository, read once, so that the steps whose state is GitHub's, not
// a file's, are told done by a check (each step's `host`, step-checks-host.mjs beside this file), and the settings only
// the owner gives (owner-settings.mjs) are read where the token lets them be. It writes on the host only from the daily
// look's own job, with that job's token and the rights its workflow names (look.mjs): the labels of the core's list
// (labels.mjs), the steps' issue and the issue "Settings only the owner gives", which lists each such setting not given,
// with its link, and each write GitHub refused, so that no session's own sign-in edits the host for a step. Run by
// itself, from a project's root, as each sync runs it, it reads and writes nothing, and prints the steps read on the
// host that are not done; it fails nothing (AGENTS.md, "Nothing locks a project"). gh, git and Node's own modules.
//
//   node core/scripts/host.mjs     from a project's root: the steps read on the host that are not done, and those not read
import { spawnSync } from "node:child_process";
import { asked, repoOf } from "./inbox.mjs";
import { RECORD, mine } from "./look-keep.mjs";
import { SETTINGS, ghAsk, readHost as ownerRead, shown, statesOf } from "./owner-settings.mjs";
import { ownerOf } from "./releases.mjs";
import { started } from "./started.mjs";
import { STEPS, notDone, project } from "./steps.mjs";
import { NOTES } from "./sync-notes.mjs";
import { reviewersNamed } from "./step-checks-host.mjs";

// Rows of a list GitHub gives page by page, through `ask` (ghAsk's form): { body } where every page answered, at most
// `most` pages, else { why }.
function listOf(route, ask, most = 10) {
  const rows = [];
  for (let page = 1; page <= most; page++) {
    const got = ask(`${route}${route.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    if (!Array.isArray(got.body)) return { why: got.why ?? "GitHub gave no list" };
    rows.push(...got.body);
    if (got.body.length < 100) return { body: rows };
  }
  return { why: `the list runs past ${most * 100} rows` };
}

// The accounts the project's calls to the core's security-review.yml name in `reviewers`, in lower case; none where
// they cannot be read (the step that needs them then says so).
const named = p => { try { return [...new Set(reviewersNamed(p).map(n => n.toLowerCase()))]; } catch { return []; } };

// What GitHub answers for `repo` ("owner/name"), for the project `p` (steps.mjs's project), asked by `ask` (ghAsk, or a
// stand-in): owner-settings.mjs's reads, and the repository's labels, whether issues can be read and written (`reach`,
// inbox.mjs's answer, given by a caller that has it; `post`, its empty write, sends none unless a caller gives one), the look's record (given, or read from its
// issues), the rights of each account `reviewers` names, the time (`at`), whether the look itself is reading it
// (`looking`), and whether the secret PERSONAL_TERMS is given, as the look's workflow says it (`env.TERMS_GIVEN`, never
// its value).
export function readHost(p, repo, { ask = ghAsk, post = () => ({ status: null, err: "" }), reach, record, at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), looking = false, env = process.env } = {}) {
  const h = { ...ownerRead(repo, ask), name: repo, at, looking };
  h.labels = listOf(`repos/${repo}/labels`, ask);
  h.reach = reach !== undefined ? reach : h.repo.body ? asked(repo, h.repo.body, post) : null;
  if (record) h.record = record;
  else {
    const kept = listOf(`repos/${repo}/issues?state=all&labels=by%3Alook`, ask);
    h.record = kept.body ? { body: mine(kept.body, ownerOf(p.manifest ?? "") ?? repo.split("/")[0]).get(RECORD)?.body ?? "" } : { why: kept.why };
  }
  h.rights = Object.fromEntries(named(p).map(n => [n, ask(`repos/${repo}/collaborators/${encodeURIComponent(n)}/permission`)]));
  h.termsGiven = env.TERMS_GIVEN === "true" ? true : env.TERMS_GIVEN === "false" ? false : null;
  return h;
}

// The steps read on the host, of the project at `root`, given what GitHub answered (`h`): notDone's answer.
export const hostSteps = (root, h, steps = STEPS) => notDone(root, steps.filter(s => s.host), h);

// What a run prints: the steps read on the host not done, each with its mend, and those GitHub gave no answer for, each
// with why, and how many, never "every step is done" where any was not read.
export function hostReport(missed) {
  const copy = missed.copy ?? "core/";
  const left = missed.hostUnread?.length ? `\n\nNot read on the host here, each left to the daily look's job, which reads it with its own token (\`${copy}scripts/look.mjs\`): ${missed.hostUnread.map(u => `${u.lead} (${u.why})`).join("; ")}.` : "";
  // (a step not read here is never told done: #1275, point 1)
  const unread = missed.hostUnread?.length ?? 0;
  if (!missed.length) return `${unread ? `No step read on the host here is left undone, but ${unread} of them ${unread === 1 ? "was" : "were"} not read here, so none of ${unread === 1 ? "it is" : "those is"} told done` : "Every step read on the host is done"} (\`${copy}scripts/host.mjs\`).${left}`;
  return [`Steps read on the host not done (\`${copy}scripts/host.mjs\`; ${copy}${NOTES}): each a task the project's agents take, in a pull request of its own${missed.some(m => m.owner) ? "; one marked \"the owner's\" waits on the owner and is labelled so" : ""}.`,
    ...missed.map(m => `- ${m.lead}${m.owner ? " (the owner's)" : ""}: ${m.mend}`)].join("\n") + left;
}

// The state of each setting only the owner gives (owner-settings.mjs's statesOf), with two readings of the look's: the
// secret PERSONAL_TERMS as the look's workflow says it (`h.termsGiven`), and, in a private repository whose default
// branch no rule applies to, the ruleset and the status it would require as the owner's choice, since a private
// repository on GitHub's free plan has no rulesets and no check of the core's warns of them there (README.md, "Setting up
// (the owner's part)").
export function settingsOf(h, root) {
  const states = statesOf(h, root);
  if (h.termsGiven === true) states["personal-terms"] = { given: true, said: "given (its value is not read)" };
  if (h.termsGiven === false) states["personal-terms"] = { given: false, said: "not given" };
  if (h.repo.body?.private === true && Array.isArray(h.rules?.body) && !h.rules.body.length) {
    for (const id of ["ruleset", "security-review-required"]) states[id] = { given: null, said: "does not apply here: no rule applies to the default branch of this private repository, which on GitHub's free plan has no rulesets, the owner's choice" };
  }
  return states;
}

// The body of the look's issue "Settings only the owner gives" (look-kinds.mjs), for `repo`: each setting not given,
// with its link, the settings not read with the token named, and each write GitHub refused the look (`refused`: lines);
// null, which closes it, where no setting is read as not given and no write was refused.
export function settingsTask(repo, states, refused = []) {
  const off = SETTINGS.filter(s => states[s.id]?.given === false), unread = SETTINGS.filter(s => states[s.id]?.given === null && !/^does not apply/.test(states[s.id].said));
  if (!off.length && !refused.length) return null;
  return [
    `What only the owner can give here, as the daily look read it with its job's token (\`core/scripts/host.mjs\`; the core's README, "Setting up (the owner's part)"). Each is the owner's, taken in one sitting: a session the owner starts in person runs \`node core/scripts/owner-settings.mjs\`, applies each setting the owner approves and reads it back. Nothing waits on them (the core's AGENTS.md, "Nothing locks a project"), and no agent is asked to give them.`,
    ...off.map(s => `- ${s.setting}: ${states[s.id].said}. Protects: ${s.protects}. Set at: https://github.com/${repo}/${s.page}`),
    ...refused.map(r => `- ${r}`),
    ...(unread.length ? ["", `Not read with the job's token, which GitHub shows these to its admins alone: ${unread.map(s => shown(s.id)).join(", ")}; the sitting reads them.`] : []),
  ].join("\n");
}

// A write GitHub refused, said without gh's own words (they may name a path of the machine): its status alone.
export const refusal = (what, e, right) => {
  const code = /\bHTTP (\d{3})\b/.exec(String(e?.message ?? ""))?.[1];
  return `${what} could not be written: GitHub ${code ? `answered ${code}` : "gave no answer"}${code === "403" || code === "404" ? `, which it gives a token without the right (the look's job needs \`${right}\` in its workflow's \`permissions:\`, a workflow's change with its two security reviews)` : ""}.`;
};

function main() {
  const below = spawnSync("git", ["rev-parse", "--show-prefix"], { encoding: "utf8" });
  if (below.status !== 0 || below.stdout.trim() !== "") { console.error("FAIL: run it from the root of the project's git repository. Mend: cd to the project's root and run node core/scripts/host.mjs again"); return 1; }
  const repo = repoOf(spawnSync("git", ["config", "--get", "remote.origin.url"], { encoding: "utf8" }).stdout);
  if (!repo) { console.log("The host was not read: the origin is on no github.com, so the steps read on it are left to the project's own host (core/tasks/hosts.md)."); return 0; }
  const root = process.cwd();
  // (a sync's run reads only: no empty write is sent to learn whether issues can be written, readHost's default)
  console.log(hostReport(hostSteps(root, readHost(project(root), repo))));
  return 0;
}

if (started(import.meta.url)) process.exitCode = main();
