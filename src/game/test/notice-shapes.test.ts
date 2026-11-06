import { describe, test } from "vitest";
import { scriptSeats, seasons } from "./small-world.ts";
import { AllPowers, inboxOf, newGame, type InboxItem } from "@amarna/engine";
import { GameRunner, ScriptMind, TemplateNarrator } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";

/**
 * The tells the slop audit took out of the notices (archive item 178; `docs/rounds/2026-11-03-slop-audit-notices.md`),
 * each a pattern that should never come back. Only the engine's own words are read: an audience, an envoy's or spy's
 * report and a tablet carry what kings and characters said, and the candidates' and inquiries' words are their own tests'.
 */
const Tells: readonly (readonly [string, RegExp])[] = [
  ["a number that does not agree", /(?<![\d.])1 (measures|shekels|minas|seasons|men)\b/],
  ["a zero told as a number", /(?<![\d.])0 (measures|shekels|minas|men)\b/],
  ["a small letter after a full stop", /[a-z]\. [a-z]/],
  ["a share in a hundred, not in % (the owner, #735)", /\bin (?:a hundred|100)\b/],
  ["an order arrow", /->/],
  ["two colons in one clause", /: [^.;:\n]*: [^.;:\n]*:/],
];

const EngineWords = (i: InboxItem): boolean => !["Audience", "EnvoyReport", "SpyReport", "Tablet", "Candidates", "CheckResult"].includes(i.kind);

// The slop audit's guard for the notices: a few script kings play ten seasons, and what their courts read carries none
// of the tells, and the works notice, which every court reads every season, does not open the same way every time.
describe("NoticeShapeTests", () => {
  test("The notices a court reads carry none of the audit's tells, and the season's works notice varies", async () => {
    const runner = new GameRunner(newGame(5, seasons(10)), scriptSeats(5, ["Babylonia", "Mitanni", "Assyria", "Egypt"]), new ScriptMind(), new TemplateNarrator());
    await runner.prepare();
    while (await runner.playTurn());
    const items = AllPowers.flatMap((p) => inboxOf(runner.state, p)).filter(EngineWords);
    Assert.true(items.length > 100, `only ${items.length} notices`);
    for (const i of items) for (const [tell, re] of Tells) Assert.false(re.test(i.body), `${tell} in "${i.title}": ${i.body}`);
    const openers = new Set(items.filter((i) => i.title === "Works").map((i) => i.body.split(/(?<=\.) /)[0].replace(/\d[\d,]*|\b\d+ minas?|shekels?/g, "#").replace(/(?<=took ).*?(?= this season)| cost .*?(?=\.)/g, "…")));
    Assert.true(openers.size >= 2, `the works notice opens one way only: ${[...openers].join(" | ")}`);
  });
});
