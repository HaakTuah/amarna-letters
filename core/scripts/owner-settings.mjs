// The settings only a project's owner can give (#1085; README.md, "Setting up (the owner's part)"), in one checklist:
// each setting of owner-settings.json, beside this file, with its state where GitHub lets it be read, a direct link to
// where it is set and what it protects. The owner takes it in one sitting, a session the owner starts in person, which
// applies each setting the owner approves, reads it back by running this again and says what is left. It is asked at a
// project's first taking of the core (init.mjs, and the first copy sync.mjs writes) and again only where a sync brings
// a setting the list at the old pin did not hold (`--since`, which sync.mjs gives). It reads, and writes nothing, on
// the host or in the project; it reports and fails nothing (AGENTS.md of the core, "Nothing locks a project"). Git, gh
// and Node's own modules.
//
//   node core/scripts/owner-settings.mjs                                   from a project's root: the checklist
//   node core/scripts/owner-settings.mjs --since <SHA> --fetched <dir>     the checklist where a setting is new since
//                                                                          that commit of the core, read from the
//                                                                          bare repository <dir>; else one line
//   ... --report                                                           for a sync's pull request: in a public
//                                                                          repository, the counts alone
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { repoOf } from "./inbox.mjs";
import { READ_MOST } from "./own-files.mjs";
import { callsPosting } from "./review-caller.mjs";
import { inBare, plainEnv } from "./releases.mjs";
import { CONTEXT } from "./security-review.mjs";
import { started } from "./started.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SETTINGS = JSON.parse(fs.readFileSync(path.join(HERE, "owner-settings.json"), "utf8"));
const LIST = "scripts/owner-settings.json";
// The most of an answer of GitHub's read (each of at most five reads, 30 s each; SECURITY.md, rule 5).
const ANSWER_MOST = 16 << 20;

// A name GitHub gives (a branch, a required check), as it is printed: a text alone, never markup or a line of its own
// in the pull request's description a sync writes it into, and at most 100 characters; anything else is no name.
export const shown = name => typeof name === "string" && name ? `\`${name.replace(/[\u0000-\u001f\u007f`]/g, "?").slice(0, 100)}\`` : null;

// gh's answer for a route of GitHub's API: { body } or { why }, never a throw. (No gh, no network, a route the account
// signed in here may not read: each is no answer, said as such.)
export function ghAsk(route) {
  const r = spawnSync("gh", ["api", route], { encoding: "utf8", maxBuffer: ANSWER_MOST, timeout: 30000, env: plainEnv() });
  if (r.status === 0) { try { return { body: JSON.parse(r.stdout) }; } catch { return { why: "GitHub's answer was no JSON" }; } }
  const code = /\bHTTP (\d{3})\b/.exec(`${r.stderr}`)?.[1];
  return { why: code ? `GitHub answered ${code}${code === "403" || code === "404" ? ", which it gives an account that may not read it" : ""}` : "gh gave no answer here" };
}

// Each state: { given: true | false | null, said }; null where it could not be read or does not apply.
const given = said => ({ given: true, said: said ?? "given" });
const notGiven = said => ({ given: false, said: `not given${said ? `: ${said}` : ""}` });
const unread = why => ({ given: null, said: `not read: ${why ?? "GitHub gave no answer"}` });
const apart = why => ({ given: null, said: `does not apply here: ${why}` });

// What the rules of the default branch hold (GitHub's rules for a branch, every ruleset's that applies to it).
function rulesOf(rules) {
  const types = new Set(rules.map(r => r?.type).filter(t => typeof t === "string"));
  const listed = r => Array.isArray(r?.parameters?.required_status_checks) ? r.parameters.required_status_checks : [];
  const checks = new Set(rules.filter(r => r?.type === "required_status_checks").flatMap(listed).map(c => c?.context).filter(c => typeof c === "string"));
  return { types, checks };
}

// Secret scanning or its push protection (`key`), from GitHub's answer for the repository.
function scanOf(host, key) {
  const repo = host.repo.body;
  if (!repo) return unread(host.repo.why);
  const status = repo.security_and_analysis?.[key]?.status;
  if (status === "enabled") return given();
  if (status === "disabled") return notGiven();
  return unread("GitHub's answer holds no such setting: the repository has none, or the account signed in here may not see its security settings");
}

// The ruleset on the default branch, from its rules (`rules`: rulesOf, or null where they were not read).
function rulesetOf(host, rules) {
  if (!rules) return unread(host.rules?.why ?? host.repo.why);
  const lacks = [["deletion", "deletions restricted"], ["non_fast_forward", "force pushes blocked"], ["pull_request", "a pull request required"]]
    .filter(([type]) => !rules.types.has(type)).map(([, said]) => said);
  if (!rules.checks.has("core / core")) lacks.push("the status check `core / core` required");
  if (!lacks.length) {
    // (whether the checks required hold all of the project's own CI cannot be read exactly, so it is never ticked on a
    // guess: the core's part is said given, and the checks required beside it named for the owner to compare)
    const own = [...rules.checks].filter(c => c && c !== "core / core" && c !== CONTEXT).map(shown).filter(Boolean);
    return unread(`the core's part is given, and whether the project's own CI is required is not read: ${own.length ? `the checks required beside the core's are ${own.slice(0, 20).join(", ")}${own.length > 20 ? ` and ${own.length - 20} more` : ""}; compare them with the project's own jobs` : "no check is required beside the core's; where the project has CI of its own, require its checks"}`);
  }
  const none = rules.types.size ? "" : `no ruleset applies to ${shown(host.repo.body?.default_branch) ?? "the default branch"} (a branch protection of the older kind is not read here); `;
  return notGiven(`${none}it lacks ${lacks.join(", ")}`);
}

// The project's files on its default branch (`branch`) as this clone last fetched it, since the core's security review
// runs that branch's copy of the core, whatever a pull request holds (its workflow checks the default branch out): a
// regular file's text by its path from the project's root, null where the branch holds none there (a link, a folder, a
// submodule's commit or a file past READ_MOST among them); and null in place of the reader where that branch was never
// fetched here (that ref exactly, never a name git would guess at), its name holds a control sign, or `root` holds no
// repository of its own.
function onBranch(root, branch) {
  const ref = `refs/remotes/origin/${branch}`, env = { ...plainEnv(), GIT_LITERAL_PATHSPECS: "1" };
  const git = (...a) => spawnSync("git", ["--no-replace-objects", ...a], { cwd: root, encoding: "utf8", maxBuffer: READ_MOST + 1024, env });
  if (typeof branch !== "string" || /[\u0000-\u001f\u007f]/.test(branch) || !fs.existsSync(path.join(root, ".git")) || git("check-ref-format", ref).status !== 0) return null;
  const sha = git("show-ref", "--verify", "-s", ref).stdout?.trim();
  if (!/^[0-9a-f]{40,64}$/.test(sha ?? "") || git("cat-file", "-e", `${sha}^{commit}`).status !== 0) return null;
  return f => {
    const r = git("ls-tree", "-z", "-l", "--full-tree", sha, "--", f), m = /^(?:100644|100755) blob ([0-9a-f]+) +(\d+)\t([^\0]*)\0$/.exec(r.stdout ?? "");
    if (r.status !== 0 || !m || m[3] !== f || Number(m[2]) > READ_MOST) return null;
    const b = git("cat-file", "blob", m[1]);
    return b.status === 0 ? b.stdout : null;
  };
}

// The status `security-review` required, where the project's own workflow at `root` posts it on every pull request.
function reviewOf(host, rules, root) {
  const repo = host.repo.body;
  if (!repo) return unread(host.repo.why);
  const read = onBranch(root, repo.default_branch), branch = shown(repo.default_branch) ?? "the default branch";
  if (!read) return unread(`${branch} is not fetched here, and the check runs that branch's copy of the core: fetch it (git fetch origin) and run this again`);
  const text = read(".github/workflows/security-review.yml");
  if (text === null) return apart(`the project has no \`.github/workflows/security-review.yml\` on ${branch} as last fetched, so nothing posts the status, and a status required that never comes would hold every pull request`);
  const posts = callsPosting(text, repo.private === false, f => read(f) !== null);
  if (posts === null) return unread(`the project's \`.github/workflows/security-review.yml\` on ${branch} could not be read as YAML, calls no security review of the core's repository, gives it a \`root\` that does not hold the core there, starts on some pull requests alone, runs its call on a condition other than the kit's, is not in the kit's form (each job a call of the core's two workflows granted what it asks and given only the inputs it defines, needing only those jobs and none itself, no other key, \`concurrency\` among them), or gives \`private\` or \`advisory\` a value read only at its run, so whether its call posts the status on every pull request is not known`);
  if (!posts) return apart("in a private repository the check posts its status only where its call is given `with: private: true` or `advisory: false`, and a status required that never comes would hold every pull request");
  if (!rules) return unread(host.rules?.why ?? host.repo.why);
  return rules.checks.has(CONTEXT) ? given() : notGiven();
}

// The secret PERSONAL_TERMS, by its name alone: from the list of the repository's secrets, and where the list runs past
// the page read, from GitHub's answer for the secret by name (`host.terms`), which 404 is "not there" once the list
// itself was readable.
function termsOf(host) {
  const list = host.secrets?.body, names = list?.secrets;
  if (!Array.isArray(names)) return unread(host.secrets?.why ?? host.repo.why);
  if (names.some(s => s?.name === "PERSONAL_TERMS")) return given("given (its value is not read)");
  if (!(Number.isInteger(list.total_count) && list.total_count > names.length)) return notGiven();
  if (host.terms?.body?.name === "PERSONAL_TERMS") return given("given (its value is not read)");
  if (/answered 404/.test(host.terms?.why ?? "")) return notGiven();
  return unread(host.terms?.why ?? "the list of secrets runs past the page read, and the secret was not asked by name");
}

// The state of each setting, by its id, read from what GitHub answered (`host`: { repo, rules, secrets, actions, terms? },
// each { body } or { why }) and the project's own files at `root`.
export function statesOf(host, root) {
  const rules = Array.isArray(host.rules?.body) ? rulesOf(host.rules.body) : null;
  const pinned = host.actions?.body?.sha_pinning_required;
  return {
    "secret-scanning": scanOf(host, "secret_scanning"),
    "push-protection": scanOf(host, "secret_scanning_push_protection"),
    ruleset: rulesetOf(host, rules),
    "security-review-required": reviewOf(host, rules, root),
    "sha-pinning": pinned === true ? given() : pinned === false ? notGiven() : unread(host.actions?.why ?? "GitHub's answer holds no such setting"),
    "personal-terms": termsOf(host),
    "reviewer-app": unread("GitHub lists a repository's apps on that page to its admins alone, and to no sign-in a session holds"),
  };
}

// What GitHub answers for the repository, asked by `ask` (ghAsk, or a stand-in): four reads, and a fifth for the secret
// by name where the list of secrets runs past its page.
export function readHost(repo, ask = ghAsk) {
  const host = { repo: ask(`repos/${repo}`) };
  const branch = typeof host.repo.body?.default_branch === "string" ? host.repo.body.default_branch : null;
  host.rules = branch ? ask(`repos/${repo}/rules/branches/${encodeURIComponent(branch)}`) : { why: host.repo.why ?? "GitHub named no default branch" };
  host.secrets = ask(`repos/${repo}/actions/secrets?per_page=100`);
  const list = host.secrets.body;
  if (Array.isArray(list?.secrets) && Number.isInteger(list.total_count) && list.total_count > list.secrets.length && !list.secrets.some(s => s?.name === "PERSONAL_TERMS")) host.terms = ask(`repos/${repo}/actions/secrets/PERSONAL_TERMS`);
  host.actions = ask(`repos/${repo}/actions/permissions`);
  return host;
}

// The checklist, for `repo` ("owner/name", or null where the origin is on no github.com), the settings `fresh` names
// marked new; `script` is how a session runs this file from the project's root.
export function checklist({ repo, states, fresh = null, script }) {
  const counts = [true, false, null].map(v => SETTINGS.filter(s => states[s.id]?.given === v).length);
  const head = [
    `The settings only the owner gives${repo ? `, for ${repo}` : ""} (\`${script}\`; the core's README, "Setting up (the owner's part)"): ${counts[0]} given, ${counts[1]} not, ${counts[2]} not read or not for this repository. Nothing waits on them (the core's AGENTS.md, "Nothing locks a project").`,
    `Taken in one sitting: the owner starts a session in person, which applies each setting the owner approves, as the owner's own word allows what an agent tool's automatic mode refuses, never one without it, and none that may be billed, which the owner switches on alone (floor rule 14); it reads each back by running \`${script}\` again and says what is left.${repo ? "" : " The origin is on no github.com, so nothing was read and no link made: on another host its own protection of the default branch stands in for the ruleset (the core's tasks/hosts.md)."}`,
  ];
  const rows = SETTINGS.map(s => `- [${states[s.id]?.given === true ? "x" : " "}] ${s.setting}${fresh?.includes(s.id) ? " (new since the copy before)" : ""}: ${states[s.id]?.said ?? "not read"}. Protects: ${s.protects}.${repo ? ` Set at: https://github.com/${repo}/${s.page}` : ""}`);
  return [...head, ...rows].join("\n");
}

// The checklist as a sync's pull request carries it (`--report`): whole only where GitHub answered the repository is
// private; else, public or not answered, its first line, the counts, and where the rest is read, since GitHub shows a
// repository's security settings to its admins alone.
export const forReport = (list, host, script) => host.repo?.body?.private === true ? list
  : `${list.split("\n")[0]}\nThe repository is public, or GitHub did not answer that it is private, so its settings' states stand in no pull request, since GitHub shows them to its admins alone: the owner's session runs \`${script}\` for the checklist and takes it in one sitting.`;

// The ids of the list at `sha` of the core, read from the bare repository `bare`; [] where that commit has none.
export function idsAt(sha, bare) {
  try { return JSON.parse(inBare(bare, ["show", `${sha}:${LIST}`])).map(s => s.id); } catch { return []; }
}

function main(argv) {
  const root = process.cwd(), script = path.relative(root, fileURLToPath(import.meta.url)).split(path.sep).join("/");
  const since = argv.indexOf("--since"), fetched = argv.indexOf("--fetched");
  let fresh = null;
  if (since >= 0) {
    if (!/^[0-9a-f]{40}$/.test(argv[since + 1] ?? "") || fetched < 0 || !argv[fetched + 1]) { console.error("FAIL: give --since a full SHA of the core and --fetched the bare repository that holds it. Mend: run it as sync.mjs does, or with no argument for the checklist"); return 1; }
    const old = idsAt(argv[since + 1], path.resolve(argv[fetched + 1]));
    fresh = SETTINGS.map(s => s.id).filter(id => !old.includes(id));
    if (!fresh.length) { console.log(`No setting only the owner gives is new since ${argv[since + 1].slice(0, 7)}: the sitting is not asked again (\`${script}\` prints the checklist).`); return 0; }
  }
  const origin = spawnSync("git", ["config", "--get", "remote.origin.url"], { cwd: root, encoding: "utf8", env: plainEnv() });
  const repo = repoOf(origin.stdout);
  const host = repo ? readHost(repo) : { repo: { why: "the origin is on no github.com" }, rules: null, secrets: null, actions: null };
  const list = checklist({ repo, states: statesOf(host, root), fresh, script });
  console.log(argv.includes("--report") ? forReport(list, host, script) : list);
  return 0;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
