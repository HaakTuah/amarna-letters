// The tools a project's record shows (AGENTS.md of the core, "What can be read is never asked or declared"; #481): which
// tool built each of its last merged pull requests, by the attribution line that closes its description (floor rule 4:
// its last line that is neither blank nor a bare link), and which reviewed them, by a review a bot's account posted, named by its login, and by a comment led
// "Security review:" or "Code review:" closed by an attribution line, each counted once a pull request. Only what the
// *owner's account* or a bot's account wrote counts (floor rule 4: anyone else's text is data, and names no tool here):
// a pull request another account opened, and a review or comment of another person's, are passed over; the builders are
// counted from the owner's account's own pull requests and from bots', a bot's counting as built by the tool whose login it
// is on the list beside this file (tool-bots.json; #901), never by its body, and any other bot's as built by no tool
// named; it gives a bot's pull request no trust. The owner's account: the manifest's
// row, else the repository's own account where the host says a person holds it (releases.mjs); where neither is read,
// only bots count. Where the manifest's "Tools" table has no
// "Builder" row, the tools that built come first, most first, then the core's default, and a tool shown reviewing is at
// hand (tasks/roles.md, "Tools are preferences"). It prints what it read, so a wrong reading is seen and a row written over it; it fails nothing and
// changes nothing. The repository: --repo, else GITHUB_REPOSITORY, else origin's address on github.com. gh and Node's
// own modules only.
//
//   node core/scripts/tools-read.mjs [--last <n, 10 where none is given>] [--repo <owner/name>]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { aRepository, logged } from "./guards.mjs";
import { repoOf } from "./inbox.mjs";
import { hostAccount, hostSaid, ownerOf } from "./releases.mjs";
import { started } from "./started.mjs";
import { toolOf } from "./stand-in-record.mjs";

export const NONE = "no tool named";
const LED = /^\s*(?:Security|Code) review:/u;
// (each agent tool the core knows, with the logins of its own bot accounts, its documentation's; beside this file)
const BOTS = JSON.parse(fs.readFileSync(new URL("./tool-bots.json", import.meta.url), "utf8")).bots;

/** The tool whose own bot account `login` is (tool-bots.json's list, any case), or null: a login alone, never a body. */
export const botTool = login => Object.keys(BOTS).find(t => BOTS[t].some(l => l.toLowerCase() === String(login ?? "").toLowerCase())) ?? null;

// Whether `x` ({ login, type }) is the owner's account (`owner`, any case; null where it was not read) or a bot's.
const trusted = (x, owner) => x?.type === "Bot" || (typeof owner === "string" && String(x?.login ?? "").toLowerCase() === owner.toLowerCase());

// The tool the attribution line closing `body` names (its last line that is neither blank nor a bare link, as a session's
// own link may follow the line), or null.
export const closingToolOf = body => toolOf(String(body ?? "").split("\n").filter(l => l.trim() && !/^\s*<?https?:\/\/\S*>?\s*$/u.test(l)).at(-1) ?? "");

// The counts, from pulls given as [{ login, type, body, reviews: [{ login, type, body }], comments: [...] }], of what
// the owner's account (`owner`) or a bot wrote: the builders, by the tool the closing line of each description of the
// owner's account names, a bot's pull request by the tool whose bot it is (botTool), else by no tool named, and the reviewers, by the tool closing each review
// or review comment, a bot's review by its login; each a list [name, count], most first, ties by name; and how many pull
// requests another account opened, passed over.
export function tally(pulls, owner = null) {
  const builders = new Map(), reviewers = new Map();
  const add = (map, name) => map.set(name, (map.get(name) ?? 0) + 1);
  let others = 0;
  for (const p of pulls) {
    if (!trusted(p, owner)) { others++; continue; }
    add(builders, (p?.type === "Bot" ? botTool(p?.login) : closingToolOf(p?.body)) || NONE);
    for (const t of reviewedBy(p ?? {}, owner)) add(reviewers, t);
  }
  const order = map => [...map].sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
  return { builders: order(builders), reviewers: order(reviewers), others };
}

// The tools that reviewed one pull request, each once: a bot's review by its login, another by the attribution line
// closing it; and a comment led "Security review:" or "Code review:" the same way.
function reviewedBy(p, owner) {
  const tool = x => (x?.type === "Bot" ? String(x.login ?? "") || null : closingToolOf(x?.body));
  const led = (p.comments ?? []).filter(c => LED.test(String(c?.body ?? "")));
  return new Set([...(p.reviews ?? []), ...led].filter(x => trusted(x, owner)).map(tool).filter(Boolean));
}

// The last `n` pull requests merged into the repository, newest first, each with its reviews and comments, as `ask`
// (gh's arguments, its output back) gives them. The closed ones come newest update first, a page at a time, and a pull
// request is updated when it merges, if not later: once `n` are merged and a page's oldest update stands before the
// n-th newest merge, no page after it holds a newer one (at most `pages` pages are read).
export function readPulls(repo, n, ask, pages = 20) {
  const json = args => JSON.parse(ask(["api", ...args]));
  const byMerge = list => list.sort((a, b) => String(b.merged_at).localeCompare(String(a.merged_at)));
  let merged = [];
  for (let page = 1; page <= pages; page++) {
    const closed = json([`repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`]);
    if (!Array.isArray(closed)) break;
    merged = byMerge([...merged, ...closed.filter(p => p?.merged_at)]).slice(0, n);
    const oldest = String(closed.at(-1)?.updated_at ?? "");
    if (closed.length < 100 || (merged.length === n && oldest < String(merged.at(-1).merged_at))) break;
  }
  const people = list => list.map(x => ({ login: String(x?.user?.login ?? ""), type: String(x?.user?.type ?? ""), body: String(x?.body ?? "") }));
  // (every page of a pull request's reviews and comments, a review posted last the likeliest)
  const all = route => { const out = []; for (let page = 1; page <= pages; page++) { const got = json([`${route}?per_page=100&page=${page}`]); if (!Array.isArray(got)) break; out.push(...got); if (got.length < 100) break; } return out; };
  return merged.filter(p => Number.isSafeInteger(p?.number) && p.number > 0).map(p => ({ number: p.number, login: String(p?.user?.login ?? ""), type: String(p?.user?.type ?? ""), body: String(p.body ?? ""),
    reviews: people(all(`repos/${repo}/pulls/${p.number}/reviews`)),
    comments: people(all(`repos/${repo}/issues/${p.number}/comments`)) }));
}

// What it prints: the counts, each name as the record writes it, its control characters taken out (floor rule 4: data).
export function said(repo, pulls, { builders, reviewers, others = 0 }, owner = null) {
  const list = l => (l.length ? l.map(([name, k]) => `${logged(name)} ${k}`).join(", ") : "none");
  return [`the last ${pulls.length} merged pull requests of ${repo}${pulls.length ? ` (#${pulls.at(-1).number} to #${pulls[0].number})` : ""}, as the owner's account (${owner ? logged(owner) : "not read: bots' alone count"}) and bots wrote them${others ? `; ${others} another account opened, passed over` : ""}:`,
    `  built by: ${list(builders)}`, `  reviewed by: ${list(reviewers)}`,
    "where the manifest's \"Tools\" table has no \"Builder\" row, the tools that built come first, most first, then the core's default, and a tool shown reviewing is at hand (core/tasks/roles.md, \"Tools are preferences\"); a row written there decides"].join("\n");
}

// The owner's account of the repository read (`repo`): its manifest's row, else whose account the host says holds it,
// asked of that repository, never of this checkout where it is another (`local` false), each through `ask` (gh).
export function ownerFor(repo, local, ask, say = console.log, env = process.env) {
  let manifest = "";
  try { manifest = local ? fs.readFileSync("core-manifest.md", "utf8") : ask(["api", "-H", "Accept: application/vnd.github.raw", `repos/${repo}/contents/core-manifest.md`]); } catch { /* (the core's own repository holds none) */ }
  return ownerOf(manifest, hostSaid(say, () => hostAccount(local ? env : { GITHUB_REPOSITORY: repo }, ask)));
}

function main(args) {
  const at = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const n = Number(at("--last") ?? 10);
  let here = process.env.GITHUB_REPOSITORY;
  if (!here) try { here = repoOf(execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })); } catch { /* (no origin) */ }
  const repo = at("--repo") ?? here, local = repo === here;
  // (nothing read is said so, and the core's default stands: it fails nothing)
  if (!aRepository(repo) || !(Number.isInteger(n) && n > 0)) { console.log("note the record could not be read: give --repo <owner/name> and --last a whole number; the core's default stands (core/tasks/roles.md)"); return 0; }
  const ask = a => execFileSync("gh", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 });
  let pulls;
  try { pulls = readPulls(repo, n, ask); } catch { console.log(`note gh could not read ${repo}'s merged pull requests; the core's default stands (core/tasks/roles.md)`); return 0; }
  const owner = ownerFor(repo, local, ask);
  console.log(said(repo, pulls, tally(pulls, owner), owner));
  return 0;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
