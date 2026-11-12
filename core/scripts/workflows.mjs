// The workflow check (floor rule 2, floor/topics.md), for every project that takes the core, on every PR: it fails a
// workflow (.github/workflows/), or an action of the project's own (an action.yml anywhere in it, or any YAML file
// under .github/actions/), in which the word pull_request_target stands anywhere at all, a comment included. It searches the
// whole text for the word and reads no YAML, so no way of writing a key, a comment or a line break hides it; the two
// ways YAML has of spelling a word otherwise are undone first: an escape (\x, \u, \U) is read as what it spells, and
// a word broken over lines by an escaped line break is joined. A file the check cannot read as the project's own
// UTF-8 text fails too: a link (and any link in .github, where a linked folder would hold workflows the check never
// sees), and a file in another encoding, in which the word would stand unseen. A comment or a script that needs to
// speak of the trigger calls it something else.
// What it does not chase: a value given as binary (a YAML tag) holds a word no search can see, and a tag can itself be
// spelled in more ways than a search can follow. GitHub's own workflow reader refuses a binary value where a trigger
// belongs, so that is no way to write one; the reviews hold it, as they hold any odd tag in a workflow.
// The rest of rule 2 is held elsewhere: that every action is pinned to a full commit SHA by GitHub's own setting, which
// reads a workflow as GitHub runs it (README.md, "Setting up"); workflow_run, the fewest permissions and untrusted text
// in a script by the reviews, and by CodeQL where the repository has it. The copy of the core (core/) is checked in the
// core, which runs this on itself. Reads only; Node's own modules. It checks the project it lies in, whatever the
// directory it is started from. Run by the copies workflow (.github/workflows/copies.yml).
//
//   node core/scripts/workflows.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

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

// The files the check reads, of those git tracks.
export const reads = files => files.filter(f => !f.startsWith("core/") && !f.split("/").includes("node_modules") &&
  (/^\.github\/(workflows\/[^/]+|actions\/.+)\.ya?ml$/iu.test(f) || /(^|\/)action\.ya?ml$/iu.test(f)));
// What may be no link, of those git tracks: what the check reads, and .github itself with everything in it.
export const unlinked = files => { const read = new Set(reads(files)); return files.filter(f => read.has(f) || /^\.github(\/|$)/iu.test(f)); };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const git = args => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  process.chdir(fileURLToPath(new URL(".", import.meta.url)));
  process.chdir(git(["rev-parse", "--show-toplevel"]).trim());
  const tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean), files = reads(tracked);
  const links = new Set(unlinked(tracked).filter(f => fs.lstatSync(f, { throwIfNoEntry: false })?.isSymbolicLink()));
  let failed = links.size;
  for (const file of links) console.log(`FAIL ${file}: a link, not a file: the check reads the project's own text only`);
  for (const file of files) {
    if (links.has(file)) continue;
    const text = fs.readFileSync(file, "utf8"), found = lines(text);
    if (!readable(text)) { failed++; console.log(`FAIL ${file}: not UTF-8 text, so it cannot be searched: save it as UTF-8`); }
    failed += found.length;
    for (const line of found.slice(0, 5)) console.log(`FAIL ${file}:${line}: ${WORD} runs a pull request with the repository's own token and secrets: never (floor rule 2)`);
    if (found.length > 5) console.log(`FAIL ${file}: and on ${found.length - 5} more lines`);
  }
  console.log(`${failed ? "FAIL" : "ok  "} ${files.length} workflows and actions of the project's own read: ${failed} against floor rule 2`);
  process.exit(failed ? 1 : 0);
}
