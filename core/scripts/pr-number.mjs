// The number of each rule the part "What holds it" names (split from pr-description.mjs, #888; "Every rule says what holds it" in the core's AGENTS.md; #303). pr-description.mjs,
// beside this file, says what the check asks as a whole, runs this one and exports what it holds.
import { NUMBER } from "./outcomes.mjs";
import { isPart } from "./milestones.mjs";

// a rule's number in its form at the start of a line, whatever follows it, in any case (#750, point 4)
const NUMBER_FIRST = new RegExp(NUMBER.source.replace(/\$$/u, "(?![\\w-])"), "iu");
export const HOLDS = "What holds it";

// The mend where the part HOLDS holds more than "None" and no line "Number: <the count>; outcome: <the outcome>" in
// NUMBER's form; null where it does, or where the part is not there (missing() names that).
export function numberMend(body) {
  const lines = String(body ?? "").split(/\r\n|\r|\n/u), heading = l => /^ {0,3}#{1,6}[ \t]+(.*)$/u.exec(l)?.[1];
  const at = lines.findIndex(l => heading(l) && isPart(heading(l), HOLDS));
  if (at < 0) return null;
  const end = lines.findIndex((l, i) => i > at && heading(l));
  const part = lines.slice(at + 1, end < 0 ? undefined : end).map(l => l.trim()).filter(Boolean);
  if (part.every(l => /^None\b/u.test(l))) return null;
  const named = part.map(l => /(?:^|[\s*-])Number: (.*[^.\s])[.\s]*$/u.exec(l)?.[1]).filter(Boolean);
  if (named.some(n => NUMBER_FIRST.test(n))) return null;
  return `the part "${HOLDS}" names no rule's number${named.length ? ` in its form (it reads "${named[0]}")` : ""}. Mend: under it, for each rule this pull request adds or widens, add a line "Number: <findings | check fires | correction: <kind>>; outcome: <asked | fast | readable | usable | robust>", the count the rule is meant to lower and the outcome it stands for, with "; rare harm" at its end where the rule guards against rare and severe harm, as the rule's entry in scripts/holders/ keeps it under "number"; or write "None" alone under the heading where it adds no rule`;
}
