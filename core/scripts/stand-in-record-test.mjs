// Tests of the stand-in's record (stand-in-record.mjs): what reads as a verdict, its kind and sureness, how the owner's
// marked answers are set against the verdict before them, the printed lines, the open ideas that lack a verdict, and
// a title's control characters. Node's own modules only; the calls to
// git and gh are the program's own and are not made here.
//
//   node scripts/stand-in-record-test.mjs
import { lacking, plain, print, tally, verdict } from "./stand-in-record.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${detail}`}`); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

ok(same(verdict("**The stand-in's verdict: yes, SURE.** Build it when"), { kind: "yes", sure: "sure" })
  && same(verdict("Stand-in's verdict: later (unsure). - The aim"), { kind: "later", sure: "unsure" })
  && same(verdict("**The stand-in's verdict, updated: yes (sure)**, as the rest"), { kind: "yes", sure: "sure" })
  && same(verdict("\n\nThe stand-in’s verdict: no."), { kind: "no", sure: "unmarked" }), "a verdict's kind and sureness, in the forms sessions have written");
ok(verdict("Queued, since the stand-in's verdict is a sure yes") === null && verdict("Not queued: the stand-in's verdict is unsure") === null
  && verdict("The stand-in's verdict matched the owner's answer.") === null, "a comment that only speaks of a verdict is none");
ok(verdict("A first line about something else.\n**The stand-in's verdict: yes, sure.**") === null && verdict(null) === null, "only the first line counts, so a quote further down is no verdict");

const c = (issue, at, body, writer = true) => ({ issue, at, body, writer });
const t = tally([
  c("7", "2026-11-12T17:00:00Z", "The stand-in's verdict matched the owner's answer."), // (given out of order)
  c("7", "2026-11-12T16:00:00Z", "**The stand-in's verdict: yes, UNSURE.** A look."),
  c("8", "2026-11-12T16:00:00Z", "**The stand-in's verdict: later, unsure.**"),
  c("8", "2026-11-12T16:30:00Z", "**The stand-in's verdict, updated: yes (sure)**"),
  c("8", "2026-11-13T09:00:00Z", "From the owner's design session: no. The stand-in's verdict missed."),
  c("9", "2026-11-12T16:00:00Z", "**The stand-in's verdict: yes, sure.**", false),
  c("9", "2026-11-13T09:00:00Z", "The stand-in's verdict matched.", false),
  c("10", "2026-11-13T09:00:00Z", "The stand-in's verdict matched."),
]);
ok(same(t.verdicts, { "unsure yes": 1, "unsure later": 1, "sure yes": 1 }), "every verdict counts, an updated one too", JSON.stringify(t.verdicts));
ok(same(t.answers, { matched: { unsure: 1, "no verdict seen": 1 }, missed: { sure: 1 } }), "an answer is set against the issue's last verdict before it; none from another account counts", JSON.stringify(t.answers));
ok(print(t, "some-one/x") === "The stand-in's record in some-one/x, from 8 comments:\n  verdicts on ideas: 3 (sure yes 1, unsure later 1, unsure yes 1)\n  the owner's answers marked: 3, matched 2 (no verdict seen: 1 of 1; sure: 0 of 1; unsure: 1 of 1)", "the printed record", print(t, "some-one/x"));
ok(print(tally([]), "some-one/x") === "The stand-in's record in some-one/x, from 0 comments:\n  verdicts on ideas: 0\n  the owner's answers marked: 0, matched 0", "an empty record prints its zeros");

const i = (issue, owner = true) => ({ issue, title: issue, owner });
const l = lacking([i("7"), i("8"), i("9"), i("11"), i("12", false)], [
  c("8", "2026-11-12T16:30:00Z", "**The stand-in's verdict, updated: yes (sure)**"),
  c("8", "2026-11-12T16:00:00Z", "**The stand-in's verdict: later, unsure.**"), // (given out of order)
  c("9", "2026-11-12T16:00:00Z", "**The stand-in's verdict: yes, sure.**", false),
  c("11", "2026-11-12T16:00:00Z", "Stand-in's verdict: later (unsure)."),
]);
ok(same(l.none.map(i => i.issue), ["7", "9"]) && same(l.later.map(i => i.issue), ["11"]), "an idea lacks a verdict where none came from a writer; a later is its last", JSON.stringify(l));
ok(l.others === 1 && !l.none.some(x => x.issue === "12"), "an idea another account filed, a member's or a collaborator's too, is left out and counted (floor rule 4)");
ok(plain("a\u001b[31mb\nc\u0085d") === "a [31mb c d" && plain(null) === "", "a title loses its control characters");

console.log(`\n${count - failed} of ${count} passed`);
if (failed) process.exit(1);
