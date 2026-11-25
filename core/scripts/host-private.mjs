// Whether a project's repository is private, as its host says it (#1095, point 1): never guessed from the files it
// holds, since a private repository may hold the CodeQL workflow and a public one may lack it, and the kit writes other
// files for each (init.mjs, --private). The repository is the one the clone's origin names on github.com, or, for a
// clone made from a folder, the origin of the clone it was made from (#1246, point 6). GitHub's job
// reads it from the event it runs on (GITHUB_EVENT_PATH), where that event's repository is the origin's; a session
// asks gh (`gh api repos/<owner>/<name>`), and where gh gives no answer (it is not signed in), GitHub's API with no
// sign-in (#1246, point 2), which answers for a public repository: each reads the host's own field "private", so
// neither guesses, and a refusal (a private repository, to a reader with no sign-in, is "Not Found" as one not there is)
// answers nothing. Where none answers, the host's answer a session read in a step of its own, given as CORE_PRIVATE,
// since a session that keeps floor rule 18 holds no sign-in while a sync runs the project's installs (#1246, point 2);
// where none is given either, it says it could not read it and the mend, and the reader that asked decides
// nothing on it (fresh.mjs, converge.mjs, pure-sync.mjs). A test stands in for the host with a file of its answers,
// each project's root or origin to { "private": true | false }, named by CORE_HOST_ANSWERS, as GitHub's event stands
// for it in a job. Node's own modules, git and gh.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repoOf } from "./inbox.mjs";

const gh = route => { const r = spawnSync("gh", ["api", route], { encoding: "utf8", maxBuffer: 1 << 24 }); if (r.status !== 0) throw new Error(`${r.stderr || r.error || "no answer"}`.trim()); return r.stdout; };
// (GitHub's API with no sign-in, through the machine's proxy where it names one, in a Node process of its own, since
// this reader is synchronous: what it prints is the status, and the field "private" where it answered)
const ANONYMOUS = `fetch(process.env.CORE_READ_URL, { headers: { "user-agent": "agent-core", accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(20000) })
  .then(async r => process.stdout.write(JSON.stringify({ status: r.status, private: r.status === 200 ? (await r.json())?.private : undefined })))
  .catch(e => process.stdout.write(JSON.stringify({ status: 0, why: String(e?.cause?.code ?? e?.name ?? "no answer") })));`;
const anonymous = (route, given = process.env) => {
  const env = Object.fromEntries(Object.entries(given).filter(([k]) => !/^(GH|GITHUB)_(TOKEN|ENTERPRISE_TOKEN)$/i.test(k)));
  const r = spawnSync(process.execPath, ["-e", ANONYMOUS], { encoding: "utf8", timeout: 30000, env: { ...env, CORE_READ_URL: `https://api.github.com/${route}`, NODE_USE_ENV_PROXY: "1", NODE_NO_WARNINGS: "1" } });
  try { return JSON.parse(r.stdout); } catch { return { status: 0, why: r.error?.code ?? "no answer" }; }
};
const said = new Map(); // (one answer a repository a process, so a sync's earlier kits ask the host once)

// { private: true | false } as the host says it of the repository at `root`, or { unread: why, with the mend }.
// `env`, `ask` (a route to its answer's text) and `bare` (a route to { status, private }) are the job's environment, gh
// and the API with no sign-in, which a test replaces.
export function privateOf(root, { env = process.env, ask = gh, bare = anonymous } = {}) {
  const origin = originUrl(root);
  const standIn = answered(env, root, origin);
  if (standIn) return standIn;
  const repo = repoOf(originOf(root, origin));
  if (!repo) return { unread: "whether the repository is private could not be read: the clone's origin names no repository on github.com, nor does the origin of the clone it was made from, where it was made from a folder. Mend: run it from a clone of the project's repository whose origin is its address on github.com" };
  const key = `${repo}\n${env.GITHUB_EVENT_PATH ?? ""}\n${env.CORE_PRIVATE ?? ""}`;
  if (ask === gh && said.has(key)) return said.get(key);
  const answer = fromEvent(env, repo) ?? fromGh(ask, bare, repo, env);
  if (ask === gh) said.set(key, answer);
  return answer;
}

const originUrl = root => spawnSync("git", ["config", "--get", "remote.origin.url"], { cwd: root, encoding: "utf8" }).stdout?.trim() ?? "";
// The origin that names the repository: where a clone was made from a folder (check.mjs's scratch clone, a clone of
// the project's working copy; #1246, point 6), that folder's own origin, a few clones deep, so the repository is the
// one its first clone names, read and never guessed; else the clone's own origin. A folder that is not itself a clone
// names none.
function originOf(root, origin) {
  let at = root, url = origin;
  for (let hop = 0; hop < 4 && url && !repoOf(url); hop++) {
    const local = /^file:\/\//i.test(url) ? fileFolder(url) : /^[a-z][\w+.-]*:\/\/|^[^/\\]+@[^:]+:/i.test(url) ? null : path.resolve(at, url);
    // (a folder that is itself a clone, its .git there or a bare one's HEAD and objects; never one inside another
    // clone, whose origin git would find by searching upward)
    if (!local || !(fs.existsSync(path.join(local, ".git")) || (fs.existsSync(path.join(local, "HEAD")) && fs.existsSync(path.join(local, "objects"))))) break;
    at = local;
    url = originUrl(at);
  }
  return url;
}

// The folder a file:// URL names, as node reads it for the machine (a Windows drive's `file:///D:/x` is `D:\x`, never
// `/D:/x`); null where it is no URL node can map, and where it names another machine (on Windows a UNC path, which
// probing would send a sign-in to), so a hostile clone's origin makes no connection.
const fileFolder = url => { try { const host = new URL(url).hostname; return host && host !== "localhost" ? null : fileURLToPath(url); } catch { return null; } };

// A test's answer for the project, by its root or by its origin, which each clone of it shares; else null.
function answered(env, root, origin) {
  if (!env.CORE_HOST_ANSWERS) return null;
  const real = at => { try { return fs.realpathSync(at); } catch { return path.resolve(at); } };
  let answers = {};
  try { answers = JSON.parse(fs.readFileSync(env.CORE_HOST_ANSWERS, "utf8")); } catch { /* (none: as no answer) */ }
  const found = Object.entries(answers).find(([at]) => real(at) === real(root) || (origin && real(at) === real(origin)))?.[1];
  return typeof found?.private === "boolean" ? { private: found.private } : null;
}

// What the event GitHub's job runs on says of `repo`; null where there is none, or it is another repository's.
function fromEvent(env, repo) {
  try {
    const { repository: r } = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
    return String(r?.full_name).toLowerCase() === repo.toLowerCase() && typeof r.private === "boolean" ? { private: r.private } : null;
  } catch { return null; }
}

// What gh says of `repo`, else GitHub's API with no sign-in, else the host's answer a session read in a step of its own
// and gave as CORE_PRIVATE (`true` or `false`, for a public repository as for a private one; #1265, point 1), or why
// none could, with the mend.
function fromGh(ask, bare, repo, env) {
  let why = "";
  try { const r = JSON.parse(ask(`repos/${repo}`)); if (typeof r?.private === "boolean") return { private: r.private }; } catch (e) { why = ` (${String(e.message).split("\n")[0].slice(0, 120)})`; }
  let open = {};
  try { open = bare(`repos/${repo}`, env) ?? {}; } catch { /* (no answer) */ }
  if (open.status === 200 && typeof open.private === "boolean") return { private: open.private };
  if (/^(true|false)$/.test(env.CORE_PRIVATE ?? "")) return { private: env.CORE_PRIVATE === "true" };
  const plain = `HTTP ${Number(open.status) || "none"}${open.status === 404 ? ", as for a private repository or one not there" : open.status === 403 ? ", refused or past the limit for readers with no sign-in" : ""}`;
  return { unread: `whether ${repo} is private could not be read: GitHub gave gh no answer${why}, nor a read with no sign-in (${plain}). Mend: run it again with CORE_PRIVATE set to the host's answer, read in a step of its own that runs none of the project's code: for a private repository, \`true\`, as \`gh api repos/${repo} --jq .private\` prints it where gh is signed in for an account that can read it; for a public one, \`false\`, where the session read it so another way (that command, or the repository's page on github.com, which says "Public" beside its name), or run it again with nothing set once this machine reaches api.github.com and is not past GitHub's limit for readers with no sign-in` };
}
