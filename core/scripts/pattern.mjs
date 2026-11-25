// The marks of "A rule is written to one pattern" (AGENTS.md; #1137), the parts of the pattern a script reads exactly:
// each rule of the floor, the modules or the core's AGENTS.md, as rules.mjs beside this file reads them, carries
// "Reason:", a holder ("Held by" and the forms MARKS lists), and either "Nothing changes it." or one "The one condition
// that changes it", never two. Against --base, it fails a rule the change adds (a bold lead no rule of the base holds,
// in any file, so a rule moved is not new) that lacks a mark, by its file and lead, with the mend; it reports one the
// change words anew but does not add, failing nothing, since the rules that stood before the pattern come to it by the
// audit (#259); a rule whose own text is unchanged is not read. A rule's own text leaves out the rules nested in it,
// which are read on their own, and a rule its entry in scripts/holders/ marks "describes" alone binds no one and is not
// read. Whether a trigger is observable, one actor and one action, a reason of one line and "It does not mean" stay the
// design check's (roles/shared/review-guidelines.md, "A rule file changed"): no script reads them without guessing.
// Without --base it only counts the rules that lack each mark, and says so. This repository only, run by size.yml with
// the base. Reads only; git, through rules.mjs, and Node's own modules.
//
//   node scripts/pattern.mjs [--base <commit>]
import { execFileSync } from "node:child_process";
import { named } from "./holders.mjs";
import { ROOT, rules, rulesAt } from "./rules.mjs";
import { started } from "./started.mjs";

// Each mark: the part of the pattern, whether the rule's own text lacks it, and the mend.
export const MARKS = [
  { part: "no reason", lacks: t => !/\bReason:/u.test(t),
    mend: "add a line 'Reason: …' in one sentence after what it does not mean" },
  // (the forms the rules use: "Held by", "Held by nothing yet", "Held, in part, by", "Held in part by", "Held here by",
  // and "Held, for <a part> / in <a place>, by")
  { part: "no holder", lacks: t => !/\bHeld(?: here| in part|, in part,|, (?:for|in) [^,.]+,)? by\b/u.test(t),
    mend: "end it with 'Held by' and the check, staged case or audit that holds it, or 'Held by nothing yet.'" },
  { part: "no condition", lacks: t => !/\bNothing changes it\b/u.test(t) && !conditions(t),
    mend: "say 'Nothing changes it.' after the default, or name its one condition ('The one condition that changes it: …')" },
  { part: "two conditions", lacks: t => conditions(t) > 1,
    mend: "keep one 'The one condition that changes it', and join the others to it or write each as a rule of its own" },
];
const conditions = t => (t.match(/\bthe one condition that changes it\b/giu) ?? []).length;

// The parts of the pattern a rule's own text lacks, each { part, mend }: read with its line breaks and the spaces that
// indent a list's lines as one space, so a mark wrapped across lines is read whole.
export const lacking = text => { const t = String(text).replace(/\s+/gu, " "); return MARKS.filter(m => m.lacks(t)); };

// Each rule with its own text: its text without the rules nested in it, which follow it in the same file.
export function own(all) {
  return all.map((r, i) => {
    let text = r.text;
    for (let j = i + 1; j < all.length && all[j].file === r.file && r.text.includes(all[j].text); j++) text = text.replace(all[j].text, "");
    return { ...r, own: text };
  });
}

// What a change does to the rules: of the head's rules not marked "describes" alone, those it adds and those it words
// anew, each with the parts it lacks. `head` and `base` are rules.mjs's lists; `holders`, named()'s, keyed by the rule.
export function judge(head, base, holders = {}) {
  const leads = new Set(base.map(r => r.lead));
  const before = new Map(own(base).map(r => [r.key, r.own]));
  const binds = r => { const h = [].concat(holders[r.key] ?? []); return !(h.length && h.every(x => /^describes\b/u.test(x))); };
  const added = [], changed = [];
  for (const r of own(head).filter(binds)) {
    const lacks = lacking(r.own);
    if (!leads.has(r.lead)) added.push({ ...r, lacks });
    else if (before.get(r.key) !== r.own && lacks.length) changed.push({ ...r, lacks });
  }
  return { added, changed };
}

// What it prints against a base: each rule worded anew that lacks a mark, reported; each mark a rule added lacks, failed
// with its mend; then the count. { lines, failed }.
export function report(head, base, holders, baseRev) {
  const { added, changed } = judge(head, base, holders);
  const lines = changed.map(r => `${r.file}: "${r.lead}" is worded anew and lacks: ${r.lacks.map(m => m.part).join(", ")}; reported, as it stood before this change (the audit brings it to the pattern, #259)`);
  let failed = 0;
  for (const r of added) for (const m of r.lacks) { failed++; lines.push(`FAIL ${r.file}: "${r.lead}" is a rule this change adds, with ${m.part}. Mend: ${m.mend}; or, where its bold lead binds no one, give it the holder "describes" in its entry of scripts/holders/`); }
  lines.push(`${head.length} rules read against ${baseRev}: ${added.length} added, ${failed} marks missing in them; ${changed.length} worded anew that lack one, reported`);
  return { lines, failed };
}

// The holders scripts/holders/ under `root` names, keyed by the rule, as judge() takes them.
export const holdersOf = root => named(root).named;

// The check on `args` (the command line's, after the script): { code, lines }, what it prints and its exit code.
export function main(args, root = ROOT) {
  const at = args.indexOf("--base");
  const baseRev = at >= 0 ? args[at + 1] : null;
  const fail = line => ({ code: 1, lines: [`FAIL ${line}`] });
  if (at >= 0 && !isCommit(root, baseRev)) return fail(`--base needs a commit of this repository, and "${baseRev ?? ""}" is none. Mend: fetch the base (git fetch origin main) and name its commit after --base`);
  const head = rules(root, { agents: true });
  if (!head.length) return fail("no rule of the floor, the modules or AGENTS.md was read, so the check would pass anything. Mend: run the core's own copy of this script, in a checkout that holds its rule files");
  const holders = holdersOf(root);
  if (!baseRev) {
    const { added } = judge(head, [], holders);
    const counts = MARKS.map(m => `${added.filter(r => r.lacks.includes(m)).length} with ${m.part}`).join(", ");
    return { code: 0, lines: [`no --base given: nothing failed. Of ${added.length} rules that bind: ${counts}`] };
  }
  const base = rulesAt(root, baseRev, { agents: true });
  if (!base.length) return fail(`no rule was read at ${baseRev}, so every rule would be taken for new. Mend: name after --base the commit this change starts from, one that holds the rule files`);
  const { lines, failed } = report(head, base, holders, baseRev);
  return { code: failed ? 1 : 0, lines };
}

// (a commit, never an option: git is asked whether it is one, and it stands after --end-of-options)
function isCommit(root, rev) {
  if (!/^[\w^~./][\w^~./-]*$/u.test(rev ?? "")) return false;
  try { execFileSync("git", ["-C", root, "rev-parse", "--verify", "--quiet", "--end-of-options", `${rev}^{commit}`], { stdio: "ignore" }); return true; } catch { return false; }
}

if (started(import.meta.url)) {
  const { code, lines } = main(process.argv.slice(2));
  console.log(lines.join("\n"));
  process.exitCode = code;
}
