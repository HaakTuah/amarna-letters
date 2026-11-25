// The script that runs the readers of the records of the choices that are hard to undo (tasks/choices.md; core archive
// 222 and 231; split, #912): where a project keeps them and what they hold (choices-records.mjs), whether the pass over
// them, twice a year, is due and whether a sign written in a measure has tripped (choices-look.mjs, the scheduled look's
// readers), and the records' check (choices-check.mjs): with CHOICES_BASE set, as the copies check sets it to the commit
// a pull request merges into, it fails a record the pull request adds without a line of ARGUED and lists, never fails,
// one that stood there (AGENTS.md, "Nothing locks a project"). It reads only, posts nothing and exits 0, save where the
// records cannot be read or that check fails. git and Node's own modules.
//
//   node core/scripts/choices.mjs      from a project's root: each record, whether it names its sign and is argued,
//                                      each condition and the number it reads, and whether the pass is due (in the
//                                      core: node scripts/choices.mjs); with CHOICES_BASE=<a commit>, the check
import fs from "node:fs";
import { reading, rulesOf } from "./dose.mjs";
import { started } from "./started.mjs";
import { checkOf } from "./choices-check.mjs";
import { report } from "./choices-look.mjs";
import { KIT, parse, records } from "./choices-records.mjs";

// What the scheduled look reads (look.mjs, DUE) stands where the look has always imported it from.
export { look, signs } from "./choices-look.mjs";

// The dose's reading the script reads the measures from, or why it could not.
function measuresHere(rules) {
  try { return reading(rules) ?? "the shape check has no config here"; } catch (e) { return `the shape check could not be read: ${String(e.message).split(". Mend: ")[0]}`; }
}

if (started(import.meta.url)) {
  let manifest = null;
  try { manifest = fs.readFileSync("core-manifest.md", "utf8"); } catch { /* (the core's own AGENTS.md, or the kit's file) */ }
  const { rules } = rulesOf(manifest, ".");
  const got = records(rules);
  if (process.env.CHOICES_BASE !== undefined) {
    const [lines, failed] = checkOf(got, process.env.CHOICES_BASE);
    console.log(lines.join("\n"));
    if (failed) process.exitCode = 1;
  } else {
    const named = !got.unread && got.text !== null && parse(got.text).records.some(rec => rec.conditions.length);
    console.log(report(got, new Date().toISOString(), named ? measuresHere(rules) : undefined));
    if (got.unread) { console.error(`FAIL: the choice records could not be read (${got.unread}). Mend: name a regular file inside the project as the *choice records* in the manifest's slots, or leave the row out for ${KIT}`); process.exitCode = 1; }
  }
}
