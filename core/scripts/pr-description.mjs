// The description check ("Each PR has the headings" in modules/git.md), for every project that takes the core, on every
// PR that is not a draft: it fails a description without a heading for each part the project names, by default "What
// the owner can try" and "Readings taken". A part is there when a line of the description is a heading (one to six #)
// that starts with its words, whatever the case, with no letter or digit right after them and whatever marks before
// them: "### Readings taken (the unsure first)" and "## **Readings taken**" count. It reads no Markdown beyond that, so
// such a line counts inside a code block or a comment too: it catches the heading forgotten, which is what happens, and
// not the one faked, which a review sees. Where nothing was open, the heading stands with "None" under it, and where
// the project's report is a file of its own, with where that file is, so the check never guesses whether something
// was. It holds that the parts are there, not that they are true or whole: that stays with the reviews. Dependabot's
// own PRs are not asked (the workflow leaves them out by their author). Reads only: the description comes in PR_BODY,
// never on the command line; Node's own modules. Run by the description workflow
// (.github/workflows/pr-description.yml).
//
//   PR_BODY="$(...)" node core/scripts/pr-description.mjs ["Part one|Part two"]
import { pathToFileURL } from "node:url";

export const PARTS = ["What the owner can try", "Readings taken"];

// The parts, of those asked for, that the description has no heading for.
export function missing(body, parts = PARTS) {
  // a heading's words: what follows the #, without marks before the first letter or digit (bold, a sign), blanks as one
  const words = text => text.replace(/^[^\p{L}\p{N}]+/u, "").replace(/\s+/gu, " ").trim().toLowerCase();
  const headings = String(body ?? "").split(/\r\n|\r|\n/u).map(line => /^ {0,3}#{1,6}[ \t]+(.*)$/u.exec(line)?.[1]).filter(Boolean).map(words);
  return parts.filter(part => { const p = words(part); return !headings.some(h => h === p || h.startsWith(p) && /^[^\p{L}\p{N}]/u.test(h.slice(p.length))); });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const parts = (process.argv[2] ?? "").split("|").map(p => p.trim()).filter(Boolean);
  const absent = missing(process.env.PR_BODY, parts.length ? parts : PARTS);
  for (const part of absent) console.log(`FAIL the description has no heading "${part}": add "## ${part}" with what belongs under it ("None" where there is nothing; where a report in a file holds it, that file)`);
  console.log(`${absent.length ? "FAIL" : "ok  "} the description's parts: ${absent.length} of ${(parts.length ? parts : PARTS).length} missing`);
  process.exit(absent.length ? 1 : 0);
}
