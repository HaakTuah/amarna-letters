// The scheduled look's readers of the records of the choices that are hard to undo (choices.mjs, which prints what they
// read; split from it, #912): whether the pass over them, twice a year, is due (`look`), and whether a sign written in a
// measure has tripped (`signs`), reading the measures from what the shape check reads (dose.mjs, reading()). They
// compare numbers and never run anything a records file says (choices-records.mjs). The scheduled look (look.mjs,
// beside this file) keeps one issue open while the pass is due, and one while a condition holds. A session that takes
// either issue runs choices.mjs to find again what stands, and writes the day on the line "Read whole:" once its pass
// is done. Node's own modules.
import fs from "node:fs";
import path from "node:path";
import { reading, rulesOf } from "./dose.mjs";
import { MEASURES, OPS, parse, plain, records } from "./choices-records.mjs";

export const TITLE = "Choices to read again";
// The issue of the signs written in a measure: one that holds, or a line "Trips when:" that names no measure.
export const TRIPPED = "A choice's measured sign to act on";
// The most conditions, and records naming no measure, its issue lists one by one.
export const LISTED = 30;
// Twice a year: the pass is due once the day on the line "Read whole:" is this many days old.
export const DAYS = 182;

// Whole days from a day (2026-11-15) to a time.
const daysSince = (day, at) => Math.floor((Date.parse(at) - Date.parse(`${day}T00:00:00Z`)) / 86400000);

// Why the pass is due, as one line, or null where it is not: no record yet, or the last pass less than DAYS ago.
export function due(found, at) {
  if (!found.records.length) return null;
  if (!found.read) return "its line \"Read whole:\" holds no day, so no pass is known";
  const days = daysSince(found.read, at);
  return days >= DAYS ? `its line "Read whole:" says ${found.read}, ${days} days before ${at.slice(0, 10)}` : null;
}

// (a number as shown: whole, or to three places; the comparison takes it exact)
const figure = n => String(Math.round(n * 1000) / 1000);
const shown = text => `\`${plain(text).replace(/`/gu, "'")}\``;

// The scheduled look's reader (look.mjs, DUE): the pass's issue, its body null where nothing is due, so the look closes
// one it keeps; `unread` where the records could not be read, so it leaves that issue as it stands.
export function look({ manifest, at, root = "." }) {
  const { rules, home } = rulesOf(manifest, root);
  const got = records(rules, root);
  if (got.unread) return { title: TITLE, body: null, unread: got.unread };
  if (got.text === null) return { title: TITLE, body: null };
  const found = parse(got.text), why = due(found, at);
  if (!why) return { title: TITLE, body: null };
  const unsigned = found.records.filter(r => !r.sign).length, unknown = found.records.filter(r => r.unknown.length).length;
  return { title: TITLE, body: `The pass over the choices that are hard to undo is due (\`${home}tasks/choices.md\`, "What reopens a choice"): \`${got.file}\` holds ${found.records.length} records, and ${why}; the pass falls ${DAYS} days after the last.${unsigned ? ` ${unsigned} of them name no sign on a line "Reopens it:".` : ""}${unknown ? ` ${unknown} of them hold, on their line "Trips when:", what names no measure the look reads.` : ""} A fresh reader goes through each record as that rule says, files an issue for the owner, labelled needs-owner, for each choice whose sign has tripped or for which a plainly better option exists now, save one the issue \"${TRIPPED}\" already names, and writes the day of its pass on that line, in a pull request of its own. \`node ${home}scripts/choices.mjs\` lists the records.${!home && fs.existsSync(path.join(root, "INVENTORY.md")) ? ` In the core, the same reader asks of each part \`INVENTORY.md\` marks keep or try whether something maintained now does it, and writes the day on its line "Weighed whole:" (\`AGENTS.md\`, "A part is asked again").` : ""}` };
}

// Each condition of the records that holds today, with the number read: [{ name, measure, op, limit, value }].
export const tripped = (found, r) => found.records.flatMap(rec => rec.conditions.map(c => ({ name: rec.name, ...c, value: MEASURES[c.measure][1](r) })))
  .filter(c => OPS[c.op](c.value, c.limit));

// The measured signs as the look reads them: the records, the dose's reading, and `unread` where either cannot be read.
function measuredSigns(manifest, root) {
  const { rules, home } = rulesOf(manifest, root);
  const got = records(rules, root);
  if (got.unread) return { unread: got.unread };
  const found = parse(got.text ?? "");
  if (!found.records.some(rec => rec.conditions.length)) return { got, found, home, r: null };
  let r;
  try { r = reading(rules, root); } catch (e) { return { unread: `the shape check could not be read (${String(e.message).split(". Mend: ")[0]})` }; }
  if (!r) return { unread: "a record names a measure, and the shape check has no config here to read it from" };
  // (a project whose code the shape check does not read, in another language, would read 0 and never trip)
  return r.found.read.files > 0 ? { got, found, home, r } : { unread: "a record names a measure, and the shape check reads no file of code here" };
}

// The text of the issue of the signs written in a measure: each condition that holds, each line that names no measure,
// and what its session does about each.
export function trippedBody(file, held, found, home) {
  const unknown = found.records.filter(rec => rec.unknown.length);
  // (a few lines each, and three of a record's unknown conditions, the rest counted, so the body stays under 30 000
  // characters, far under GitHub's limit of 65 536, however many a file of MOST bytes holds)
  const some = (list, line) => [...list.slice(0, LISTED).map(line), ...(list.length > LISTED ? [`- and ${list.length - LISTED} more: \`node ${home}scripts/choices.mjs\` lists them`] : [])];
  const rule = `\`${home}tasks/choices.md\`, "What reopens a choice"`;
  return [...(held.length ? [`A choice's sign, written in a measure the shape check keeps, holds today in \`${file}\` (${rule}):`,
    ...some(held, c => `- ${shown(c.name)}: \`${c.measure} ${c.op} ${c.limit}\`, and it reads ${figure(c.value)} ${MEASURES[c.measure][0]}.`), ""] : []),
  ...(unknown.length ? [`A line "Trips when:" in \`${file}\` names what is no measure the look reads, so that sign is not read (${rule}; the measures: ${Object.keys(MEASURES).join(", ")}):`,
    ...some(unknown, rec => `- ${shown(rec.name)}: ${rec.unknown.slice(0, 3).map(shown).join(", ")}${rec.unknown.length > 3 ? `, and ${rec.unknown.length - 3} more` : ""}`), ""] : []),
  [held.length ? "A session takes this issue: for each choice whose sign holds, it writes in a comment here a fresh record that compares the options, staying as it is among them, with the gain and what the move would cost, and labels this issue needs-owner in place of queued; no session makes the choice. Where the owner keeps it, the session that acts on the answer writes its sign anew in a pull request." : "",
    unknown.length ? "Each line that names no measure is mended in a pull request: to a measure the look reads, or taken out where the sign is none a check keeps." : "",
    `This issue closes on the look's next run once nothing above stands, and opens again as queued if something comes back. \`node ${home}scripts/choices.mjs\` reads the signs as they stand.`].filter(Boolean).join(" ")].join("\n");
}

// What a line of that issue's lists stands for, apart from the numbers read today: a choice and its condition, or a
// choice and what names no measure; null for the count of the rest. The look compares these (look-keep.mjs, updating), so a
// number that moves changes nothing, and a choice the issue did not name before puts it back to queued.
const READS = ", and it reads ";
export const signKey = line => (line.startsWith("- and ") ? null : line.includes(READS) ? line.slice(0, line.indexOf(READS)) : line);

// The scheduled look's reader of the signs written in a measure (look.mjs, DUE): its issue's body null where none
// holds and every line "Trips when:" names measures alone, so the look closes one it keeps; `unread` where the records
// or the measures could not be read; `requeue`, the key of each line of its lists (signKey).
export function signs({ manifest, root = "." }) {
  const s = measuredSigns(manifest, root);
  if (s.unread) return { title: TRIPPED, body: null, unread: s.unread };
  const held = s.r ? tripped(s.found, s.r) : [];
  const stands = held.length || s.found.records.some(rec => rec.unknown.length);
  return { title: TRIPPED, body: stands ? trippedBody(s.got.file, held, s.found, s.home) : null, requeue: signKey };
}

// One record as the script prints it: its name, whether it names its sign, and each condition of its line "Trips
// when:" with the number read (`r`, the dose's reading; a string where the measures could not be read).
function recordLine(rec, r) {
  const read = c => (typeof r === "string" ? `${c.measure} ${c.op} ${c.limit} (${r})` : `${c.measure} ${c.op} ${c.limit} (${figure(MEASURES[c.measure][1](r))} now${OPS[c.op](MEASURES[c.measure][1](r), c.limit) ? ": it holds" : ""})`);
  return [`- ${rec.name}${rec.sign ? "" : ": names no sign on a line \"Reopens it:\""}`,
    ...(rec.lacks.length ? [`  argued on no line that opens ${rec.lacks.map(l => `"${l}"`).join(", ")}`] : []),
    ...(rec.conditions.length ? [`  trips when: ${rec.conditions.map(read).join("; ")}`] : []),
    ...(rec.unknown.length ? [`  names no measure this reads, on its line "Trips when:": ${rec.unknown.map(shown).join(", ")} (the measures: ${Object.keys(MEASURES).join(", ")})`] : [])];
}

// What the script prints: each record, and whether the pass is due.
export function report(got, at, r = "the measures were not read") {
  if (got.unread) return `The choice records could not be read: ${got.unread}.`;
  if (got.text === null) return `No choice records at \`${got.file}\` yet: a project records there each choice that is hard to undo (tasks/choices.md).`;
  const found = parse(got.text), why = due(found, at);
  return [`\`${got.file}\`: ${found.records.length} records${found.read ? `, read whole on ${found.read}` : ""}${found.open ? `, ${found.open} lines still marked FILL IN` : ""}.`,
    ...found.records.flatMap(rec => recordLine(rec, r)),
    why ? `The pass over them is due: ${why}.` : found.records.length ? `The pass over them is not due until ${DAYS} days after ${found.read}.` : "No record yet, so no pass is due."].join("\n");
}
