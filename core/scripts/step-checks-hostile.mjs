// What the step of the hostile tests reads: SECURITY.md's rule 5 and the tests its inputs name (steps.mjs, beside this
// file, holds the steps, and step-checks.mjs the words they share). Each piece takes the project as steps.mjs's
// `project` reads it and returns the mend, or null where the step is done; a step names the ones it needs, none runs
// by itself. It reads only. Node's own modules and git only.
import { Unread } from "./workflow-calls.mjs";

// Rule 5 of a project's SECURITY.md, from its line "5. " to the next rule or heading at a line's start: its lines, the
// first without its number and title; null where there is none.
function rule5(text) {
  const lines = text?.split("\n") ?? [], at = lines.findIndex(l => /^5\.\s/.test(l));
  if (at < 0) return null;
  const end = lines.findIndex((l, i) => i > at && /^(\d+\.\s|#)/.test(l));
  return [lines[at].replace(/^5\.\s*(\*\*[^*]*\*\*)?:?/, ""), ...lines.slice(at + 1, end < 0 ? undefined : end)];
}

// A block's items: each a list line at its outermost depth, with the lines under it indented deeper (its wrapped text
// and the items nested in it).
function listItems(block) {
  const items = [];
  let depth = null;
  for (const l of block) {
    const indent = /^\s*/.exec(l)[0].length, item = /^\s*[-*]\s/.test(l);
    if (item && (depth === null || indent <= depth)) { depth = indent; items.push(l); }
    else if (items.length && l.trim() && indent > depth) items[items.length - 1] += `\n${l}`;
  }
  return items;
}

// Whether an item names its tests: a path in backticks after the words "hostile tests" that is a file or folder of the
// project (one the item names for what checks the input does not count).
function namesTests(p, item) {
  const there = f => { const n = f.replace(/^\.\//, "").replace(/\/+$/, ""); return !!n && p.files.some(x => x === n || x.startsWith(`${n}/`)); };
  return [...(/hostile\s+tests\b([\s\S]*)/i.exec(item)?.[1] ?? "").matchAll(/`([^`]+)`/g)].some(m => there(m[1]));
}

const CASES = "too long, the wrong type, markup, a file path, a number out of range, nothing at all";

// An item's limits, the words after "limits:" up to its hostile tests or its end, what is in backticks taken out first
// (a "limits:" there is none); null where it states none: no number and no "none".
function limitsOf(item) {
  const said = /\blimits:([\s\S]*?)(?=hostile\s+tests\b|$)/i.exec(item.replace(/`[^`]*`/g, ""))?.[1] ?? "";
  return /\d|\bnone\b/i.test(said) ? said : null;
}

// Whether an item says its input carries a version, in its own words outside its limits and anything in backticks (a
// path such as `scripts/exact-versions.mjs` says nothing of the input).
// An item that says its input carries none ("carries no version", "without a version number") says nothing of one
// either; one that names its version otherwise ("refused without a version", "no version newer") still does.
const versioned = item => /\bversions?\b/i.test(item.replace(/`[^`]*`/g, "").replace(/\blimits:[\s\S]*?(?=hostile\s+tests\b|$)/i, "")
  .replace(/\b(?:(?:carries|carry|has|have|holds?)\s+no\s+versions?(?:\s+numbers?)?|without\s+an?\s+version\s+numbers?)\b/gi, ""));

// (an item's words as a mend shows them: no control character, which would reach the sync's log as it stands, and no
// character that reorders or hides text, which would make the mend read otherwise than it is)
const short = l => { const t = l.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, "?"); return t.length > 80 ? `${t.slice(0, 77)}...` : t; };

// The step for the inputs rule 5 names: "None", or the starter kit's "FILL IN", reads done only while it lists no input;
// once one is listed, each is read, and an item whose tests are still "FILL IN" names none.
export function hostileTests(p) {
  const block = rule5(p.read("SECURITY.md"));
  if (!block) throw new Unread("no SECURITY.md with a rule 5 to read");
  const items = listItems(block), said = block.join("\n");
  if (!items.length && (/FILL IN/.test(said) || /^None\b/i.test(said.trim()))) return null;
  if (!items.length) return `In \`SECURITY.md\`, rule 5, list each input anyone but the user at hand can shape as an item of its own (a line that opens \`- \`), saying what checks it and then, after the words "hostile tests:", naming in backticks the file or folder that holds them (${CASES}), or write "None" where the project takes none.`;
  const first = l => short(l.split("\n")[0].trim().slice(2).trim());
  const bare = items.filter(l => !namesTests(p, l)).map(first);
  const unlimited = items.filter(l => !limitsOf(l)).map(first);
  const unversioned = items.filter(l => limitsOf(l) && versioned(l) && !/\bversions?\W{0,3}v?\d/i.test(limitsOf(l))).map(first);
  const wrong = [
    bare.length && `each input names, after the words "hostile tests:", in backticks, a file or folder of the project that holds them (${CASES}): write those tests where they are missing, and name them so. Naming none that is there: ${bare.join("; ")}.`,
    unlimited.length && `each input names, after the words "limits:", its limit in size, in count and in time, each as a number where it applies, as its reader holds it (or "limits: none", with why, where its shape has none), and its "too long" test uses that number. Naming none: ${unlimited.join("; ")}.`,
    unversioned.length && `an input that carries a version number names, among its limits, the newest version its reader knows ("version 3"), its reader refuses a newer one with nothing of it used, in words the user can act on, and its hostile tests try one; where the input carries none, its item says nothing of a version. Naming none: ${unversioned.join("; ")}.`,
  ].filter(Boolean);
  return wrong.length ? `In \`SECURITY.md\`, rule 5, ${wrong.join(" And ")}` : null;
}
