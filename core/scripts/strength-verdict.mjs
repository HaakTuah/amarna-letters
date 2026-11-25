// The verdict on a run of the strength check (scripts/strength.mjs; tasks/code-shape.md, "How strong the tests are";
// #253, #920): the baseline's entries by kind (kindOf, totals), the lines a change left alone that are measured as well
// (needed, watched, again) and the survivors the baseline cannot hold, with what the check says and whether it fails
// (unlisted, unsure, undercut, joinedUnsaid, verdict). The report it reads is strength-report.mjs; where the tool is run
// is strength.mjs.
import { SURVIVED, collapse, counted } from "./strength-report.mjs";

// An id's parts: its file, its line's text, what became what ("[<original> -> <replacement>]") and the original, less
// the mark of a cut. A line's text may hold " [" itself: the split taken is the first whose rest reads as what became
// what and whose original the line holds, else the last that reads so.
const partsOf = id => {
  const m = /^survivor: (.+?): (.*)$/su.exec(id), splits = [];
  for (let i = m ? m[2].indexOf(" [") : -1; i >= 0; i = m[2].indexOf(" [", i + 1)) {
    const what = m[2].slice(i + 1), o = /^\[(.*?) -> .*\]$/su.exec(what);
    if (o) splits.push({ file: m[1], line: m[2].slice(0, i), what, original: o[1].replace(/…$/u, "") });
  }
  return splits.find(s => s.line.includes(s.original)) ?? splits.at(-1) ?? null;
};

// A fault's kind: its file and what became what, whatever line it stands on. The baseline is read by kind: how many of
// each fault a file holds, so that debt which only moved (a line rewritten, one copy of a repeated line, a line moved
// to another) stays listed, whatever id it is listed under.
export const kindOf = id => { const p = partsOf(id); return p ? `${p.file}\n${p.what}` : id; };

// What a baseline lists of each kind (`listedMap`, id to { count }), and how many faults of each kind a run found.
export const totals = listedMap => [...listedMap].reduce((t, [id, n]) => t.set(kindOf(id), (t.get(kindOf(id)) ?? 0) + (n.count ?? 0)), new Map());
const tally = faults => faults.reduce((t, f) => t.set(kindOf(f.id), (t.get(kindOf(f.id)) ?? 0) + 1), new Map());
// What the lines a change left alone hold: those found surviving (`known`), a fault the tool left unrun there counting
// as caught, as one on a changed line does, so that a budget that runs out turns no rewrite red (unsure() says so);
// and, where a pull request lowers a kind (undercut(), movedOut()), those not known to be caught (`holding`), since
// only debt measured gone may leave the list.
const known = still => still.filter(f => SURVIVED.includes(f.status));
const holding = still => still.filter(f => [...SURVIVED, "Pending"].includes(f.status));
const whatOf = kind => kind.slice(kind.lastIndexOf("\n") + 1);

// The listed ids whose kind the lines a change left alone must be measured for: a kind of which a survivor stands on a
// changed line and the baseline (`now`) lists some, and one the baseline lists fewer of than the base (`was`) did,
// unless the pull request records a new whole run (`recorded`). The rest need no measure: a kind it lists none of
// fails whatever stands elsewhere, and one it neither adds to nor lowers cannot grow.
export function needed(faults, now, was, recorded = false) {
  const mine = new Set(faults.filter(f => SURVIVED.includes(f.status)).map(f => kindOf(f.id)));
  const nowT = totals(now.listed), wasT = was && !recorded ? totals(was.listed) : new Map();
  const want = k => (mine.has(k) && (nowT.get(k) ?? 0) > 0) || (nowT.get(k) ?? 0) < (wasT.get(k) ?? 0);
  return [...new Set([...now.listed.keys(), ...(was?.listed.keys() ?? [])])].filter(id => want(kindOf(id)));
}

// The lines a change left alone that could hold a fault of those ids' kinds (`texts`, a function of a file to its text;
// `changed`, a Map of file to the Set of changed lines): each line whose text holds the kind's original, wherever it
// stands in the file. A Map of file to a Set of lines, on which the tool is run so that what they hold is measured,
// never guessed.
export function watched(ids, texts, changed) {
  const originals = new Map(), out = new Map();
  for (const p of ids.map(partsOf).filter(Boolean)) originals.set(p.file, [...(originals.get(p.file) ?? []), p.original]);
  for (const [file, wants] of originals) {
    const lines = (texts(file) ?? "").split(/\r?\n/u).map((l, i) => [collapse(l, Infinity), i + 1]);
    const held = lines.filter(([l, n]) => l && !changed.get(file)?.has(n) && wants.some(o => l.includes(o))).map(([, n]) => n);
    if (held.length) out.set(file, new Set(held));
  }
  return out;
}

// The survivors on the changed lines that the baseline cannot hold: of each kind, those on the changed lines (`faults`)
// and what the lines left alone hold (`still`, the faults found on watched()) may not pass what the baseline lists of
// it. Those past it fail, a survivor of an id the baseline lists last; one of each id.
export function unlisted(faults, listedMap, still = []) {
  const total = totals(listedMap), held = tally(known(still)), mine = new Map();
  const order = faults.filter(f => SURVIVED.includes(f.status)).sort((a, b) => Number(!listedMap.has(a.id)) - Number(!listedMap.has(b.id)));
  for (const f of order) mine.set(kindOf(f.id), [...(mine.get(kindOf(f.id)) ?? []), f]);
  const over = [...mine].flatMap(([k, all]) => all.slice(Math.max(0, (total.get(k) ?? 0) - (held.get(k) ?? 0))));
  return over.filter((f, i, all) => all.findIndex(g => g.id === f.id) === i);
}

// The kinds whose survivors on the changed lines pass only because faults on the lines left alone were not run: not
// measured, and said so. Each [kind, how many not run].
export function unsure(faults, listedMap, still = []) {
  const run = unlisted(faults, listedMap, still), strict = unlisted(faults, listedMap, holding(still).map(f => ({ ...f, status: "Survived" })));
  const kinds = new Set(strict.map(f => kindOf(f.id)).filter(k => !run.some(f => kindOf(f.id) === k)));
  return [...kinds].map(k => [k, still.filter(f => f.status === "Pending" && kindOf(f.id) === k).length]);
}

// The kinds a pull request's baseline (`now`) lists fewer of than the base (`was`) did, below what the lines it left
// alone may still hold (`still`, a fault not run counting as held): [{ kind, listed, before, held, unrun }], `unrun`
// the faults among those held that the tool did not run (its budget). Debt dropped from the list while it survives
// would turn the change that next moves it red.
export function undercut(now, was, still = []) {
  if (!was) return [];
  const nowT = totals(now.listed), held = tally(holding(still)), unrun = tally(still.filter(f => f.status === "Pending"));
  return [...totals(was.listed)].filter(([k, n]) => (nowT.get(k) ?? 0) < n && (held.get(k) ?? 0) > (nowT.get(k) ?? 0))
    .map(([k, before]) => ({ kind: k, listed: nowT.get(k) ?? 0, before, held: held.get(k), unrun: unrun.get(k) ?? 0 }));
}

// What the lines a change left alone hold (`still`), once the tool is run a second time, with a budget of its own, on
// only the lines whose faults the first run left unrun (`measure`, a Map of file to a Set of lines to the faults found
// there), so a survivor on a changed line is seldom passed, and an entry seldom held, for want of a run (#408). Fault by
// fault, by the whole of it (its place from start to end, what put it in and what it became, uncut): one the first run
// left unrun takes the second run's verdict on that same fault, those alike taken in the report's order; any the first
// run judged keeps its verdict, and none is counted twice. Where the lines left unrun are all those on which the first
// run found any fault (`first`, a Map of file to a Set), a second run would face the same queue, and none is made.
const spot = f => JSON.stringify([f.file, f.line, f.column, f.end, f.mutatorName, f.replacement, f.id]);
export function again(still, measure, first) {
  const unrun = still.filter(f => f.status === "Pending");
  if (!unrun.length) return still;
  const lines = new Map();
  for (const f of unrun) lines.set(f.file, (lines.get(f.file) ?? new Set()).add(f.line));
  const count = m => [...m.values()].reduce((n, at) => n + at.size, 0);
  if (count(lines) >= count(first)) return still;
  const judged = new Map();
  for (const g of measure(lines).filter(g => g.status !== "Pending")) judged.set(spot(g), [...(judged.get(spot(g)) ?? []), g]);
  return still.map(f => (f.status === "Pending" ? judged.get(spot(f))?.shift() ?? f : f));
}

// Of the entries a pull request that records a new whole run lists anew or above the base, those whose line stands
// nowhere in its file as it is (`texts`), or whose count passes what the file can hold (room()): no run could have
// found them, so the whole run's exception holds them not.
function invented(now, was, texts) {
  return [...now.listed].filter(([id, n]) => {
    const parts = partsOf(id), text = parts && texts(parts.file);
    if ((n.count ?? 0) <= (was.listed.get(id)?.count ?? 0) || (now.grown[id] ?? "").trim()) return false;
    return !parts || !text || (n.count ?? 0) > room(parts, text);
  }).map(([id]) => id);
}

// How many faults of an entry's kind its file can hold: for each line of the entry's text, as often as the replaced
// text stands in it, at least once; none where no such line stands.
function room(parts, text) {
  return text.split(/\r?\n/u).filter(l => collapse(l, 100) === parts.line).reduce((n, l) => n + Math.max(1, parts.original ? collapse(l, Infinity).split(parts.original).length - 1 : 1), 0);
}

// Whether the pull request records a new whole run: it changes no file of code or of the tests (`touched` false), and
// its baseline's stamp is not the base's.
export const recordsWhole = (now, was, touched) => Boolean(was) && !touched && JSON.stringify(now?.whole ?? null) !== JSON.stringify(was.whole ?? null);

// Of each fault (what became what), how many a pull request lowered in a file and is measured no longer to hold there
// (`still`, a fault not run counting as held): debt that left its file, as in a split, which another file may take up.
function movedOut(now, was, still) {
  const nowT = totals(now.listed), held = tally(holding(still)), out = new Map();
  for (const [k, n] of totals(was.listed)) {
    const drop = n - Math.max(nowT.get(k) ?? 0, held.get(k) ?? 0);
    if (drop > 0) out.set(whatOf(k), (out.get(whatOf(k)) ?? 0) + drop);
  }
  return out;
}

// The entries that joined the baseline since the base with no reason under "grown": [id]. None counts where the base
// has no baseline (the first). Where the pull request records a new whole run (recordsWhole()), what the run found
// stood on the base, and only an entry no run could have found counts (invented()). Else a kind's total may not grow
// past the base's but by the entries of it that grew with a reason, and by debt of the same fault that left another
// file (movedOut()), up to what the run found of it in this one (`found`: the survivors of the changed lines and of
// those left alone); where it does, those that grew with none count.
export function joinedUnsaid(now, was, touched = true, texts = () => null, found = [], still = []) {
  if (!was) return [];
  if (recordsWhole(now, was, touched)) return invented(now, was, texts);
  const wasT = totals(was.listed), grew = id => (now.listed.get(id)?.count ?? 0) - (was.listed.get(id)?.count ?? 0);
  const said = id => Boolean((now.grown[id] ?? "").trim()), pool = movedOut(now, was, still), seen = tally(known(found));
  return [...totals(now.listed)].flatMap(([k, n]) => {
    const ids = [...now.listed.keys()].filter(id => kindOf(id) === k && grew(id) > 0);
    const over = n - (wasT.get(k) ?? 0) - ids.filter(said).reduce((s, id) => s + grew(id), 0);
    const moved = Math.max(0, Math.min(over, pool.get(whatOf(k)) ?? 0, (seen.get(k) ?? 0) - (wasT.get(k) ?? 0)));
    pool.set(whatOf(k), (pool.get(whatOf(k)) ?? 0) - moved);
    return over - moved > 0 ? ids.filter(id => !said(id)) : [];
  });
}

const placed = f => `${f.file}:${f.line}`;
const said = f => `${f.mutatorName}: "${collapse(f.original, 40)}" ${f.replacement === "" ? "taken out" : `made "${collapse(f.replacement, 40)}"`}`;

// What the check says of a pull request's run, and whether it fails: { lines, fails }.
// `faults` are those of the changed lines; `still`, those watched() found on the lines the change left alone.
export function verdict({ faults, still = [], baseline, was, at, deleted, touched = true, texts = () => null }) {
  const c = counted(faults), lines = [`How strong the tests are, on the lines this pull request changes: ${c.line}.`];
  for (const t of deleted) lines.push(`A test file this pull request deletes: ${t}. Its description says why, under "Readings taken", and the review checks it.`);
  if (!baseline && was) {
    lines.push(`FAIL: ${at} stood on the base and this pull request takes it out. Mend: take it back as the base holds it (git checkout <the base> -- ${at}); only the audit's whole run writes it anew`);
    return { lines, fails: true };
  }
  if (!baseline) {
    lines.push(...faults.filter(f => SURVIVED.includes(f.status)).map(f => `survived: ${placed(f)}: ${said(f)}, and ${f.status === "NoCoverage" ? "no test runs that line" : "no test failed"}`));
    lines.push(`Reported only: there is no baseline at ${at} yet. The audit's whole run writes it (node core/scripts/strength.mjs --whole), and from then on a fault that survives on a changed line fails.`);
    return { lines, fails: false };
  }
  const news = unlisted(faults, baseline.listed, still), unsaid = joinedUnsaid(baseline, was, touched, texts, [...faults, ...still], still), cut = undercut(baseline, was, still);
  const unrun = still.filter(f => f.status === "Pending").length;
  if (c.pending) lines.push(`${c.pending} faults on the changed lines were not run (the tool's budget): they are not held here, and the next whole run reads them.`);
  if (unrun) lines.push(`${unrun} faults on lines this pull request left alone, of a kind it adds to or lowers, were not run (the tool's budget), even in a second run on their lines alone: a survivor on a changed line is not failed for them, and an entry is not lowered past them.`);
  for (const [k, n] of unsure(faults, baseline.listed, still)) lines.push(`Not measured: the fault ${k.split("\n").reverse().join(" in ")} survives on a changed line, and whether that adds to its debt turns on ${n} faults not run on lines this pull request left alone. The pull request says so under "Readings taken", and the next whole run reads it.`);
  for (const f of news) lines.push(`FAIL: ${placed(f)}: a fault put in on purpose (${said(f)}) survived, past what ${at} lists of that fault in ${f.file} with what the lines this pull request left alone still hold. Mend: write a test that fails on it, one that runs with no network where the run cuts it off (a test that reaches the network is left out of the run as failing, and catches nothing here), and run the check again; where the fault only moved here from another file this pull request changes (a split), list "${f.id}" in ${at} under "listed" and that fault as many fewer in the file it left; only where the fault changes nothing the program does, list "${f.id}" in ${at} under "listed" with its count and under "grown" with that reason, say so in the pull request, and have a fresh session say there that it found no other way`);
  for (const id of unsaid) lines.push(`FAIL: ${at} lists "${id}" where the base did not, with no reason under "grown". Mend: take it out and write a test that catches the fault; where the fault only moved from another file this pull request changes, list it there as many fewer; or give its reason under "grown" (the fault changes nothing the program does), say so in the pull request, and have a fresh session say there that it found no other way`);
  for (const k of cut) lines.push(`FAIL: ${at} lists ${k.listed} of the fault ${k.kind.split("\n").reverse().join(" in ")}, where the base listed ${k.before}, and ${k.held} still survive on lines this pull request left alone${k.unrun ? `, ${k.unrun} of them faults the tool did not run (its budget), counted as surviving` : ""}. Mend: ${k.unrun ? "where the debt only moved (a split), raise the tool's budget where the check runs (for the core's mutate.mjs or stryker.mjs, MUTATE_BUDGET in the step of the workflow that runs the check, a change to a workflow with its two security reviews; else the budget the row's command sets) and run it again, so the faults not run are measured and those caught leave the count; else " : ""}list them again as the base did (a cleaning run, node core/scripts/strength.mjs --lower <file>, lowers an entry only to what still survives), or first write the tests that catch them`);
  return { lines, fails: news.length + unsaid.length + cut.length > 0 };
}

// The baseline's entries lowered by a run of `files` (`now`, each surviving id to its count): of each kind of those
// files, the ids that survive now, those it listed first, up to what it listed of the kind, so that debt which only
// moved keeps its place and debt whose fault no longer survives goes; an entry of another file stays as it was. A Map
// of id to count; nothing joins, and no kind's total grows.
export function lowered(listedMap, now, files) {
  const ours = id => files.some(f => id.startsWith(`survivor: ${f}: `)), room = totals(new Map([...listedMap].filter(([id]) => ours(id))));
  const out = new Map([...listedMap].filter(([id, n]) => !ours(id) && (n.count ?? 0) > 0).map(([id, n]) => [id, n.count]));
  for (const [id, c] of [...now].filter(([id]) => ours(id)).sort(([a], [b]) => Number(!listedMap.has(a)) - Number(!listedMap.has(b)))) {
    const take = Math.min(c, room.get(kindOf(id)) ?? 0);
    if (take > 0) { out.set(id, take); room.set(kindOf(id), room.get(kindOf(id)) - take); }
  }
  return out;
}
