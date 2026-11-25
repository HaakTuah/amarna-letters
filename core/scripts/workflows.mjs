// The workflow check (floor rule 2, floor/topics/workflows.md), for every project that takes the core, on every PR: it fails a
// workflow (.github/workflows/), or an action of the project's own (an action.yml anywhere in it, or any YAML file
// under .github/actions/), in which the word pull_request_target stands anywhere at all, a comment included. It searches the
// whole text for the word and reads no YAML for it, so no way of writing a key, a comment or a line break hides it; the two
// ways YAML has of spelling a word otherwise are undone first: an escape (\x, \u, \U) is read as what it spells, and
// a word broken over lines by an escaped line break is joined. A file the check cannot read as the project's own
// UTF-8 text fails too: a link (and any link in .github, where a linked folder would hold workflows the check never
// sees), and a file in another encoding, in which the word would stand unseen. A comment or a script that needs to
// speak of the trigger calls it something else.
// It runs, as well, two maintained tools on each such file (workflow-tools.mjs, beside this file; #580): zizmor, which
// audits it for the rest of rule 2 and more (untrusted text in a script, an action not pinned, a token kept past its
// step), and actionlint, which reads it as GitHub does, refusing a key given twice in one mapping, which GitHub's reader
// refuses, running none of the file's jobs (#393), whatever line break or spelling hides it, and an expression that
// names what does not exist; each with the core's policy as its config, fetched at set-up and never in a session
// (workflow-tools.sh), and where one was not fetched the check says it did not run and decides nothing by it. Nothing
// locks a project (AGENTS.md of the core): with WORKFLOWS_BASE set to the pull request's base (as the copies workflow
// sets it), the tools run on the base's files too, and of each kind of finding in a file as many as the base held are
// noted and fail nothing; with no base, as on a push to main, each is noted. In the core's own repository (`--core`)
// each fails.
// It fails, too, a call to one of the core's pull-request checks that is skipped on a draft while its pull_request
// trigger leaves out ready_for_review (floor rule 8, a weakened check; #375, #502): its job's if: names the draft, or the
// check skips a draft by itself (the description check, called on its own or by core.yml's `description:`). Once such a
// pull request is marked ready, the call runs on no head, and a ruleset counts the draft's skip as passed. As with the
// tools' findings, a call the base's same file already held so is noted, each is noted with no base, and the sync's step "16
// November 2026, checks once a pull request is ready" (steps.mjs, which reads it by draftHoles() below) names it.
// In the core's own repository (`--core`) it also fails a file the core's own YAML reader cannot read at all (#994).
// And a line break that YAML 1.1 reads and the YAML package does not (U+0085, U+2028, U+2029: #872): a key given twice,
// or a call left without ready_for_review, placed after one is not found by the package's reader, while a YAML 1.1
// reader (YamlDotNet) reads it as a line end, so such a file fails where it is new or changed, and is noted where it is
// unchanged from the base or no base is told, as a key given twice is (foreignBreaks() below), and the sync's step "20
// November 2026, no workflow holds a line break the YAML package does not read" (steps.mjs) names each file with one.
// What stands behind such a break is read as a YAML 1.1 reader reads it, in the file and in the base alike: each of the
// three is read as an LF, as the sync step's mend leaves it (an escape inside a double-quoted string, a line feed
// elsewhere) and as it stands, whichever finds most, so a key given twice or a call left without ready_for_review
// behind one is found, noted where the base held it, and told on the line an editor counts (keysTwice() below; #876).
// A reading that is no YAML to the package leaves its keys out, each reading of a text is kept for the next reader, and a file's
// lines of one kind are cut at 25 with the rest counted (#970). Where the base's breaks alone leave it no YAML to the package in
// either reading (such as a break inside a single-quoted string whose next line is under-indented), what it held cannot be
// told, and what the changed file shows is noted, never failed (baseOf() below); a base no YAML for another reason is read as it stands.
// What it does not chase: a value given as binary (a YAML tag) holds a word no search can see, and a tag can itself be
// spelled in more ways than a search can follow. GitHub's own workflow reader refuses a binary value where a trigger
// belongs, so that is no way to write one; the reviews hold it, as they hold any odd tag in a workflow.
// Of the rest of rule 2, zizmor reads what it can; that every action is pinned is held as well by GitHub's own setting,
// which reads a workflow as GitHub runs it (README.md, "Setting up"); that workflow_run checks the run's head repository,
// by the reviews. The copy of the core (core/, or where the manifest names it) is checked in the
// core, which runs this on itself. Reads only; git, Node's own modules and the YAML package the core installs
// (packages.mjs), and the two tools. It checks the project it lies in, whatever the directory it is started from. Run by
// the copies workflow (.github/workflows/copies.yml), after its step that fetches the tools.
//
//   node core/scripts/workflows.mjs           from a project's root, as the copies workflow runs it
//   node scripts/workflows.mjs --core         in the core's own repository
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logged } from "./guards.mjs";
import { started } from "./started.mjs";
import { DEEPEST, LONGEST, pruned, twice } from "./yaml-keys.mjs";
import { didNotRun, installed, loadSync, unreached } from "./packages.mjs";
import { copyOf, projectAt } from "./core-path.mjs";
import { CORE } from "./core-address.mjs";
import { parseYaml } from "./parse-yaml.mjs";
import { compared, run } from "./workflow-tools.mjs";

const WORD = "pull_request_target";
const BREAK = "\\r\\n|[\\r\\n\\u0085\\u2028\\u2029]"; // every line break YAML 1.1 or 1.2 knows
// What is undone before the search, and what ends a line: an escaped line break with the blanks after it, an escape
// that spells a character, a line break.
const PIECES = new RegExp(`\\\\(?:${BREAK})[ \\t]*|\\\\(?:x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})|${BREAK}`, "gu");
const spelt = escape => { const code = parseInt(escape.slice(2), 16); return code <= 0x10ffff ? String.fromCodePoint(code) : escape; };

// The lines of one file's text on which the word stands, each as its number, once escapes are read as what they spell
// and words broken over lines are joined (a joined word counts for the line it ends on).
export function lines(text) {
  const out = [], starts = [[0, 1]]; // starts: where in the undone text each line of the file begins
  let length = 0, line = 1, i = 0;
  const add = piece => { out.push(piece); length += piece.length; };
  for (const m of text.matchAll(PIECES)) {
    add(text.slice(i, m.index));
    const piece = m[0];
    if (piece[0] !== "\\") add("\n");
    else if ("xuU".includes(piece[1])) add(spelt(piece));
    if (piece[0] !== "\\" || !"xuU".includes(piece[1])) starts.push([length, ++line]);
    i = m.index + piece.length;
  }
  add(text.slice(i));
  const undone = out.join(""), found = [];
  let s = 0;
  for (let at = undone.indexOf(WORD); at >= 0; at = undone.indexOf(WORD, at + 1)) {
    const end = at + WORD.length - 1;
    while (s + 1 < starts.length && starts[s + 1][0] <= end) s++;
    if (found.at(-1) !== starts[s][1]) found.push(starts[s][1]);
  }
  return found;
}

// Whether the text is one the search can trust: UTF-8 with no character that marks another encoding or bytes that are
// no text (a workflow in UTF-16 reads as letters with a zero byte between them, and the word is not found).
export const readable = text => !/[\0\ufffd]/u.test(text);

// The first line break of YAML 1.1 beyond LF, CR and CRLF in a text (U+0085, U+2028, U+2029), the YAML package not
// reading it as one: { line, code, count } with the line as an editor counts it (by LF), the character's code and how
// many there are in all; null where there is none (#872).
export function foreignBreaks(text) {
  let line = 1, first = null, count = 0;
  for (const m of String(text).matchAll(/\r\n?|\n|[\u0085\u2028\u2029]/gu)) {
    if (/[\r\n]/u.test(m[0])) { line++; continue; }
    count++;
    first ??= { line, code: `U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}` };
  }
  return first && { ...first, count };
}

// A text as a YAML 1.1 reader reads it: each of the three breaks an LF, as { text, line }, with `line` telling a line of
// that text as the line an editor counts (CR and CRLF end one, the three do not) (#876). A text with none is itself.
export function asLF(text) {
  text = String(text);
  if (text.length > LONGEST || !/[\u0085\u2028\u2029]/u.test(text)) return { text, line: n => n }; // (a text past the length read is not read: yaml-keys.mjs)
  text = text.replace(/\r\n?/gu, "\n"); // (as twice() does, a CR before a break its own line end, as YAML 1.1 reads them)
  const at = [0, 1];
  let editor = 1;
  for (const m of text.matchAll(/\n|[\u0085\u2028\u2029]/gu)) { if (m[0] === "\n") editor++; at.push(editor); }
  return { text: text.replace(/[\u0085\u2028\u2029]/gu, "\n"), line: n => at[n] ?? n };
}

// What a reader gives for a text, kept for the last few: the readers of one file (the key twice, the call a draft skips, the
// base and the head, the sync's steps) ask for the same text again, and a text with a break is lexed and parsed three ways
// each time (#970). The results are read, never changed.
function remember(read, keep = 8) {
  const seen = new Map();
  return text => {
    text = String(text);
    if (seen.has(text)) return seen.get(text);
    const got = read(text);
    if (seen.size >= keep) seen.delete(seen.keys().next().value);
    return seen.set(text, got).get(text);
  };
}

// A text as the mend of the sync step asks it be written: each break inside a double-quoted string its own escape (\\u2028),
// each other one a line feed, as { text, line } like asLF(); the text as asLF() gives it where the package's lexer cannot
// cut it exactly (#876).
export const asMended = remember(text => {
  text = String(text);
  if (text.length > LONGEST || !FOREIGN.test(text)) return { text, line: n => n };
  const norm = text.replace(/\r\n?/gu, "\n");
  try {
    const { Lexer } = loadSync("yaml");
    let out = "", joined = "", editor = 1;
    const at = [0, 1];
    for (const token of new Lexer().lex(norm)) {
      if (token.length === 1 && token < " " && token !== "\n" && token !== "\t") continue; // (the lexer's own marks, not the text)
      joined += token;
      const mended = mendedToken(token);
      out += mended.out;
      for (const ends of mended.ends) at.push(ends ? ++editor : editor);
    }
    return joined === norm && out.length <= LONGEST ? { text: out, line: n => at[n] ?? n } : asLF(text); // (an escape is longer than its break: a text it takes past the length read is read as line feeds)
  } catch { return asLF(text); }
});

// One token of the package's lexer as the mend leaves it: its text, and for each line feed of it whether it ends a line as an
// editor counts (a line feed the text held) or stands for a break an editor does not (#876).
function mendedToken(token) {
  let out = "";
  const ends = [];
  for (const ch of token) {
    if (ch === "\n") { out += ch; ends.push(true); }
    else if (!FOREIGN.test(ch)) out += ch;
    else if (token[0] === '"') out += `\\u${ch.codePointAt(0).toString(16).padStart(4, "0")}`;
    else { out += "\n"; ends.push(false); }
  }
  return { out, ends };
}

// A text with a break the package does not read, read each way a YAML 1.1 reader may: as line feeds, as the mend leaves it,
// and as it stands (#876).
const readings = text => [asLF(text), asMended(text), { text: String(text), line: n => n }];
const FOREIGN = /[\u0085\u2028\u2029]/u;

// The keys given twice in a text (yaml-keys.mjs, twice()) read as a YAML 1.1 reader reads its line breaks, each on the line an
// editor counts, and never fewer than the package reads in the text as it stands: of each key, whichever reading finds most
// (a break inside a quoted string, folded, may change what the package can read of the rest; #876). A reading that is no YAML
// to the package, once the breaks are folded or mended, where the text as it stands is, shows keys no reader has, so its
// entries are left out; the text as it stands is read as ever (#970). Where the text as it stands is no YAML either, every
// reading is kept, so a key that is not there may be named in a file that is refused all the same.
export const keysTwice = remember(text => {
  if (!FOREIGN.test(String(text))) return Object.freeze(twice(text).map(Object.freeze)); // (shared between the readers, so none can change it)
  const by = ({ text: read, line }) => {
    const groups = new Map();
    for (const found of twice(read)) {
      const id = found.key === null ? `${Boolean(found.size)}` : `k:${found.key}`;
      (groups.get(id) ?? groups.set(id, []).get(id)).push({ ...found, line: line(found.line), first: found.first === null ? null : line(found.first) });
    }
    return groups;
  };
  const [folded, mended, plain] = readings(text), seen = new Set([plain.text]);
  // (only where the text as it stands is YAML, so that the breaks are what spoil the reading: a file no YAML for another reason keeps them)
  const spoilt = r => yamlOf(plain.text) !== null && yamlOf(r.text) === null;
  const all = [folded, mended].filter(r => !seen.has(r.text) && seen.add(r.text) && !spoilt(r)).concat(plain).map(by);
  return Object.freeze([...new Set(all.flatMap(groups => [...groups.keys()]))].flatMap(id => all.map(groups => groups.get(id) ?? []).reduce((best, now) => (now.length > best.length ? now : best)))
    .sort((x, y) => x.line - y.line).map(Object.freeze)); // (shared between the readers, so none can change it)
});

// Whether a text with such a break is YAML the package reads once the breaks are read as a YAML 1.1 reader reads them, as line
// feeds or as the mend leaves them.
export const reads11 = text => String(text).length <= LONGEST && [asLF(text), asMended(text)].some(r => yamlOf(r.text) !== null);

// The files, each { file, text }, that hold such a break, as { fails, notes } of lines with their mend: `before` gives
// a file's text on the base, or is null where there is no base, when each is a note; a file the same as the base's is
// noted, one changed or new fails, since a count cannot show a change made nothing worse (#752).
export function foreignBroken(files, before) {
  const fails = [], notes = [];
  for (const { file, text } of files) {
    const found = foreignBreaks(text);
    if (!found) continue;
    const old = !before || before(file) === text;
    (old ? notes : fails).push(`${old ? "note" : "FAIL"} ${file}:${found.line}: the file holds the line break ${found.code}${found.count > 1 ? ` and ${found.count - 1} more` : ""}, which YAML 1.1 reads as a line end and the YAML package does not, so a reader of one kind sees the file otherwise than a reader of the other${old && before ? ", as on the base" : ""}. Mend: replace each with an ordinary line feed, or, inside a double-quoted string, with the escape of its own code (\\u0085, \\u2028 or \\u2029)`);
  }
  return { fails, notes };
}

// The files the check reads, of those git tracks: the project's own, the copy of the core aside, where its manifest names
// it (`copy`, core-path.mjs's copyOf; core/ where it names none).
export const reads = (files, copy = "core/") => files.filter(f => !f.startsWith(copy) && !f.split("/").includes("node_modules") &&
  (/^\.github\/(workflows\/[^/]+|actions\/.+)\.ya?ml$/iu.test(f) || /(^|\/)action\.ya?ml$/iu.test(f)));
// What may be no link, of those git tracks: what the check reads, and .github itself with everything in it.
export const unlinked = (files, copy) => { const read = new Set(reads(files, copy)); return files.filter(f => read.has(f) || /^\.github(\/|$)/iu.test(f)); };

// A file's text on the base, for what the base held (#752): `read`, the text the readers take, where the base's text is
// within the length read ("" where the base holds no such file); `same` where the base's text is past the length read
// and the file's is that text unchanged. A text past the length read is never given to the parser, and no count of its
// words can show that a change to it made nothing worse, so its breaches cannot be listed: a file unchanged from such a
// base is only noted, and a file changed from it is judged as one the base did not hold, each breach it shows failing,
// and the file itself where it is still past the length, the mend being to cut it under the length and mend what it
// then shows, in that pull request.
const baseOf = (before, file, text) => {
  const was = before ? before(file) ?? "" : null, long = was !== null && was.length > LONGEST;
  // `unknown`: the base holds a break the package does not read and is no YAML to it once the breaks are read as a YAML 1.1 reader reads them, so what it
  // held behind them cannot be told, and what the file now shows is noted, never failed (#876); but only where the breaks are
  // what stands in the way (breaksAlone() below). A base that is no YAML for another reason is read as it stands, as any other (#970).
  const read = was === null || long ? null : was;
  return { read, same: long && was === text, unknown: read !== null && read !== text && foreignBreaks(read) !== null && !reads11(read) && breaksAlone(read) };
};
const UNKNOWN = ", the base being no YAML to the package once its line breaks are read as YAML 1.1 reads them, so what it held is not known";

// The core's pull-request checks whose call may be skipped on a draft, and the two that skip a draft by themselves.
const CHECKS = /\/\.github\/workflows\/(core|copies|personal-terms|signatures|nuget|pr-description)\.yml@/i;
// The types a workflow's pull_request trigger lists, GitHub's own where it lists none or names the event alone (`on:
// pull_request`, `on: [push, pull_request]`), as []; null where it has no such trigger.
const typesOf = on => typeof on === "string" || Array.isArray(on) ? ([].concat(on).includes("pull_request") ? [] : null)
  : on && typeof on === "object" && "pull_request" in on ? [].concat(on.pull_request?.types ?? []).map(String) : null;
// A workflow's text read as YAML by the package the core installs (as yaml-keys.mjs reads it, its tokens pruned past
// DEEPEST alike; flow mappings and every form GitHub reads), every scalar as text; null where it is no YAML, which
// GitHub's own reader refuses all the same. A pair whose key is a list or a mapping is left out before the read, since
// `toJS` writes such a key out as text, which takes ever longer the deeper it nests (a few hundred `? ` marks ran for
// minutes: #837), and the keys read here are plain words.
const yamlOf = remember(text => {
  const { Composer, Parser, isScalar, visit } = loadSync("yaml");
  try {
    const composer = new Composer({ schema: "failsafe", uniqueKeys: false, prettyErrors: false }), docs = [];
    for (const token of new Parser().parse(String(text).replace(/^\ufeff/u, ""))) {
      const one = [token];
      pruned(one);
      docs.push(...composer.next(one[0]));
    }
    docs.push(...composer.end());
    if (docs.length !== 1 || docs[0].errors.length) return null;
    visit(docs[0], { Pair: (_, pair) => (isScalar(pair.key) ? undefined : visit.REMOVE) });
    return docs[0].toJS({ maxAliasCount: 100 });
  } catch { return null; }
});

// Whether the breaks alone stand in the way of a text with one that is no YAML as a YAML 1.1 reader reads it: the package reads it
// as it stands or with each break a blank, or every error it finds once they are line feeds stands on a line a break ends or
// begins, such as a single-quoted string a break ends before a line less indented than its key (#970). An error anywhere else
// is the text's own, and the text is read as it stands.
function breaksAlone(text) {
  if ([text, text.replace(/[\u0085\u2028\u2029]/gu, " ")].some(t => yamlOf(t) !== null)) return true;
  const { Composer, Parser } = loadSync("yaml"), folded = asLF(text).text.replace(/^\ufeff/u, ""), near = new Set(), starts = [0];
  try {
    let line = 0;
    for (const m of text.replace(/\r\n?/gu, "\n").matchAll(/\n|[\u0085\u2028\u2029]/gu)) { line++; if (m[0] !== "\n") { near.add(line - 1); near.add(line); } }
    for (let at = folded.indexOf("\n"); at >= 0; at = folded.indexOf("\n", at + 1)) starts.push(at + 1);
    const composer = new Composer({ schema: "failsafe", uniqueKeys: false, prettyErrors: false }), docs = [];
    for (const token of new Parser().parse(folded)) { const one = [token]; pruned(one); docs.push(...composer.next(one[0])); }
    docs.push(...composer.end());
    const lineOf = pos => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo; };
    return docs.length === 1 && docs[0].errors.length > 0 && docs[0].errors.every(e => near.has(lineOf(e.pos[0])));
  } catch { return false; }
}

// The jobs of a workflow (its YAML read, `yaml`, or its text) that call one of the core's pull-request checks skipped on a
// draft while the trigger never starts it once the pull request is marked ready: [] where none, or where the text is
// no YAML (GitHub's own reader then refuses it).
export function draftHoles(yaml) {
  // (a text past the length read is not given to the parser: #752; one with a break the package does not read is read as a
  // YAML 1.1 reader reads it, as line feeds or as the mend leaves it, and as it stands, what any shows counting: #876)
  if (typeof yaml === "string") {
    if (yaml.length > LONGEST) return [];
    const texts = FOREIGN.test(yaml) ? [asLF(yaml).text, asMended(yaml).text, yaml] : [yaml];
    return [...new Set(texts.flatMap(t => holesIn(yamlOf(t))))];
  }
  return holesIn(yaml);
}
function holesIn(yaml) {
  const types = typesOf(yaml?.on);
  if (types === null || types.includes("ready_for_review")) return [];
  const prefix = `${CORE}/`.toLowerCase();
  return Object.entries(yaml.jobs ?? {}).filter(([, job]) => {
    const uses = typeof job?.uses === "string" ? job.uses.toLowerCase() : "";
    if (!uses.startsWith(prefix) || !CHECKS.test(uses)) return false;
    const skips = /\bpull_request\.draft\b/.test(String(job.if ?? ""));
    const itself = /\/pr-description\.yml@/.test(uses) || (/\/core\.yml@/.test(uses) && ![undefined, null, false, "false", ""].includes(job.with?.description));
    return skips || itself;
  }).map(([name]) => name);
}

// The calls draftHoles() finds in files, each { file, text }, as { fails, notes } of lines with their mend: `before`
// gives a file's text on the base, or is null where there is no base, when each is a note.
export function unreadied(files, before) {
  const fails = [], notes = [];
  for (const { file, text } of files) {
    // (a text past the length read cannot be read for this: one that differs from the base fails, since a call may have
    // lost ready_for_review behind the length; one unchanged, or read with no base, is noted: #752)
    const base = baseOf(before, file, text);
    if (text.length > LONGEST) {
      if (!before || base.same) notes.push(`note ${file}: the file is longer than ${LONGEST} characters, so whether a call of one of the core's checks that is skipped on a draft has ready_for_review among its types is not read${before ? ", as on the base" : ""}. Mend: cut the file to under ${LONGEST} characters, the steps it repeats moved to a script or a workflow of their own`);
      else fails.push(`FAIL ${file}: the file is longer than ${LONGEST} characters and differs from the base, so this check cannot tell whether a call of one of the core's checks that is skipped on a draft has ready_for_review among its types. Mend: cut the file to under ${LONGEST} characters, the steps it repeats moved to a script or a workflow of their own, and mend what this check then says of it`);
      continue;
    }
    const held = new Set(base.read === null ? [] : draftHoles(base.read));
    for (const job of draftHoles(text)) {
      const old = !before || base.unknown || held.has(job);
      (old ? notes : fails).push(`${old ? "note" : "FAIL"} ${file}: its job ${JSON.stringify(job)} calls one of the core's checks that is skipped on a draft, and its pull_request trigger leaves out ready_for_review, so once a pull request is marked ready the check runs on no head and the draft's skip reads as passed${old && base.unknown ? UNKNOWN : old && before ? ", as on the base" : ""}. Mend: add ready_for_review to the types: under pull_request: (where it lists none, types: [opened, reopened, synchronize, ready_for_review])`);
    }
  }
  return { fails, notes };
}

// The files, each { file, text }, that the core's own reader (parseYaml) cannot read, as { fails } (#994): every other reader
// takes such a file for one with no steps. Run on the core's own workflows alone (`--core`); a key given twice is left to
// actionlint (workflow-tools.mjs), but not where only the package joins the keys (true and True, 1 and 01, null and ~).
export function unparsed(files) {
  const fails = [], again = "then run `node scripts/workflows.mjs --core` again";
  for (const { file, text } of files) {
    try { parseYaml(text); } catch (e) {
      if (e?.code === "DUPLICATE_KEY" && keysTwice(text).some(k => k.key !== null)) continue;
      const at = e?.linePos?.[0], first = String(e?.message ?? e).split("\n")[0].replace(/ at line \d+, column \d+:?$/u, "");
      const mend = { DUPLICATE_KEY: "rename one of the two keys that read as one value, or quote both", MULTIPLE_DOCS: "take out the \"---\" and the second document",
        BLOCK_AS_IMPLICIT_KEY: "put the whole value in quotes, since a \": \" inside an unquoted value starts a mapping" }[e?.code] ?? `correct the YAML as the line says, ${again}`;
      fails.push(`FAIL ${file}${at ? `:${at.line}:${at.col}` : ""}: the core's reader cannot read it as YAML, so every reader of workflows sees it with no steps (${e?.code ? `${e.code}: ` : ""}${first})${/Mend:/u.test(first) ? "" : `. Mend: ${mend}`}`);
    }
  }
  return { fails };
}

// The keys given twice in the core's own workflows and actions, as { fails }, where actionlint did not run (#580): the
// core's own reading (keysTwice()) stands in for it there, so that a key given twice never passes the core for want of a
// fetch. Run on the core's own files alone (`--core`); a project's are left to actionlint, which decides there.
export function twiceUnfetched(files) {
  const fails = [];
  for (const { file, text } of files) for (const k of keysTwice(text)) fails.push(k.key === null
    ? (k.size ? `FAIL ${file}:${k.line}: the file is longer than ${LONGEST} characters, past what the core's reader reads, so a key given twice in it cannot be seen. Mend: cut the file to under ${LONGEST} characters, the steps it repeats moved to a script or a workflow of their own`
      : `FAIL ${file}:${k.line}: the file nests its lists or mappings more than ${DEEPEST} deep, past what the core's reader reads, so a key given twice in that part cannot be seen. Mend: nest it no deeper than a workflow needs, a few levels`)
    : `FAIL ${file}:${k.line}: the key ${JSON.stringify(k.key)} is given twice in one mapping${k.first ? `, first on line ${k.first}` : ""}, and GitHub refuses the workflow or reads one value alone. Mend: rename one of the two keys, or take one out`);
  return { fails };
}

// A folder of this run's own for the base's texts, made a git repository (#580): actionlint reads a workflow with its
// project (local reusable workflows, its own config's place) only inside one, so a base read outside one would lack
// findings the head has, and a defect that stood would read as new.
export function baseFolder(under) {
  const dir = fs.mkdtempSync(path.join(under, "workflows-base-"));
  try { execFileSync("git", ["init", "-q", dir], { stdio: "ignore" }); } catch { /* (no git: the base is read as it can be, and the head's run says what fails) */ }
  return dir;
}

if (started(import.meta.url)) {
  const git = args => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  process.chdir(fileURLToPath(new URL(".", import.meta.url)));
  process.chdir(projectAt(process.cwd()).root || git(["rev-parse", "--show-toplevel"]).trim()); // (a carried core's project too: core-path.mjs)
  const tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean), copy = copyOf("."), files = reads(tracked, copy);
  const core = process.argv.includes("--core"), base = core ? "" : process.env.WORKFLOWS_BASE ?? "";
  // (both texts with their line ends as "\n": git may convert them on checkout, so the working tree's file and the base's
  // blob of one text must read as equal and as one length, #752)
  const plain = text => text.replace(/\r\n?/gu, "\n");
  const show = file => { try { return plain(git(["show", `${base}:${file}`])); } catch { return null; } };
  const links = new Set(unlinked(tracked, copy).filter(f => fs.lstatSync(f, { throwIfNoEntry: false })?.isSymbolicLink()));
  let failed = links.size;
  const texts = [];
  for (const file of links) console.log(`FAIL ${logged(file)}: a link, not a file, and the check reads the project's own text only. Mend: put the file itself there in place of the link`);
  for (const file of files) {
    if (links.has(file)) continue;
    const raw = fs.readFileSync(file, "utf8"), found = lines(raw);
    const text = plain(raw);
    texts.push({ file, text });
    if (!readable(text)) { failed++; console.log(`FAIL ${logged(file)}: not UTF-8 text, so it cannot be searched. Mend: save it as UTF-8`); }
    failed += found.length;
    for (const line of found.slice(0, 5)) console.log(`FAIL ${logged(file)}:${line}: ${WORD} runs a pull request with the repository's own token and secrets. Mend: take the word out, in a comment too, and trigger the workflow on pull_request, which runs one without them`);
    if (found.length > 5) console.log(`FAIL ${logged(file)}: and on ${found.length - 5} more lines. Mend: take the word out of each, as above`);
  }
  // (where the YAML package could not be installed, in a project's job or where the core's install could not reach the
  // registry, the calls a draft skips, which it reads, did not run, said as a warning; every failure above still fails:
  // #654, point 4; #1093, point 1)
  const skipped = unreached("yaml") || (!core && !installed("yaml"));
  if (skipped) console.log(didNotRun("The check for a file that is no YAML did not run, nor the one for a call a draft skips", "yaml"));
  const against = core ? () => null : base ? show : null;
  const ready = skipped ? { fails: [], notes: [] } : unreadied(texts, against);
  const bad = core && !skipped ? unparsed(texts) : { fails: [] };
  const odd = foreignBroken(texts, against); // (no package is read for it, so it runs where the install did not)
  // (the two tools, on the files the search could read, and on the base's text of each where a base is told, written to a
  // folder of this run's own; where a tool was not fetched here, it did not run, and decides nothing: #580)
  const tools = { zizmor: process.env.ZIZMOR || "", actionlint: process.env.ACTIONLINT || "" }, toRead = texts.filter(t => readable(t.text)).map(t => t.file);
  const head = run(".", toRead, tools);
  let held = core ? [] : null;
  if (!core && base && head.unrun.length < 2) {
    const dir = baseFolder(process.env.RUNNER_TEMP || os.tmpdir()), there = [];
    try {
      for (const file of toRead) { const was = show(file); if (was !== null) { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), was); there.push(file); } }
      held = run(dir, there, tools).found;
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  const found = compared(head.found, held), twice = core && !skipped && head.unrun.includes("actionlint") ? twiceUnfetched(texts) : { fails: [] };
  for (const name of head.unrun) console.log(`::warning::The workflow check did not run ${name}: it was not fetched here, which only the job's set-up step does (core/scripts/workflow-tools.sh), so its findings decide nothing in this run. Mend: none in a session; the pull request's checks run it`);
  for (const line of [...ready.notes, ...odd.notes, ...found.notes, ...bad.fails, ...ready.fails, ...odd.fails, ...found.fails, ...twice.fails]) console.log(logged(line));
  failed += bad.fails.length + ready.fails.length + odd.fails.length + found.fails.length + twice.fails.length;
  const noted = ready.notes.length + odd.notes.length + found.notes.length;
  console.log(`${failed ? "FAIL" : "ok  "} ${files.length} workflows and actions of the project's own read: ${failed} failing${noted ? `, ${noted} noted` : ""}${failed ? ". Mend: mend each line above as it says" : ""}`);
  process.exit(failed ? 1 : 0);
}
