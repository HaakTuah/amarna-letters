// The recorder of the host's own record of the security review (#626; #593, point 9): for the core's own merged pull
// requests that had a Codex security review in the host's list of reviews, it records what the host says of them, for
// the comparisons of scripts/security-review-host.mjs. Run by hand, or by the session that takes the core's monthly state report, in a clone of the core where gh
// answers for the owner's account; it writes one file per pull request under reports/security-review-host/ and the
// rights in rights.json there, then prints the comparison, which tests/security-review-host-test.mjs runs offline.
//
// What it records of each pull request: the five inputs security-review.yml fetches (the pull request, its comments,
// its review comments, its commits and its files), the host's list of its reviews (pulls/N/reviews), its review
// threads (GraphQL's reviewThreads, or the cloud session's pulls/N/ccr/review_threads where GraphQL is refused) and the
// rights the workflow would read for its commenters (collaborators/<login>/permission). Of the repository: the host's
// push list (collaborators?affiliation=all&permission=push) and the rights answer of each login on it. These are the
// core's own public pull requests, the owner's (#593, point 9): no other repository is read.
//
// It keeps only the fields the comparison reads (floor rule 11): of the comments, Codex's summary and findings and the
// lines of a writer's posted "Security review:" that the status reads; of the reviews, Codex's, each body cut after its heading;
// of the files, a patch only where the status reads it as one that only moves pins; of the commits, who wrote and
// signed them only on Dependabot's own pull request, the one place the status reads them. Any login but the owner's account, an app's and GitHub's own (web-flow) is given a stand-in,
// the same within a pull request, a fork's owner in a repository's name too, and why a call failed keeps no login. It refuses to write a pull request whose judge() on what it keeps differs from
// judge() on what the host gave, so the cut drops nothing the status reads. A rights answer the host refuses (a cloud
// session's proxy refuses the collaborators routes) is recorded as not read, with why, and a recording of them that
// stands is kept.
//
//   node scripts/security-review-record.mjs [--count N] [--pr N]...     (N: 8 where none is given)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CORE, OWNER } from "./core-address.mjs";
import { DEPENDABOT, FINDING, OPENS, POSTED, WRITERS, codexState, codexs, flat, pinsAlone } from "./security-review.mjs";
import { FOLDER, SECURITY, compare, lower, recordings, time, verdictOf } from "./security-review-host.mjs";
import { started } from "./started.mjs";

// the host, through gh: a call is gh api's arguments, its answer the JSON gh prints (the test hands in its own)
export const gh = (args) => JSON.parse(execFileSync("gh", ["api", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }));
const pages = (call, route) => flat(call(["--paginate", "--slurp", `${route}${route.includes("?") ? "&" : "?"}per_page=100`]));
// why a call failed, in the host's or gh's own words, one line
export const why = (e) => String(e?.stderr || e?.message).trim().split("\n").at(-1).slice(0, 300);
// why, as a recording keeps it: a login a route names (collaborators/<login>) left out (floor rule 11)
export const unreadOf = (e) => why(e).replace(/(collaborators\/)[^/\s"'?]+/gu, "$1<login>");

// a stand-in for each login but the owner's account, an app's and GitHub's own, the same within one recording
export function standIns() {
  const given = new Map();
  return (login) => {
    if (typeof login !== "string" || lower(login) === lower(OWNER) || login.endsWith("[bot]") || login === "web-flow") return login;
    if (!given.has(lower(login))) given.set(lower(login), `someone-${given.size + 1}`);
    return given.get(lower(login));
  };
}
// (an account the host cannot name, a commit's author whose address matches none, is null)
const userOf = (user, as) => (user ? { login: as(user.login), type: user.type } : user);
const firstLines = (body, upTo) => body.split("\n").slice(0, upTo).join("\n");

// what is kept of each input: the fields judge() and the comparisons read
export function keep(raw, as) {
  return { pull: pullKept(raw.pull, as), comments: flat(raw.comments).filter(kept).map((c) => commentKept(c, as, bodyKept(c.body))),
    findings: flat(raw.findings).filter((c) => codexs(c) && FINDING.test(c.body)).map((c) => commentKept(c, as, firstLines(c.body, 1))),
    commits: flat(raw.commits).map((c) => commitKept(c, as, raw.pull.user?.login === DEPENDABOT)), files: flat(raw.files).map(fileKept), reviews: flat(raw.reviews).filter(codexs).map((r) => reviewKept(r, as)),
    threads: raw.threads, rights: flat(raw.rights).map((answer) => rightOf(answer, as)), ...(raw.unread ? { unread: raw.unread } : {}) };
}
const pullKept = (p, as) => ({ number: p.number, state: p.state, draft: p.draft, merged_at: p.merged_at, created_at: p.created_at, commits: p.commits, changed_files: p.changed_files,
  user: userOf(p.user, as), head: { sha: p.head.sha, repo: { full_name: repoOf(p.head.repo?.full_name, as) } }, base: { repo: { full_name: repoOf(p.base.repo.full_name, as), owner: userOf(p.base.repo.owner, as) } } });
// a repository's name, its owner a stand-in as any login is (a fork's owner is a stranger)
const repoOf = (name, as) => (typeof name === "string" && name.includes("/") ? `${as(name.slice(0, name.indexOf("/")))}${name.slice(name.indexOf("/"))}` : name);
// of the comments, Codex's summary and security findings, and the posted "Security review:" of a writer, as the host
// calls one (the status reads no other's, and an outsider's text is kept out)
const kept = (c) => (codexs(c) && (OPENS.test(c.body) || FINDING.test(c.body))) || (typeof c.body === "string" && POSTED.test(c.body) && WRITERS.includes(c.author_association));
const commentKept = (c, as, body) => ({ id: c.id, user: userOf(c.user, as), author_association: c.author_association, created_at: c.created_at, updated_at: c.updated_at, body });
// what the status reads of a comment's body: Codex's summary whole, and of any other its first line (a finding's
// marker, a posted review's opening) and each line that names a commit or says what comment-only.mjs printed
const READ_LINES = /[0-9a-f]{40}|^\s*(?:comments and steps' names alone in \.github\/|nothing changed in \.github\/)/iu;
const bodyKept = (body) => (OPENS.test(body) ? body : body.split("\n").filter((line, i) => i === 0 || READ_LINES.test(line)).join("\n"));
const commitKept = (c, as, signed) => ({ sha: c.sha, parents: flat(c.parents).map((parent) => ({ sha: parent.sha })),
  ...(signed ? { author: userOf(c.author, as), committer: userOf(c.committer, as), commit: { verification: { verified: c.commit.verification?.verified } } } : {}) });
// of the files, a patch only where the status reads it as one that only moves pins (any other it reads as none)
const fileKept = (f) => ({ filename: f.filename, previous_filename: f.previous_filename, status: f.status, ...(pinsAlone(f) ? { patch: f.patch } : {}) });
// of Codex's reviews, the body up to its heading, which says its kind
const reviewKept = (r, as) => ({ id: r.id, user: userOf(r.user, as), commit_id: r.commit_id, submitted_at: r.submitted_at, body: firstLines(r.body, String(r.body).split("\n").findIndex((line) => line.startsWith("###")) + 1) });
const rightOf = (answer, as) => ({ permission: answer.permission, role_name: answer.role_name, user: { ...userOf(answer.user, as), ...(answer.user?.permissions ? { permissions: { push: answer.user.permissions.push } } : {}) } });

// the review threads, each { resolved, first: the id of its first comment }: GraphQL where the host answers it, else
// the cloud session's route
function threadsOf(call, n) {
  const [owner, name] = CORE.split("/");
  const query = "query($owner:String!,$name:String!,$number:Int!,$endCursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100,after:$endCursor){pageInfo{hasNextPage endCursor} nodes{isResolved comments(first:1){nodes{databaseId}}}}}}}";
  try {
    const got = call(["graphql", "--paginate", "--slurp", "-f", `query=${query}`, "-f", `owner=${owner}`, "-f", `name=${name}`, "-F", `number=${n}`]);
    return flat(got).flatMap((page) => page.data.repository.pullRequest.reviewThreads.nodes).map((t) => ({ resolved: t.isResolved, first: t.comments.nodes[0]?.databaseId }));
  } catch {
    return flat(call([`repos/${CORE}/pulls/${n}/ccr/review_threads`])).map((t) => ({ resolved: t.resolved, first: Array.isArray(t.comment_ids) ? t.comment_ids[0] : undefined }));
  }
}
// the logins whose rights the workflow reads: each that posted a "Security review:", "Code review:" or "Design
// check:" with a say in the repository, a person's account, but the owner (security-review.yml)
const commenters = (comments) => [...new Set(flat(comments).filter((c) => /^(\*\*)?(Security review|Code review|Design check):/u.test(c.body)
  && WRITERS.includes(c.author_association) && c.user?.type === "User" && lower(c.user.login) !== lower(OWNER)).map((c) => c.user.login))];

function rightsOf(call, logins) {
  const rights = [];
  for (const login of logins) {
    try { rights.push(call([`repos/${CORE}/collaborators/${login}/permission`])); } catch (e) { return { rights, unread: `the rights of a commenter: ${unreadOf(e)}` }; }
  }
  return { rights };
}
// what the host gives of one merged pull request
export function fetchPull(call, n) {
  const at = `repos/${CORE}`;
  const raw = { pull: call([`${at}/pulls/${n}`]), comments: pages(call, `${at}/issues/${n}/comments`), findings: pages(call, `${at}/pulls/${n}/comments`),
    commits: pages(call, `${at}/pulls/${n}/commits`), files: pages(call, `${at}/pulls/${n}/files`), reviews: pages(call, `${at}/pulls/${n}/reviews`) };
  raw.threads = threadsOf(call, n);
  return { ...raw, ...rightsOf(call, commenters(raw.comments)) };
}
// the record of one pull request, or a failure where Codex's summary changed after the merge (what the status read
// then cannot be known) or where what it keeps would change the status's verdict
export function recordOf(raw, cut = keep) {
  const at = codexState(raw.comments).at;
  if (!(time(at) <= time(raw.pull.merged_at))) throw new Error(`FAIL: #${raw.pull.number}: Codex's summary ${at ? `last changed at ${at}, after the merge at ${raw.pull.merged_at}` : "is not there or cannot be read"}, so what the status read at the merge cannot be known. Mend: record another pull request (--pr N)`);
  const record = cut(raw, standIns());
  const before = JSON.stringify(verdictOf(raw, raw.rights)), after = JSON.stringify(verdictOf(record));
  if (before !== after) throw new Error(`FAIL: #${raw.pull.number}: the security-review status reads what the recorder leaves out (${before} against ${after}). Mend: keep the field it reads in keep() of scripts/security-review-record.mjs, and record it again`);
  return record;
}

// the newest merged pull requests with a Codex security review in the host's list of reviews, at most count
export function chosen(call, count) {
  const picked = [];
  for (let page = 1; page <= 5 && picked.length < count; page++) {
    const listed = call([`repos/${CORE}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`]);
    for (const p of listed.filter((each) => each.merged_at && !picked.includes(each.number)).sort((a, b) => time(b.merged_at) - time(a.merged_at))) {
      if (picked.length < count && pages(call, `repos/${CORE}/pulls/${p.number}/reviews`).some((review) => codexs(review) && SECURITY.test(review.body))) picked.push(p.number);
    }
    if (listed.length < 100) break;
  }
  return picked;
}
// the push list and each login's rights answer, or why they could not be read
function fetchRights(call) {
  try {
    const pushList = pages(call, `repos/${CORE}/collaborators?affiliation=all&permission=push`).map((entry) => ({ login: entry.login, type: entry.type, role_name: entry.role_name }));
    const answers = pushList.map((entry) => call([`repos/${CORE}/collaborators/${entry.login}/permission`]));
    return { pushList, answers };
  } catch (e) { return { unread: unreadOf(e) }; }
}
// the rights, written to rights.json in the folder: a recording that stands is kept where the host refuses them now
export function writeRights(call, folder, say) {
  const file = path.join(folder, "rights.json");
  const got = fetchRights(call);
  const stands = fs.existsSync(file) && !JSON.parse(fs.readFileSync(file, "utf8")).unread;
  if (got.unread && stands) return say(`The host's rights could not be read (${got.unread}): the recording that stands is kept.`);
  const as = standIns();
  const rights = got.unread ? { unread: got.unread } : { pushList: got.pushList.map((entry) => ({ ...entry, login: as(entry.login) })), answers: got.answers.map((answer) => rightOf(answer, as)) };
  fs.writeFileSync(file, `${JSON.stringify(rights)}\n`);
  return say(got.unread ? `The host's rights could not be read: ${got.unread}` : `Recorded the push list: ${rights.pushList.length} account(s).`);
}

// records what it is asked and prints the comparison; its exit code: 2 for arguments it cannot read, 1 where a pull
// request was refused or the host could not be read
export function main(args, { call = gh, folder = FOLDER, say = console.log, warn = console.error } = {}) {
  const at = args.indexOf("--count"), count = at >= 0 ? Number(args[at + 1]) : 8;
  const asked = args.flatMap((arg, i) => (arg === "--pr" ? [Number(args[i + 1])] : []));
  if (!Number.isInteger(count) || count < 0 || asked.some((n) => !Number.isInteger(n) || n < 1)) {
    warn("FAIL: --count and --pr take a whole number. Mend: run node scripts/security-review-record.mjs [--count N] [--pr N]...");
    return 2;
  }
  try {
    fs.mkdirSync(folder, { recursive: true });
    const refused = recordEach(call, asked.length ? asked : chosen(call, count), folder, say, warn);
    writeRights(call, folder, say);
    const found = recordings(folder).flatMap(({ record }) => compare(record));
    for (const line of found) say(line);
    say(found.length ? `${found.length} difference(s) from the host's record.` : "No difference from the host's record.");
    return refused > 0 ? 1 : 0;
  } catch (e) {
    warn(`FAIL: the host could not be read (${why(e)}). Mend: run it where gh answers for the owner's account, or run it again once the host answers`);
    return 1;
  }
}
// each pull request recorded in its own file; how many were refused
function recordEach(call, numbers, folder, say, warn) {
  let refused = 0;
  for (const n of numbers) {
    let raw;
    try { raw = fetchPull(call, n); } catch (e) {
      warn(`FAIL: #${n}: the host could not give it (${why(e)}). Mend: record it again once the host answers, where gh answers for the owner's account`);
      refused++;
      continue;
    }
    try {
      fs.writeFileSync(path.join(folder, `pr-${n}.json`), `${JSON.stringify(recordOf(raw))}\n`);
      say(`Recorded #${n}.`);
    } catch (e) {
      warn(e.message);
      refused++;
    }
  }
  return refused;
}

if (started(import.meta.url)) process.exit(main(process.argv.slice(2)));
