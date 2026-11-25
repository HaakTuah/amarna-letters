// The core's archive in its two forms (#252): each item's reasoning, in the core's words, in archive/instructions/,
// which a project's copy carries and "core archive N" leads to; and, for the items written before 16 November 2026, the
// record of the owner's word, in words/, which stays in the core's own repository (its .gitattributes line). An item is
// a line that opens with its key and a stop, at the start of a line: items 1 to LAST_NUMBERED by their number, in a
// file named items-NNN.md; every later one by the issue that carries the owner's word, and where it records one point
// of several by that point, as "#733.1" (#744), in a file of its own named by its key, issue-733.1.md (#750, point 1),
// so that pull requests merged side by side never claim one key nor edit one line. The two are in step where every item
// of the words has its reasoning under the same number, none past LAST_WORDS and none keyed by an issue stands in the
// words, each form keys each item once and in the file its key puts it in (#394), no item past LAST_NUMBERED is
// numbered, no reasoning item quotes (a line opening with ">"), each that has words says what was decided ("Decided:"),
// and each written since (point 6 of #252) names the issue that holds the owner's word ("#N"). Items 1 to LAST_NUMBERED
// stand with none taken out; no number is added past it (#744). An item that changes an earlier one says so on a line
// "Changes: <keys>.", and each it names is marked back, "Changed by: <keys>." (marksOf(); #756, point 3). holders.mjs,
// beside this file, reads it for the items its list names and fails what inStep() finds. Node's own modules.
//
//   import { items, inStep, KEY, MARK, marksOf } from "./archive.mjs";
import fs from "node:fs";
import path from "node:path";

export const REASONS = "archive/instructions";
export const WORDS = "words";
const FILE_LIST = "scripts/holders/ (the entry of each rule it stands behind)";
// The last item whose words stand in words/: from the next on, the words stay on the issue the item names.
export const LAST_WORDS = 245;
// The last item keyed by a running number: from the next on, an item is keyed by its issue (#744).
export const LAST_NUMBERED = 262;
// A key by an issue, "#744", or by one point of it, "#733.1"; the file it stands in alone is issue-<the key>.md.
export const KEY = /^#(\d+(?:\.\d+)?)$/u;
const FILE = /^(?:items-\d+|issue-\d+(?:\.\d+)?)\.md$/u;
const OPENS = /^(\d+|#\d+(?:\.\d+)?)\. /u;
const keyOf = s => /^\d+$/u.test(s) ? Number(s) : s;
// A line that marks an item, read by marksOf() and left out of its text where reasons.mjs prints it; every character
// after the colon is read, so none hides what follows it.
export const MARK = /^\s*(Changes|Changed by):([^\n]*)$/u;
const KEYS = /^ ((?:\d+|#\d+(?:\.\d+)?)(?:, (?:\d+|#\d+(?:\.\d+)?))*)\.$/u;

// The marks of an item's text, as itemsIn() gives it (#756, point 3): { changes, changedBy, wrong }, the keys its line
// "Changes:" names (the earlier items it changes) and those its line "Changed by:" names (the later items that changed
// it), each line of its own below the opening one, its keys by number or issue joined by ", " and closed by a stop;
// `wrong`, each such line not in that form or standing a second time.
export function marksOf(text) {
  const out = { changes: [], changedBy: [], wrong: [] };
  for (const line of String(text).split("\n").slice(1)) {
    const m = MARK.exec(line);
    if (!m) continue;
    const keys = KEYS.exec(m[2].trimEnd()), list = m[1] === "Changes" ? out.changes : out.changedBy;
    if (!keys || list.length) out.wrong.push(line.trim());
    else list.push(...keys[1].split(", ").map(keyOf));
  }
  return out;
}

// The items of one folder under `root`: a Map of key (a number, or "#N" or "#N.P") to { file, text }, in the order they
// stand, and where each key stands (`places`: key to its "file:line"s and files, in the order they stand, more than one
// where it stands twice).
export function itemsIn(root, folder) {
  const out = new Map(), places = new Map();
  const dir = path.join(root, folder);
  if (!fs.existsSync(dir)) return { items: out, places };
  for (const f of fs.readdirSync(dir).filter(f => FILE.test(f)).sort()) {
    let at = null;
    for (const [i, line] of fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/gu, "\n").split("\n").entries()) {
      const m = OPENS.exec(line);
      if (m) {
        at = keyOf(m[1]);
        places.set(at, [...(places.get(at) ?? []), { file: `${folder}/${f}`, at: `${folder}/${f}:${i + 1}` }]);
        out.set(at, { file: `${folder}/${f}`, text: line });
      } else if (/^#(?!\d)/u.test(line)) at = null;
      else if (at !== null) out.get(at).text += `\n${line}`;
    }
  }
  return { items: out, places };
}

// The file an item's key puts it in: for a number, the items-NNN.md whose first number is the highest at or below it;
// for a key by an issue, its own issue-<the key>.md (`archive/instructions.md`).
function fileOf(root, folder, n) {
  if (typeof n === "string") return `${folder}/issue-${KEY.exec(n)[1]}.md`;
  const dir = path.join(root, folder);
  const firsts = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^items-\d+\.md$/u.test(f)).map(f => [Number(/\d+/u.exec(f)[0]), f]).sort((x, y) => x[0] - y[0]) : [];
  const f = firsts.filter(([first]) => first <= n).at(-1)?.[1];
  return f ? `${folder}/${f}` : undefined;
}

// Both forms: { reasons, words }, each a Map as itemsIn() gives it.
export function items(root) {
  return { reasons: itemsIn(root, REASONS).items, words: itemsIn(root, WORDS).items };
}

// An item keyed twice, or standing in a file its key does not put it in, each a line with its mend (#394): "core
// archive N" would lead to either, or the index to the wrong file. Of two, the one outside its key's file moves, since
// the index already leads to the other, else the later; in the reasoning it takes a key of its issue (#744), in the
// words the number its reasoning has.
function outOfPlace(root, r, w) {
  const wrong = [];
  const file = (folder, n) => fileOf(root, folder, n) ?? `no file of ${folder}/, since none starts at or below ${n}`;
  for (const [folder, form] of [[REASONS, r], [WORDS, w]]) for (const [n, at] of form.places) {
    const astray = at.filter(x => x.file !== fileOf(root, folder, n)), moves = astray.length && astray.length < at.length ? astray[0] : at.at(-1);
    const rekey = () => folder !== REASONS ? `the number its reasoning has in ${REASONS}/`
      : typeof n === "string" ? `a key of its own, "${n.split(".")[0]}.P" by the one point P of the issue it records, or join the two into one item`
        : `a key by the issue that carries its owner's word, "#N", in a file of its own, ${REASONS}/issue-N.md, and change each "core archive ${n}" that means it, in ${FILE_LIST} too`;
    if (at.length > 1) wrong.push(`${folder}: item ${n} stands ${at.length === 2 ? "twice" : `${at.length} times`}, at ${at.map(x => x.at).join(" and ")}. Mend: give the one at ${moves.at} ${rekey()}`);
    else if (astray.length) wrong.push(`${at[0].at}: item ${n} stands outside ${file(folder, n)}, the file its key puts it in. Mend: move it there${folder === REASONS && typeof n === "number" ? `, or give it ${rekey()}` : ""}`);
  }
  return wrong;
}

// Each of items 1 to `last` taken out of the reasoning, a line with its mend. An archive with no numbered item at all, as
// in a scratch project, is no archive whose items were taken out.
function missing(r, last) {
  if (![...r.items.keys()].some(Number.isInteger)) return [];
  const wrong = [];
  for (let n = 1; n <= last; n++) if (!r.items.has(n)) wrong.push(`${REASONS}: item ${n} is missing, though items 1 to ${last} keep their numbers. Mend: put it back where it stood (git log -p -- ${REASONS}/ shows it); an item is never taken out`);
  return wrong;
}

// Each "Changes:" whose item is not marked back, each "Changed by:" with no "Changes:" to match, a key in either that
// is no item of the archive, and a mark not in its form, a line with its mend (#756, point 3).
function unmarked(r) {
  const wrong = [], marks = new Map([...r.items].map(([n, it]) => [n, marksOf(it.text)]));
  const FORM = `write one line "Changes: <keys>." on the item that changes others and one "Changed by: <keys>." on each it changes, each below the item's opening line, the keys as the archive writes them (98, #744, #733.1), joined by ", "`;
  for (const [n, m] of marks) {
    const file = r.items.get(n).file;
    for (const line of m.wrong) wrong.push(`${file}: item ${n} has the line ${JSON.stringify(line)}, a mark not in its form or given twice. Mend: ${FORM}`);
    for (const e of m.changes) {
      if (e === n || !marks.has(e)) wrong.push(`${file}: item ${n} says it changes ${e}, which is ${e === n ? "itself" : "no item of the archive"}. Mend: name the earlier item it changes by its key, or take ${e} out of its line "Changes:"`);
      else if (!marks.get(e).changedBy.includes(n)) wrong.push(`${file}: item ${n} changes item ${e}, which is not marked so. Mend: give item ${e}, in ${r.items.get(e).file}, the line "Changed by: ${[...marks.get(e).changedBy, n].join(", ")}." in place of any it has, its text otherwise as it stands`);
    }
    for (const e of m.changedBy) {
      if (!marks.has(e)) wrong.push(`${file}: item ${n} says ${e} changed it, which is no item of the archive. Mend: take ${e} out of its line "Changed by:"`);
      else if (!marks.get(e).changes.includes(n)) wrong.push(`${file}: item ${n} says item ${e} changed it, but item ${e} names no change of it. Mend: give item ${e}, in ${r.items.get(e).file}, the line "Changes: ${[...marks.get(e).changes, n].join(", ")}." in place of any it has, or take ${e} out of this item's line "Changed by:" where it changed nothing of it`);
    }
  }
  return wrong;
}

// What keeps the two forms out of step, each a line with its mend: an empty list where they are in step. `last` is the
// last numbered item, LAST_NUMBERED but in a test.
export function inStep(root, last = LAST_NUMBERED) {
  const r = itemsIn(root, REASONS), w = itemsIn(root, WORDS), wrong = [];
  wrong.push(...outOfPlace(root, r, w));
  for (const [n, it] of w.items) if (typeof n === "string" || n > LAST_WORDS) wrong.push(`${it.file}: item ${n} adds the owner's words here, where nothing is added after item ${LAST_WORDS}. Mend: take it out of ${WORDS}/ and write it in ${REASONS}/ alone, naming the issue that holds the words`);
  for (const [n, it] of w.items) if (!r.items.has(n)) wrong.push(`${it.file}: item ${n} has no reasoning under its number in ${REASONS}/. Mend: write it there, in the core's words, with what was asked, what was decided and what it stands behind (\`archive/instructions.md\`)`);
  wrong.push(...missing(r, last));
  wrong.push(...unmarked(r));
  for (const [n, it] of r.items) {
    if (typeof n === "number" && n > last) wrong.push(`${it.file}: item ${n} is keyed by a running number, a key that names no issue, where items after ${last} are keyed by their issue (#744). Mend: key it "#N" by the issue that carries the owner's word, or "#N.P" by the one point of it the item records, move it to a file of its own, ${REASONS}/issue-N.md or issue-N.P.md, and write that key for ${n} under "behind" in ${FILE_LIST}`);
    if (/^\s*>/mu.test(it.text)) wrong.push(`${it.file}: item ${n} quotes (a line opening with ">"). Mend: say in the core's own words what was decided; the owner's words stay on the issue`);
    if (w.items.has(n) && !/\bDecided:/u.test(it.text)) wrong.push(`${it.file}: item ${n} does not say what was decided. Mend: add "Decided:" and what the owner decided, in plain words`);
    if (!w.items.has(n) && !/#\d+/u.test(it.text)) wrong.push(`${it.file}: item ${n} names no issue. Mend: name the issue that holds the owner's word ("#N"), as \`archive/instructions.md\` says a new item does`);
  }
  return wrong;
}
