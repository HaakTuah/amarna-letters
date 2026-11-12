// Checks the description check (pr-description.mjs, beside this file): a part is there only as a heading that starts
// with its words. Run by the core's tests workflow (.github/workflows/tests.yml).
//
//   node scripts/pr-description-test.mjs
import { missing, PARTS } from "./pr-description.mjs";

let failed = 0;
const ok = (cond, what) => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) failed++; };
const whole = "The change.\n\n## What the owner can try\n\nOpen it.\n\n## Readings taken\n\nNone.\n";

ok(missing(whole).length === 0, "a description with both headings passes");
ok(missing("### What the owner can try\nx\n###### readings TAKEN (the unsure first)\nx\n").length === 0, "any level of heading, any case, and words after the part's own");
ok(missing("## What the owner can try: nothing yet\r\n## Readings taken, the unsure first\r\n").length === 0, "a mark after the part's words, and lines that end both ways");
ok(missing("The change.").join() === PARTS.join() && missing("").length === 2 && missing(undefined).length === 2 && missing(null).length === 2, "a description with neither, an empty one and none at all each miss both");
ok(missing("## What the owner can try\nx\n").join() === "Readings taken", "one missing part is named");
ok(missing("**What the owner can try:** x\n**Readings taken:** none\nWhat the owner can try\nReadings taken\n").length === 2, "bold words, or the words on a plain line, are no heading");
ok(missing("## What the owner can trying\n## Readings takenly\n## Not what the owner can try\n##Readings taken\n").length === 2, "a longer word, the words not at the start, and a # with no space after it do not count");
ok(missing("    ## What the owner can try\n\t## Readings taken\n").length === 2, "a line indented as code is no heading");
ok(missing("## Risks\n## Rollback\n", ["Risks", "Rollback", "Test plan"]).join() === "Test plan", "a project's own parts are asked for in place of the two");
ok(missing("## **What the owner can try**\n## _Readings\u00a0 taken_ \n").length === 0 && missing("## 1. What the owner can try\n## \u2705 Readings taken\n").join() === "What the owner can try", "bold or a sign before the words, and blanks of any kind between them, are read through; a number before them is not");
ok(missing("## \u0130stanbul notes\n## STRASSE: none\n", ["\u0130stanbul", "Strasse"]).length === 0 && missing("## \u0130stanbuls\n", ["\u0130stanbul"]).length === 1, "a part whose small letters are longer than its capitals is still matched whole");
ok(missing("```\n## What the owner can try\n```\n<!--\n## Readings taken\n-->\n").length === 0, "it reads no Markdown: a heading line in a code block or a comment counts (stated in the script's header)");
const slow = Date.now();
missing(`${"#".repeat(300000)} x\n${"## ".repeat(100000)}\n${" ".repeat(300000)}# Readings taken\n`.repeat(3));
ok(Date.now() - slow < 2000, "a long description of signs and spaces is read in no time");
process.exit(failed ? 1 : 0);
