// The pieces of the steps that read the host, not the project's files (#1092): each step's `host`, (p, h) => its mend
// or null where it is done, given the project as steps.mjs reads it (`p`) and what GitHub answered for its repository
// (`h`, host.mjs's readHost: each answer { body } or { why }). One that cannot read what it needs throws Unread
// (workflow-calls.mjs), and the step is said not read, never done or missing. They read only: what the host is written
// with, the look's own job writes (look.mjs, through host.mjs).
import { Unread, calls, given } from "./workflow-calls.mjs";
import { callsPosting } from "./review-caller.mjs";
import { CONTEXT, reviewersOf, writersOf } from "./security-review.mjs";
import { toMake } from "./labels.mjs";
import { lastRun } from "./look-keep.mjs";
import { MISSED } from "./look-kinds.mjs";
import { FOLDER as INBOX } from "./inbox.mjs";

// An answer of GitHub's, or Unread with why it gave none.
const bodyOf = (answer, what) => {
  if (answer && "body" in answer) return answer.body;
  throw new Unread(`GitHub gave no answer for ${what}${answer?.why ? ` (${answer.why})` : ""}`);
};
const where = h => (h.name ? `https://github.com/${h.name}/` : "");

// The status checks the rules of the default branch require (every ruleset's that applies to it).
const required = h => new Set(bodyOf(h.rules, "the rules of the default branch").filter(r => r?.type === "required_status_checks")
  .flatMap(r => (Array.isArray(r.parameters?.required_status_checks) ? r.parameters.required_status_checks : [])).map(c => c?.context));

// Step 220: a private repository whose rules require the status `security-review` has a call that posts it on every
// pull request (review-caller.mjs), or requires none.
export function privateReview(p, h) {
  const repo = bodyOf(h.repo, "the repository");
  if (repo.private !== true || !required(h).has(CONTEXT)) return null;
  const text = p.read(".github/workflows/security-review.yml");
  if (text === null) return null;
  const posts = callsPosting(text, false, f => p.read(f) !== null);
  if (posts === null) throw new Unread("the project's `.github/workflows/security-review.yml` is not in a form whose call is read here");
  return posts ? null : `The repository is private and its rules require the status \`${CONTEXT}\`, which its call to the core's \`security-review.yml\` does not post on every pull request, so a pull request waits on it for good: give that call \`with: private: true\` (or \`advisory: false\`), in \`.github/workflows/security-review.yml\`, a workflow's change with its two security reviews.`;
}

// Step 310: the owner's inbox is the repository's issues where they can be read and written (inbox.mjs's answer,
// `h.reach`), else the folder inbox/.
export function inbox(p, h) {
  if (!h.reach) throw new Unread("GitHub gave no answer on whether issues can be read and written here");
  if (h.reach.yes || p.files.some(f => f.startsWith(`${INBOX}/`))) return null;
  return `Issues cannot be read and written here (${h.reach.why}), and the project holds no folder \`${INBOX}/\`: run \`node core/scripts/inbox.mjs\` from the project's root and make the folder as it says, in a pull request of its own; turning issues on is the owner's setting, named once.`;
}

// Step 320 and 510: the labels of the core's list stand on the repository (labels.mjs; the look's job makes them).
export function labels(p, h) {
  const todo = toMake(bodyOf(h.labels, "the repository's labels"));
  return todo.length ? `The labels ${todo.map(l => `\`${l.name}\``).join(", ")} of the core's list are missing or set otherwise: the daily look's job makes them by itself on its next run (\`core/scripts/look.mjs\`); where it cannot, it says why in its issue "Settings only the owner gives". The rest of what \`core/scripts/labels.mjs\` reports stands in the look's issue "Labels and openers to mend".` : null;
}
export function correction(p, h) {
  const have = bodyOf(h.labels, "the repository's labels");
  return Array.isArray(have) && have.some(l => String(l?.name).toLowerCase() === "correction") ? null
    : "The label `correction` is missing: the daily look's job makes it with the rest of the core's list on its next run (`core/scripts/look.mjs`); where it cannot, it says why in its issue \"Settings only the owner gives\".";
}

// The look's record (look-keep.mjs): the body of its issue, or Unread where it was not read.
const recordOf = h => {
  if (!h.record || !("body" in h.record)) throw new Unread(`the scheduled look's record was not read${h.record?.why ? ` (${h.record.why})` : ""}`);
  return h.record.body ?? "";
};

// Step 330: no workflow of the project's calls the core's `core-moved.yml`, and the look ran within MISSED hours of
// `h.at` (its record), or is running now (`h.looking`).
export function daily(p, h) {
  if (calls(p, "core-moved.yml").length) return "A workflow of the project's still calls the core's `core-moved.yml`: replace it with `.github/workflows/look.yml` as `core/setup/template/workflows/look.yml.tmpl` has it, a workflow's change with its two security reviews.";
  if (h.looking) return null;
  const last = lastRun(recordOf(h));
  if (last && Date.parse(h.at) - Date.parse(last) <= MISSED * 3600000) return null;
  return `The scheduled look's record shows no run in the last ${MISSED} hours${last ? ` (its last: ${last})` : ""}: add \`.github/workflows/look.yml\` as \`core/setup/template/workflows/look.yml.tmpl\` has it, or have the orchestrator run \`node core/scripts/look.mjs\` on each wake.`;
}

// Step 390: secret scanning and its push protection on, where GitHub's answer shows them (to an admin alone).
// Whose step 390 is: a session's in a public repository (floor topic 9), the owner's otherwise.
export const scanningOwner = h => h?.repo?.body?.private !== false;

export function scanning(p, h) {
  const on = bodyOf(h.repo, "the repository").security_and_analysis ?? {};
  const states = ["secret_scanning", "secret_scanning_push_protection"].map(k => on[k]?.status);
  if (states.some(s => s !== "enabled" && s !== "disabled")) throw new Unread("GitHub shows secret scanning to the repository's admins alone, or the repository has none");
  if (states.every(s => s === "enabled")) return null;
  const page = `Settings, Advanced Security${where(h) ? `: ${where(h)}settings/security_analysis` : ""}`;
  // (floor topic 9: in a public repository, where GitHub gives it free, a session may switch it on; in a private one,
  // where it may be billed, the owner alone)
  return bodyOf(h.repo, "the repository").private === false
    ? `Secret scanning or its push protection is off in this public repository, where GitHub gives it free: a session whose sign-in may change the repository's settings switches both on (${page}; \`core/floor/topics/weaknesses.md\`, topic 9), or else files it for the owner, labelled \`needs-owner\`.`
    : `Secret scanning or its push protection is off: the owner switches both on (${page}), in the sitting of \`core/scripts/owner-settings.mjs\`, or declares in the manifest's "Differences" that the owner does not want it.`;
}

// Step 560: no account the call to `security-review.yml` names in `reviewers` is one the host lets write
// (security-review.mjs's writersOf, from `h.rights`, each login's answer).
// The accounts the project's calls to the core's security-review.yml name in `reviewers`, as written (host.mjs reads
// their rights by these).
export const reviewersNamed = p => [...new Set(given(p, "security-review.yml", "reviewers").flatMap(({ value }) => reviewersOf(value)))];
export function reviewers(p, h) {
  const named = reviewersNamed(p);
  const unread = named.filter(n => !(h.rights?.[n.toLowerCase()] && "body" in h.rights[n.toLowerCase()]));
  if (unread.length) throw new Unread(`GitHub gave no answer on the rights of ${unread.length} account${unread.length === 1 ? "" : "s"} the call names`);
  const writers = writersOf(named.map(n => h.rights[n.toLowerCase()].body));
  const now = named.filter(n => writers.has(n.toLowerCase()));
  return now.length ? `The call to the core's \`security-review.yml\` names in \`reviewers\` ${now.map(n => `\`${n}\``).join(", ")}, whom the host lets write and the check now counts by itself: take ${now.length === 1 ? "it" : "them"} out of \`reviewers\`, a workflow's change with its two security reviews.` : null;
}

// Step 600: the look's record shows the packages looked up (look-keep.mjs's line "Packages looked up:"); at the sync,
// the sync looks them up itself (sync.mjs's reports; #1095).
export const LOOKED = /^Packages looked up: (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)/m;
export function lookedUp(p, h) {
  return LOOKED.test(recordOf(h)) ? null : "The scheduled look has not looked up the packages the project holds since this sync: the sync printed what `core/scripts/held.mjs` found, each package it names a task; the look does so again on its next run (`core/scripts/look.mjs`) and keeps the issue \"Packages gone stale\"; where no look runs, run `node core/scripts/held.mjs` once a month and file each package it names as a task.";
}

// Step 820: the look has read the host (look-keep.mjs's line "Host read:").
export const HOST_READ = /^Host read: (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)/m;
export function hostRead(p, h) {
  return h.looking || HOST_READ.test(recordOf(h)) ? null : "The daily look has not read the host since this sync: it does so on its next run (`core/scripts/look.mjs`, from the project's `.github/workflows/look.yml`); start that workflow by hand (Actions) to have it at once.";
}
