// The cap on the core's rules (README.md, "Two layers"): the floor and the modules together stay under it, so a new
// rule replaces text rather than adding to it (core archive 134). It keeps the rules lean and decides nothing else: no
// rule is moved, cut short or left out to fit, and a change that honest trimming gives no room for raises CAP in the
// same pull request, saying why, once a fresh session has read all the rules for room and found too little (AGENTS.md,
// "How changes are made here"; core archive 179 and 181). That session's answer stands in the pull request as a
// comment that opens "Leanness check:" (modules/review-guidelines.md, "A mark on what every session reads"), and with
// --raise this script fails a pull request that raises CAP and has no such comment from the repository's owner, a
// member or a collaborator, by GitHub's own word for who wrote it, and one that raises it by more than one step. It
// holds that the comment is there, not what it says, when it was written or that a fresh session wrote it: whether
// the session found too little room stays with the reviews, as does any change to this check itself, which a pull
// request runs in its own version. Run from this repository's root by the size workflow
// (.github/workflows/size.yml); Node's own modules only.
//
//   node scripts/size.mjs                                  the floor and the modules against the cap
//   node scripts/size.mjs --raise <base> <comments>        a raise has its leanness check: <base>, this file as the
//                                                          pull request's base holds it; <comments>, the pull
//                                                          request's comments as GitHub's API gives them
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { started } from "./started.mjs";

export const CAP = 52 * 1024;
const WRITERS = ["OWNER", "MEMBER", "COLLABORATOR"]; // GitHub's own word for who wrote a comment, not the comment's
const ANSWER = /^(?:\*\*)?Leanness check:/u;

// The cap a version of this file sets, in bytes, read from its text: the one line that sets CAP, a whole number of
// KB, spelled exactly as above (with `export` before it or, as it stood at first, without). Null where there is no one such line: a caller that gets null fails, and never guesses.
export function capOf(text) {
  const found = typeof text === "string" ? [...text.matchAll(/^(?:export )?const CAP = ([1-9][0-9]{0,5}) \* 1024;\r?$/gm)] : [];
  return found.length === 1 ? Number(found[0][1]) * 1024 : null;
}

// Whether the comments of a pull request, as GitHub's API gives them (a list, or a list of pages), hold a leanness
// check's answer: a comment that opens with it, written by the owner, a member or a collaborator.
export function answered(comments) {
  return (Array.isArray(comments) ? comments.flat() : []).some(c => c !== null && typeof c === "object"
    && WRITERS.includes(c.author_association) && typeof c.body === "string" && ANSWER.test(c.body));
}

// What is wrong with a pull request's raise of the cap, as one line; null where nothing is: the cap is not raised, or
// it is raised one step and the raise has its answer. `base` and `head` are this file's text at the pull request's
// base and as it would merge, and `running` the cap the head's script really holds the rules to: where the line read
// from its text says another (a look-alike line in a comment, the real one spelled otherwise), the text is not
// trusted and the check fails.
export function raised(base, head, comments, running = capOf(head)) {
  const from = capOf(base), to = capOf(head);
  if (to === null || to !== running) return "this file's line that sets CAP is not the one line the check reads, or does not set the cap the script runs with: export const CAP = <KB> * 1024;";
  if (from === null) return "the base's scripts/size.mjs has no line that sets CAP as the check reads it, so whether this pull request raises the cap cannot be told";
  if (to <= from) return null;
  if (to - from !== 1024) return `the cap rises from ${from} to ${to} bytes: it rises one step of a whole KB at a time (AGENTS.md, "The size cap keeps the rules lean and decides nothing else")`;
  if (answered(comments)) return null;
  return `the cap rises from ${from} to ${to} bytes, and the pull request has no comment that opens "Leanness check:": a fresh session reads all the rules for room first, its answer is posted so, and this check is run again (modules/review-guidelines.md, "A mark on what every session reads")`;
}

function main([flag, baseFile, commentsFile]) {
  if (flag === "--raise") {
    let base = null, comments = null;
    try { base = fs.readFileSync(baseFile, "utf8"); comments = JSON.parse(fs.readFileSync(commentsFile, "utf8")); } catch { /* (said below) */ }
    if (comments === null) { console.error("FAIL: name the base's size.mjs and the pull request's comments: node scripts/size.mjs --raise <base> <comments>"); return 1; }
    const wrong = raised(base, fs.readFileSync(fileURLToPath(import.meta.url), "utf8"), comments, CAP);
    if (wrong) { console.error(`FAIL: ${wrong}`); return 1; }
    console.log(capOf(base) < CAP ? `ok   the cap rises from ${capOf(base)} to ${CAP} bytes, and the pull request holds a leanness check's answer` : `ok   the cap is not raised (${CAP} bytes)`);
    return 0;
  }
  const files = ["floor", "modules"].flatMap(dir => fs.readdirSync(dir).filter(f => f.endsWith(".md")).map(f => path.join(dir, f)));
  const total = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  console.log(`floor/ and modules/: ${total} bytes of ${CAP} (${files.length} files)`);
  if (total <= CAP) return 0;
  console.error("FAIL: over the cap. Say the rule in fewer words and trim what is said twice; raise CAP only once a\n"
    + "fresh session has read all the rules for room and found too little (AGENTS.md, \"How changes are made here\").");
  return 1;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
