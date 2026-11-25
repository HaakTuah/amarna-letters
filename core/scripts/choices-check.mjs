// The records' check a pull request runs (#515; split from choices.mjs, #912): with CHOICES_BASE set, as the copies check
// sets it to the commit a pull request merges into, choices.mjs runs `checkOf`, which fails a record the pull request
// adds without a line of ARGUED (choices-records.mjs) and lists, never fails, one that stood there (AGENTS.md, "Nothing
// locks a project"). It reads only, posts nothing and exits 0, save where the records cannot be read or that check
// fails. git and Node's own modules.
import { execFileSync } from "node:child_process";
import { CORE } from "./core-address.mjs";
import { MEND } from "./mend.mjs";
import { MOST, UNREAD, inFolder, parse, wholeOf, where } from "./choices-records.mjs";

// The records' check (#515): of the records at the head (`head`, a records file's text), those the base (`base`, its
// text there, null where it held none) did not hold by name and that lack a line of ARGUED fail, save one that records
// a choice already made (tasks/choices.md, "The choices a project already made are recorded too"); those it held, and
// those, are listed and never fail. { failed, listed }, each a list of records.
export function argued(head, base) {
  const before = new Set(parse(base ?? "").records.map(r => r.name)), recs = parse(head ?? "").records;
  const lacking = recs.filter(r => r.lacks.length), old = r => before.has(r.name) || r.stood;
  // (a stack's record this change adds that does not say what the core cannot read in it; one that stood is no task,
  // but a first audit's record of a choice already made is asked the line, which it can write, unlike the argued lines)
  return { failed: lacking.filter(r => !old(r)), listed: lacking.filter(old), gapless: recs.filter(r => !r.gaps && !before.has(r.name)) };
}

// What the base reads as where it held a file as a link (#541): a case of its own, apart from no commit (undefined)
// and no file (null).
export const LINK = Symbol("a link");

// A file's text at a commit, read from git, or null where the commit does not hold it as a file of at most MOST bytes;
// undefined where `commit` is no commit here, or a name git would read as an option; LINK where the file, or a folder
// on its way, is a link there.
export function atCommit(commit, file, root = ".") {
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: MOST * 2 });
  // (a name that opens with "-" would be read by git as an option: it is no commit)
  if (String(commit).startsWith("-")) return undefined;
  try { git(["rev-parse", "--verify", "-q", `${commit}^{commit}`]); } catch { return undefined; }
  try {
    // (a link at the base is no file the records were read from there, as records() reads none at the head, where a link
    // on the file's way is read so too)
    const parts = String(file).split("/");
    for (let i = 1; i <= parts.length; i++) if (/^120000 /u.test(git(["ls-tree", commit, "--", parts.slice(0, i).join("/")]))) return LINK;
    if (git(["cat-file", "-t", `${commit}:${file}`]).trim() !== "blob" || Number(git(["cat-file", "-s", `${commit}:${file}`])) > MOST) return null;
    return git(["show", `${commit}:${file}`]);
  } catch { return null; }
}

// The records at the base, by the path the base's own rules name (its manifest's row, or the core's AGENTS.md), so a
// pull request that moves them reads the records they held: their text, with the records of a folder a line POINTER
// names put in its place, null where the base held none, undefined where `base` is no commit here, and LINK where the
// records, or the manifest that names them, or that folder were a link there. The core's AGENTS.md, read where the base
// holds no manifest, is read as naming none where it was a link, so the records are read at the starter kit's path, as
// before (#541).
export function baseRecords(base, root = ".") {
  const manifest = atCommit(base, "core-manifest.md", root);
  if (manifest === undefined || manifest === LINK) return manifest;
  const rules = manifest ?? atCommit(base, "AGENTS.md", root);
  const file = where(rules === LINK ? "" : rules ?? "");
  const text = file ? atCommit(base, file, root) : null;
  if (typeof text !== "string") return text;
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: MOST * 2 });
  // (a folder the base held as a link, or that cannot be read there, or is past MOST with the file, reads as a link: its
  // records are listed and none fails, as with no base to compare with, since any of them may have stood there)
  let unreadable = false, total = Buffer.byteLength(text);
  const whole = wholeOf(text, folder => {
    const at = folder.split("/");
    try {
      for (let i = 1; i <= at.length; i++) if (/^120000 /u.test(git(["ls-tree", base, "--", at.slice(0, i).join("/")]))) throw new Error("a link");
      const entries = git(["ls-tree", "-z", base, "--", `${folder}/`]).split("\0").filter(Boolean).map(l => /^100(?:644|755) blob \w+\t(.+)$/u.exec(l)?.[1]).filter(Boolean);
      return inFolder(entries, name => {
        if ((total += Number(git(["cat-file", "-s", `${base}:${name}`]))) > MOST) throw new RangeError("past");
        return git(["show", `${base}:${name}`]);
      });
    } catch { unreadable = true; return []; }
  });
  return unreadable ? LINK : whole;
}

// What the check prints and whether it failed: `got`, the records at the head (records()); `base`, the commit the
// change merges into ("" for none). [lines, failed].
export function checkOf(got, base, root = ".") {
  const rule = 'core/tasks/choices.md, "A choice that is hard to undo gets a record"';
  const then = base ? baseRecords(base, root) : undefined;
  if (got.unread) {
    const was = typeof then === "string";
    return [[was ? `FAIL: the choice records could not be read (${got.unread}), and the base held them as a file. ${MEND}name a regular file inside the project as the *choice records*, under ${MOST} bytes, as the base had it.`
      : `The choice records could not be read (${got.unread}), as at the base: nothing to check.`], was];
  }
  if (got.text === null) return [["No choice records here: nothing to check."], false];
  // (a base that held the records as a link: what the link led to is not read, so each record is listed, as with no
  // base, and none fails, since any of them may have stood there: AGENTS.md, "Nothing locks a project")
  const unlisted = why => [[`${why}, so no record is read as one this change adds.`, ...argued(got.text, got.text).listed.map(r => `- listed, not failed: "${r.name}", argued on no line that opens ${r.lacks.map(l => `"${l}"`).join(", ")}`)], false];
  if (then === undefined) return unlisted(`No base to compare with${base ? ` (${base} is no commit here)` : ""}`);
  if (then === LINK) return unlisted(`The base held the records as a link, which is not read`);
  const { failed, listed, gapless } = argued(got.text, then);
  return [[...gapless.map(r => `FAIL: \`${got.file}\`: the record "${r.name}", a choice of stack this change adds, does not close with a line that opens "${UNREAD}" and names an issue or says "none". ${MEND}file each of the core's checks that cannot yet read the stack picked to the core as an issue ("Reporting to the core" in its README), and end the record with that line, naming each such check with its issue (as \`${CORE}#12\` or the issue's address), or saying "none" where the core reads the stack whole, as core/tasks/choices.md, "A choice of stack ends with what the core cannot read in it", says.`),
    ...failed.map(r => `FAIL: \`${got.file}\`: the record "${r.name}", which this change adds, is argued on no line that opens ${r.lacks.map(l => `"${l}"`).join(", ")}. ${MEND}argue it as ${rule}, says, each on its own line in the record: "Looked for:", the challenger's search for options the list lacks, with the writer's answer to each; "The blind pick:", the pick of a fresh session given the problem and the criteria and never the record; "The judgment:", the decision of a fresh session that wrote no part of it. A record of a choice the project had already made, as a first audit writes it, takes instead a line that opens "Stood before:", saying when.`),
    ...listed.map(r => `- listed, not failed: "${r.name}" ${r.stood ? "records a choice already made" : "stood before this change"}, argued on no line that opens ${r.lacks.map(l => `"${l}"`).join(", ")}`),
    `\`${got.file}\`: ${failed.length ? `${failed.length} record${failed.length === 1 ? "" : "s"} this change adds not argued in full` : "every record this change adds is argued in full"}${listed.length ? `; ${listed.length} that stood before listed` : ""}.`], failed.length + gapless.length > 0];
}
