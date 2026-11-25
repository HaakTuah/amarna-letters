// The check of the line "Waits on:", read from the last line that starts with it (split from pr-description.mjs, #888; "Nothing waits silently" in roles/shared/work-flow.md). pr-description.mjs,
// beside this file, says what the check asks as a whole, runs this one and exports what it holds.
import { textOf } from "./reading.mjs";

// The line a description ends with, saying what the pull request waits on: nothing (its builder goes on), a review, its
// checks, another item ("#241"), or the owner, with the question in one sentence after a colon. A line that begins with
// a form, in any case, is in it, whatever follows ("#724, then the orchestrator's word"): the check fails what is
// missing, never phrasing (#750, point 4).
export const WAITS = "Waits on:";
const FORMS = [["nothing", /^nothing(?![\w-])/iu], ["a review", /^a review(?![\w-])/iu], ["checks", /^checks(?![\w-])/iu], ["item", /^#[1-9]\d{0,8}(?![\w-])/u], ["the owner", /^the owner: \S[^?]*\?/iu]];

// What a description says it waits on: its last line that starts with "Waits on:", as { said, kind }, kind null where
// the line is in none of the forms; null where there is no such line.
export function waitsOn(body) {
  const line = textOf(body).split(/\r\n|\r|\n/u).map(l => l.trim()).filter(l => l.startsWith(WAITS)).at(-1);
  if (line === undefined) return null;
  const said = line.slice(WAITS.length).trim();
  return { said, kind: FORMS.find(([, form]) => form.test(said))?.[0] ?? null };
}

// Whether the copy on the base held the line when the pull request opened at `created`: of the commits that changed
// it there, newest first ([{ sha, date }]), the newest from before then, and `holds`, whether the file at a commit holds
// the line. One file is read, however many syncs have changed it, so a run spends two of the repository's calls.
export function heldAt(commits, created, holds) {
  const then = commits.find(c => String(c.date) <= created);
  return then ? holds(then.sha) : false;
}

// The mend where a description asked for the line lacks it or words it in none of the forms; null where it is right.
export function waitsMend(body) {
  const w = waitsOn(body);
  if (w?.kind) return null;
  return `${w ? `its line "${WAITS} ${w.said}" is in none of the forms` : `the description has no line "${WAITS}"`}. Mend: end it with one, above its closing lines, of these: "${WAITS} nothing", "${WAITS} a review", "${WAITS} checks", "${WAITS} #<the item it waits on>", or "${WAITS} the owner: <the question, in one sentence>?", with the label needs-owner on the pull request; edit it whenever what it waits on changes`;
}
