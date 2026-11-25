// Which rules each role cites (#296; #248, part D.3): the count #243 took by hand
// (reports/2026-11-14-start-reading-counted-by-role.md), made each month for the state report (state-report.mjs,
// beside this file), in the core and in every project that takes it. Of the month it counts it reads the descriptions
// of the pull requests merged in it and every comment written in it on an issue or a pull request, each as the role it
// opens as: a description is its builder's; a comment opens with an opener of labels.json, beside this file
// (roles/shared/inbox.md, "Labels and openers say who wrote what"), or is one of Codex's findings on a pull request's lines, a reviewer's. A text by an account
// the host does not let write, or that opens as no role, is left out. A rule of the floor and the modules (rules.mjs)
// is cited where a text names its lead outside a line that is a heading alone: one of three words or more as it stands, a shorter one in quotes, and a
// numbered rule of the floor by its number ("floor rule 4", "floor rules 4 and 11"). A lead that stands in more than
// one file counts for each whose file the text names, else for the first. With each role, how many of the rules it
// reads at its start (reading.mjs) it did not cite. It reads only, through gh; Node's own modules.
//
//   node scripts/cited.mjs --repo owner/name --month YYYY-MM   the lines the state report carries, for that month
import path from "node:path";
import { ghApi, pagesOf } from "./labels.mjs";
import { library, reading } from "./reading.mjs";
import { ROOT, rules } from "./rules.mjs";
import { codexs, WRITERS } from "./security-review.mjs";
import { started } from "./started.mjs";

export const HEADING = "The rules each role cites";
// Each opener of labels.json that names a role, with that role's file's name (roles/).
export const OPENERS = {
  "From a builder session": "builder",
  "From the orchestrator": "orchestrator",
  "From the owner's design session": "design",
  "Security review": "reviewer",
  "Code review": "reviewer",
  "Design check": "reviewer",
  "Leanness check": "reviewer",
  "The stand-in's notes": "stand-in",
  "From an auditor": "auditor",
};
export const ROLES = ["builder", "design", "orchestrator", "reviewer", "stand-in", "auditor"];
const WRITING = new Set(WRITERS);
const MOST = 5;
// A line that is a heading alone, or a lead in bold alone: a text's frame, which cites nothing. Only a short line is
// read so, and a carried line is read only to a length a count's line keeps to, so that no long line of a text, which
// anyone the host lets write may give, costs the look's job more than a moment.
const HEADING_LINE = /^\s*(?:#{1,6}\s.*|\*\*[^*]+\*\*:?)\s*$/u;
const HEADING_MAX = 300, LINE_MAX = 4096;
const heading = l => l.length <= HEADING_MAX && HEADING_LINE.test(l);

// A text as it is matched: its quotes made plain, its marks of emphasis and code left out, its spaces one, in small letters.
export const plain = s => String(s ?? "").normalize("NFKC").replace(/[‘’]/gu, "'").replace(/[“”]/gu, '"')
  .replace(/[*_`]/gu, "").replace(/\s+/gu, " ").toLowerCase();
const escaped = s => s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// The role a text opens as, or null: a comment's first line, its marks left out.
export function roleOf(text) {
  const first = String(text ?? "").split(/\r?\n/u).find(l => l.trim()) ?? "";
  const opens = first.replace(/^[\s>#*_]+/u, "");
  const hit = Object.keys(OPENERS).find(o => opens.startsWith(o));
  return hit ? OPENERS[hit] : null;
}

// The matchers of the rules: [{ re, keys }], one for each lead however many files hold it, and the floor's rules by
// number (Map number -> key).
export function matchers(all) {
  const byLead = new Map(), numbered = new Map();
  for (const r of all) {
    const m = /^(\d+)\. (.*)$/u.exec(r.lead), lead = plain(m ? m[2] : r.lead);
    if (m && r.file.startsWith("floor/")) numbered.set(Number(m[1]), r.key);
    if (!byLead.has(lead)) byLead.set(lead, []);
    byLead.get(lead).push(r);
  }
  const leads = [...byLead].map(([lead, held]) => ({
    re: lead.split(" ").length >= 3 ? new RegExp(`(?<![\\w-])${escaped(lead)}(?![\\w-])`, "u") : new RegExp(`"${escaped(lead)}[.,]?"`, "u"),
    held,
  }));
  return { leads, numbered };
}

// Of rules sharing a lead, those the text names the file of, else the first.
function chosen(held, text) {
  if (held.length === 1) return [held[0].key];
  const named = held.filter(r => text.includes(path.posix.basename(r.file, ".md")));
  return (named.length ? named : held.slice(0, 1)).map(r => r.key);
}

// The keys of the rules a text cites.
export function citedIn(text, { leads, numbered }) {
  const t = plain(String(text ?? "").split(/\r?\n/u).filter(l => !heading(l)).join("\n")), out = new Set();
  for (const { re, held } of leads) if (re.test(t)) for (const k of chosen(held, t)) out.add(k);
  for (const m of t.matchAll(/\bfloor rules? (\d+(?:(?:,? and |,? or |, )\d+)*)/gu))
    for (const n of m[1].match(/\d+/gu)) if (numbered.has(Number(n))) out.add(numbered.get(Number(n)));
  return out;
}

// The pull requests of `repo` merged from `from` to `to` (ISO times), as GitHub lists them.
export function mergedIn(repo, from, to, gh = ghApi) {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const rows = JSON.parse(gh(`repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`) || "[]");
    out.push(...rows.filter(p => p.merged_at && p.merged_at >= from && p.merged_at < to));
    if (rows.length < 100 || rows.every(p => String(p.updated_at) < from)) break;
  }
  return out;
}

// The month after a month ("2026-12" gives "2027-01").
export const after = month => { const [y, m] = month.split("-").map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`; };

// What is read for `month` ("YYYY-MM"): [{ role, text }], with how many descriptions and comments were read.
export function texts(repo, month, gh = ghApi) {
  const from = `${month}-01T00:00:00Z`, to = `${after(month)}-01T00:00:00Z`, items = [];
  const pulls = mergedIn(repo, from, to, gh).filter(p => WRITING.has(p.author_association));
  for (const p of pulls) items.push({ role: "builder", text: p.body ?? "" });
  let comments = 0;
  for (const route of ["issues/comments", "pulls/comments"]) {
    for (const c of pagesOf(`repos/${repo}/${route}?since=${from}&sort=created&direction=asc`, gh)) {
      if (!(c.created_at >= from && c.created_at < to)) continue;
      // (Codex's findings are its comments on a pull request's lines; its receipts and summaries cite nothing)
      const role = codexs(c) ? (route === "pulls/comments" ? "reviewer" : null) : WRITING.has(c.author_association) ? roleOf(c.body) : null;
      if (role) { comments++; items.push({ role, text: c.body ?? "" }); }
    }
  }
  return { items, pulls: pulls.length, comments };
}

// The rules each role reads at its start: Map role -> Set of keys.
export function startRules(all, root = ROOT) {
  const lib = library(root, ""), out = new Map();
  for (const role of ROLES) {
    const files = new Set(reading(lib, { role }).start ?? []);
    out.set(role, new Set(all.filter(r => files.has(r.file)).map(r => r.key)));
  }
  return out;
}

// The count: Map role -> { texts, citing, by: Map key -> texts that cite it }.
export function count(items, m) {
  const out = new Map(ROLES.map(r => [r, { texts: 0, citing: 0, by: new Map() }]));
  for (const { role, text } of items) {
    const s = out.get(role);
    if (!s) continue;
    const keys = citedIn(text, m);
    s.texts++;
    if (keys.size) s.citing++;
    for (const k of keys) s.by.set(k, (s.by.get(k) ?? 0) + 1);
  }
  return out;
}

// One role's line.
function roleLine(role, s, start) {
  if (!s.texts) return `- ${role}: no text.`;
  const most = [...s.by].sort(([a, x], [b, y]) => y - x || a.localeCompare(b)).slice(0, MOST).map(([k, n]) => `${k} (${n})`);
  const uncited = [...start].filter(k => !s.by.has(k)).length;
  return `- ${role}: ${s.texts} texts, ${s.citing} citing a rule, ${s.by.size} rules cited; of the ${start.size} it reads at its start, ${uncited} not cited${most.length ? `; the most cited: ${most.join(", ")}` : ""}.`;
}

// The lines the state report carries for `month`.
export function lines({ month, pulls, comments, counted, starts }) {
  return [
    `- Read: the descriptions of ${pulls} pull requests merged in ${month} and ${comments} comments written in it that open as a role's (\`scripts/cited.mjs\`); a rule is cited where a text names its lead, a floor rule its number.`,
    ...ROLES.map(role => roleLine(role, counted.get(role), starts.get(role) ?? new Set())),
  ];
}

// The count of `repo` for `month`, as the report's lines; one line that says why where GitHub did not answer.
export function report({ repo, month, gh = ghApi, root = ROOT }) {
  let read;
  try { read = texts(repo, month, gh); }
  catch { return [`- Not read: GitHub did not answer for the pull requests and comments of ${month} (the look's job needs \`issues: read\` and \`pull-requests: read\`).`]; }
  const all = rules(root);
  return lines({ month, pulls: read.pulls, comments: read.comments, counted: count(read.items, matchers(all)), starts: startRules(all, root) });
}

// A project's count, from its state report's text, as one line for the core's report: each line of the count read by
// a whole-line form that holds numbers, the roles and the core's own rule names alone (`known`, the keys of the rules),
// and written anew from what it holds, so no other text of the project's reaches the core's report; null where none is
// in its form.
export function citedFrom(text, known) {
  const part = String(text ?? "").split(`**${HEADING}**`)[1]?.split(/\n\*\*/u)[0] ?? "", out = [];
  for (const l of part.split(/\r?\n/u)) {
    if (l.length > LINE_MAX) continue;
    let m;
    if ((m = /^- Read: the descriptions of (\d{1,7}) pull requests merged in (\d{4}-\d\d) and (\d{1,7}) comments written in it /u.exec(l))) out.push(`cited in ${m[2]}, of ${m[1]} pull requests and ${m[3]} comments`);
    else if ((m = /^- (builder|design|orchestrator|reviewer|stand-in|auditor): no text\.$/u.exec(l))) out.push(`${m[1]} no text`);
    else if ((m = /^- (builder|design|orchestrator|reviewer|stand-in|auditor): (\d{1,7}) texts, (\d{1,7}) citing a rule, (\d{1,5}) rules cited; of the (\d{1,5}) it reads at its start, (\d{1,5}) not cited(?:; the most cited: (.+))?\.$/u.exec(l))) {
      const most = [...(m[7] ?? "").matchAll(/(.+?) \((\d{1,7})\)(?:, |$)/gu)].filter(x => known.has(x[1])).map(x => `${x[1]} (${x[2]})`);
      out.push(`${m[1]} ${m[3]} of ${m[2]} texts citing ${m[4]} rules, ${m[6]} of the ${m[5]} it reads at its start not cited${most.length ? `, the most: ${most.join(", ")}` : ""}`);
    }
  }
  return out.length ? out.join("; ") : null;
}

if (started(import.meta.url)) {
  const args = process.argv.slice(2), at = f => args[args.indexOf(f) + 1];
  const repo = at("--repo"), month = at("--month");
  if (!/^[\w-]+\/[\w.-]+$/u.test(repo ?? "") || !/^\d{4}-(?:0[1-9]|1[0-2])$/u.test(month ?? "")) {
    console.error("FAIL: it takes --repo owner/name and --month YYYY-MM. Mend: name the repository and the month to count, as `node scripts/cited.mjs --repo owner/name --month 2026-10`");
    process.exitCode = 1;
  } else console.log(report({ repo, month }).join("\n"));
}
