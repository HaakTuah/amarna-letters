import { describe, test } from "vitest";
import { Views, firstGameConfig, newGame, type Power } from "@amarna/engine";
import { GameRunner, ScriptMind, TemplateNarrator } from "@amarna/game";
import { situation } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";
import { scriptSeats } from "../../game/test/small-world.ts";
import { briefRows } from "../src/ui/brief.ts";

/** The lines of the request's season brief, as a model reads them. */
function requestBrief(text: string): string[] {
  const at = text.indexOf("SEASON BRIEF");
  if (at < 0) return [];
  const lines = text.slice(at).split("\n").slice(1);
  const out: string[] = [];
  for (const l of lines) {
    if (!l.startsWith("  - ")) break;
    out.push(l.slice(4));
  }
  return out;
}

/** Item 18b, "A model seat reads the same": a seat's screen and its request give the same brief, line for line. */
describe("SeasonBriefTests", () => {
  test("The screen's brief and the request's say the same, in the same order, at most six lines", async () => {
    const kings: Power[] = ["Egypt", "Hatti", "Mitanni"];
    const r = new GameRunner(newGame(5, firstGameConfig()), scriptSeats(5, kings), new ScriptMind(), new TemplateNarrator());
    await r.prepare();
    let compared = 0;
    for (let i = 0; i < 8 && !r.state.ended; i++) {
      await r.playTurn();
      for (const p of kings) {
        const v = Views.for(r.state, p);
        const screen = briefRows(v).map((x) => x.text);
        Assert.true(screen.length <= 6);
        Assert.equal(JSON.stringify(screen), JSON.stringify(requestBrief(situation(v))));
        compared += screen.length;
      }
    }
    // The comparison saw lines, not only empty briefs.
    Assert.true(compared >= 4, `${compared} lines compared`);
  }, 120000);
});
