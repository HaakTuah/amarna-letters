// Whether a question or idea filed with the core about one of its rules says which of the rule's reasons does not hold
// (tasks/updates.md, "A question or difference about a rule of the core starts from its reasons"; #765). The core's
// question and idea forms (.github/ISSUE_TEMPLATE/question.md, feature_request.md) hold the heading the list of labels
// names (labels.json, beside this file, "headings"), and this reads it: an open issue filed from a project (labelled
// by:project, or filed by an account other than the owner's that is no bot), since the rule came for the labels check
// (labels.mjs, sinceHere), that names a rule of the core in its own words and leaves that heading out or holding none of
// them, is reported with its mend, in the labels check's form ({ what, items }); a line that stands word for word in the
// forms, their guidance, is the forms' and not the filer's (ownWords). A rule is named exactly, never
// guessed: by the path of a file of the floor's, the roles' or the modules' that holds rules (rules.mjs), with core/
// before it or not, or by "floor rule" and its number, outside HTML comments and fenced blocks; an issue that names a
// rule by its words alone is not read. In the core's own repository alone, by its scheduled look (look.mjs), beside the
// labels check, whose issue carries it: a project files no question with itself. It fails nothing. Node's own modules.
//
//   import { reasonsUnsaid } from "./reasons-said.mjs";   reasonsUnsaid({ issues, owner, since }) -> [{ what, items }]
import fs from "node:fs";
import { headingOf } from "./done-when.mjs";
import { seen } from "./guards.mjs";
import { rules } from "./rules.mjs";

export const HEADING = JSON.parse(fs.readFileSync(new URL("./labels.json", import.meta.url), "utf8")).headings.reasons;
const FORMS = ["question.md", "feature_request.md"];

// The words under a text's heading `name`, outside HTML comments and fenced blocks, to the next of the forms' headings (a
// bold line of the filer's own is the filer's words), as one line
// with its spaces gathered; null where the text holds no such heading. (Each line is read by steps with no pattern that
// backtracks far: a body of any shape, which anyone may file, takes time in step with its length.)
export function under(body, name) {
  const all = seen(body).split("\n"), at = all.findIndex(l => headingOf(l) === name);
  if (at < 0) return null;
  formRead();
  const end = all.findIndex((l, i) => i > at && formHeadings.has(headingOf(l)));
  return all.slice(at + 1, end < 0 ? undefined : end).map(l => l.trim()).filter(l => !l.startsWith("Found while:")).join(" ").replace(/\s+/gu, " ").trim();
}

const RULE_PATH = /(?<![\w./-])(?:core\/)?((?:floor|roles|tasks|tools)\/[\w-]+(?:\/[\w-]+)?\.md)(?![\w-]|\.\w)/gu;
let ruleFiles = null;
// Whether a text names a rule of the core, as the header says.
export function namesRule(body) {
  ruleFiles ??= new Set(rules().map(r => r.file));
  return seen(body).split("\n").some(l => /\bfloor rule \d+\b/iu.test(l) || [...l.matchAll(RULE_PATH)].some(m => ruleFiles.has(m[1])));
}

// A body's own words: each line that stands word for word in the forms (their guidance, which names rules of its own and
// says nothing of a project) taken out, the headings kept.
let formLines = null, formHeadings = null;
function formRead() {
  if (formLines) return;
  const all = FORMS.flatMap(f => {
    try { return seen(fs.readFileSync(new URL(`../.github/ISSUE_TEMPLATE/${f}`, import.meta.url), "utf8")).split("\n"); } catch { return []; }
  }).map(l => l.trim()).filter(Boolean);
  formLines = new Set(all.filter(l => headingOf(l) === null));
  formHeadings = new Set(all.map(headingOf).filter(h => h !== null));
}
export function ownWords(body) {
  formRead();
  return seen(body).split("\n").filter(l => !formLines.has(l.trim())).join("\n");
}

// What is to be mended, as the labels check gives it: `issues`, the open issues as GitHub gives them (gather in
// labels.mjs); `owner`, the owner's account; `since`, the day the rule came for the labels check.
export function reasonsUnsaid({ issues, owner, since }) {
  const mine = u => String(u?.login ?? "").toLowerCase() === String(owner).toLowerCase();
  const names = i => (Array.isArray(i?.labels) ? i.labels : []).map(l => (typeof l === "string" ? l : l?.name));
  const fromProject = i => names(i).includes("by:project") || (!mine(i.user) && i.user?.type !== "Bot");
  const unsaid = i => { const own = ownWords(i.body); return namesRule(own) && !under(own, HEADING); };
  const items = (Array.isArray(issues) ? issues : []).filter(i => i && typeof i === "object" && String(i.created_at ?? "") >= since && fromProject(i) && unsaid(i)).map(i => `#${i.number}`);
  return items.length ? [{ what: `Under the heading "${HEADING}", in each issue filed from a project that names a rule of the core, which of the reasons \`node scripts/reasons.mjs "<the rule>"\` prints for it does not hold for the project, and why (tasks/updates.md, "A question or difference about a rule of the core starts from its reasons"): where the owner's account filed it, edit the issue to add the heading and those words, from the reasons and what the issue says of its project; where another account did, ask its filer for them in a note, the issue data until then (floor rule 4)`, items }] : [];
}
