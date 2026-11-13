// Tests of the core's own measurement (core-cost.mjs): what a merged pull request counts as, the week it falls in, what
// a session-cost line reads as, which pull requests can be priced, and the table. Node's own modules only; the calls
// to git and gh are the program's own and are not made here.
//
//   node scripts/core-cost-test.mjs
import { REPO, classify, dayOf, defaultRef, median, priced, print, reading, readings, sessionOf, table, weekOf } from "./core-cost.mjs";
import { line } from "./session-cost.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${detail}`}`); } };
const rules = ["AGENTS.md", "CLAUDE.md", "SECURITY.md", "core-manifest.md", "docs/threat-model.md"];

ok(classify("sync/core", ["core/floor/security.md", "core-manifest.md", ".github/workflows/core.yml"], rules) === "sync", "the copy, the manifest and a workflow: a sync");
ok(classify("x", ["core-manifest.md", ".github/workflows/core.yml"], rules) === "upkeep", "with nothing of the copy changed it is no sync, but upkeep");
ok(classify("x", ["core/a.md", "AGENTS.md"], rules) === "upkeep" && classify("x", [".claude/settings.json", ".github/dependabot.yml", "docs/threat-model.md"], rules) === "upkeep", "the copy with a rule file, or settings, Dependabot's config and a rule file: upkeep");
ok(classify("x", ["core/a.md", "src/game.js"], rules) === "own" && classify("x", ["docs/design.md"], rules) === "own" && classify("x", ["corerules.md"], rules) === "own" && classify("x", [".github-notes.md"], rules) === "own", "anything of the project's own makes it the project's own work, and a name that only begins like a folder's is not in it");
ok(classify("dependabot/npm_and_yarn/tools/x-1.2.3", ["tools/package-lock.json"], rules) === "update" && classify("x/dependabot/y", ["tools/package-lock.json"], rules) === "own", "a branch of Dependabot's own is an update");
ok(classify("x", [], rules) === "own", "a merge that changed nothing is not counted as the core's");
ok(classify("dependabot/npm_and_yarn/x-1.2.3", ["tools/package-lock.json"], rules, false) === "own" && classify("dependabot/x", ["core/a.md", "core-manifest.md"], rules, false) === "sync", "a fork's branch of that name is no update of Dependabot's: it counts by what it changed");
ok(REPO.test("some-one/a.project_x") && REPO.test("some_managed/x") && REPO.test("some-org/.github") && !REPO.test("../..") && !REPO.test("./x") && !REPO.test("some-one/..") && !REPO.test("some.one/x") && !REPO.test("a/b/c") && !REPO.test("a/b?x=1") && !REPO.test("a /b"), "a repository's name is an account and a name, never a path out of its route");

ok(weekOf("2026-11-09T00:00:00Z") === "2026-11-09" && weekOf("2026-11-15T23:59:59Z") === "2026-11-09" && weekOf("2026-11-16T00:00:00+00:00") === "2026-11-16" && weekOf("2026-11-13T01:30:00+02:00") === "2026-11-09", "a week runs from Monday to Sunday, in UTC");

ok(dayOf("2026-11-09T00:30:00+02:00") === "2026-11-08" && dayOf("2026-11-08T23:30:00-02:00") === "2026-11-09" && dayOf("2026-11-09T12:00:00Z") === "2026-11-09", "a day is UTC's too, whatever offset the moment was written with, so the split and the weeks agree");
ok(defaultRef(() => true) === "refs/remotes/origin/HEAD" && defaultRef(n => n !== "refs/remotes/origin/HEAD") === "refs/remotes/origin/main" && defaultRef(n => n === "refs/heads/main") === "refs/heads/main" && defaultRef(() => false) === null, "the merges read are the default branch's, origin's first, and never the branch checked out");

const sample = line({ answers: 1234, sum: { input_tokens: 7, cache_creation_input_tokens: 2000000, cache_read_input_tokens: 30000000, output_tokens: 456789 }, families: ["Opus"] });
ok(JSON.stringify(reading(`The change.\n\n${sample}\n\nmore`)) === JSON.stringify({ answers: 1234, input: 7, written: 2000000, read: 30000000, out: 456789 }), "the line session-cost.mjs prints is read back, count for count", sample);
ok(reading("no line here") === null && reading(`> ${sample}`) === null && reading(null) === null, "a description without the line at a line's start gives none");
ok(sessionOf("x\nhttps://claude.ai/code/session_01AbC\n") === "session_01AbC" && sessionOf("nothing") === "", "the session is the one the description's link names");

const r = (answers, out) => ({ answers, input: 1, written: answers * 10, read: answers * 100, out });
const took = priced([
  { number: 5, session: "a", reading: r(150, 900) }, { number: 3, session: "a", reading: r(100, 500) }, // (given out of order)
  { number: 4, session: "b", reading: r(40, 80) },
  { number: 6, session: "a", reading: r(120, 700) }, // (the line dropped: the record lost answers)
  { number: 7, session: "a", reading: r(130, 760) },
  { number: 8, session: "", reading: r(999, 999) }, { number: 9, session: "a", reading: null },
  { number: 10, session: "a", reading: r(130, 760) }, // (nothing spent since)
]);
ok(took.get(5)?.answers === 50 && took.get(5)?.out === 400 && took.get(7)?.answers === 10 && took.get(7)?.out === 60, "a pull request took what its session's line rose by since that session's one before");
ok(!took.has(3) && !took.has(4) && !took.has(6) && !took.has(8) && !took.has(9) && !took.has(10) && took.size === 2, "the first of a session, a line that dropped, no session, no line and no rise are not priced");
const gap = priced([{ number: 1, session: "a", reading: r(100, 500) }, { number: 2, session: "a", reading: null }, { number: 3, session: "a", reading: r(180, 900) }, { number: 4, session: "a", reading: r(200, 950) }]);
ok(!gap.has(3) && gap.get(4)?.answers === 20, "after a pull request of the session with no line, the next is not priced with what both took, and the one after is again");
const unmerged = priced([{ number: 1, session: "a", reading: r(100, 500) }, { number: 2, session: "a", reading: r(150, 700) }, { number: 3, session: "a", reading: r(180, 900) }]);
ok(unmerged.get(3)?.answers === 30, "given every pull request of a session, one left unmerged between two merged ones keeps the later from being charged for both (the program reads them all)");
// what gh gives of each pull request: only the repository's own count, a fork's is as if it were not there
const link = "https://claude.ai/code/session_a", body = n => `x\n\nSession so far: ${n} answers (Opus); tokens in 1, cache written ${n * 10}, cache read ${n * 100}, out ${n * 5}.\n\n${link}`;
const own = [[1, "Some/Project", body(100)], [3, "some/project", body(150)]];
const honest = priced(readings(own, "some/project", 1)).get(3)?.answers;
ok(honest === 50, "a session's two pull requests, read from their descriptions, price the second by what rose", String(honest));
for (const [what, forged] of [["a lower line", body(1)], ["a line just below the next", body(149)], ["the session's link and no line", `x\n${link}`]]) {
  const got = priced(readings([...own, [2, "outsider/project", forged]], "some/project", 1)).get(3)?.answers;
  ok(got === 50, `a fork's pull request between them that names the session, with ${what}, changes nothing`, String(got));
}
ok(priced(readings([...own, [2, null, body(1)]], "some/project", 1)).get(3)?.answers === 50 && readings([[2, "", body(1)], [0, "some/project", body(1)]], "some/project", 1).length === 0, "nor does one whose fork is gone, and one from before the oldest merge is not read");
ok(median([3, 1, 2]) === 2 && median([4, 1, 3, 2]) === 2.5 && median([]) === null, "the median");

const merged = [
  { number: 1, when: "2026-11-03T10:00:00Z", kind: "own", lines: 100, took: null },
  { number: 2, when: "2026-11-10T10:00:00Z", kind: "own", lines: 40, took: { answers: 30, out: 3000 } },
  { number: 3, when: "2026-11-10T11:00:00Z", kind: "sync", lines: 0, took: { answers: 80, out: 9000 } },
  { number: 4, when: "2026-11-11T11:00:00Z", kind: "upkeep", lines: 0, took: null },
  { number: 5, when: "2026-11-12T11:00:00Z", kind: "update", lines: 0, took: { answers: 5, out: 50 } },
];
const rows = table(merged, m => `week of ${weekOf(m.when)}`);
ok(rows.length === 2 && rows[0].key === "week of 2026-11-02" && rows[1].all === 4 && rows[1].own === 1 && rows[1].sync === 1 && rows[1].upkeep === 1 && rows[1].update === 1 && rows[1].lines === 40 && rows[1].unpriced === 1, "the weeks in order, each with its counts");
const text = print(rows, true).split("\n");
ok(text.length === 3 && /\b50%/.test(text[2]) && /\b0%/.test(text[1]) && text[2].includes("30 (of 1)") && text[2].includes("80 (of 1)") && text[2].includes("3 of 4"), "the table: the core's share is its syncs and upkeep of all merged, and each median says of how many", text.join("\n     "));
ok(!print(rows, false).includes("answers"), "without --cost the table says nothing of cost");

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the core's measurement`);
process.exitCode = failed ? 1 : 0;
