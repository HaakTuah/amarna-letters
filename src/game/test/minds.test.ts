import { describe, test } from "vitest";
import { newGame } from "@amarna/engine";
import { GameLog, GameRunner, MindBook, ScriptMind, TemplateNarrator, exportJsonl, type ISeat } from "@amarna/game";
import { scriptSeats, seasons } from "./small-world.ts";
import { Assert } from "../../engine/test/support.ts";

// Item 17+++: a mind's own words are kept season by season, each page only when it changed, and read back as they stood.
describe("MindTests", () => {
  test("A page is kept only when it changed, and a mind reads back as it stood at a season", () => {
    const book = new MindBook();
    book.keep(1, "Egypt", { notes: "Watch Hatti.", summary: "", plan: "Hold the Delta." });
    book.keep(2, "Egypt", { notes: "Watch Hatti.", summary: "", plan: "Take Gaza." });
    book.keep(3, "Egypt", { notes: "Hatti marches.", summary: "Two quiet years.", plan: "Take Gaza." });
    // The blank summary is never kept until it is written; unchanged pages are not kept again.
    Assert.equal(["1 notes", "1 plan", "2 plan", "3 notes", "3 summary"], book.pages.map((p) => `${p.turn} ${p.page}`));
    Assert.equal(["notes: Watch Hatti. (1)", "plan: Take Gaza. (2)"], book.at("Egypt", 2).map((p) => `${p.page}: ${p.text} (${p.turn})`));
    Assert.equal(3, book.at("Egypt", 3).length);
    Assert.equal([], book.at("Hatti", 3));
  });

  test("The runner keeps a minded seat's pages each season, and the log carries them through a save", async () => {
    const seats = scriptSeats(3);
    const inner = seats.get("Mitanni");
    let season = 0;
    const minded: ISeat = {
      label: "Minded",
      decide: (v, sig) => {
        season = v.turn;
        return inner.decide(v, sig);
      },
      hostAudience: (a, c, sig) => inner.hostAudience(a, c, sig),
      mindPages: () => ({ notes: `Season ${season}.`, plan: "Hold Washukanni." }),
    };
    seats.set("Mitanni", minded);
    const r = Object.assign(new GameRunner(newGame(3, seasons(3)), seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await r.prepare();
    while (await r.playTurn());
    // The plan once, the notes each season; no other seat has a mind.
    Assert.equal(["Mitanni"], r.log.minds.minds);
    Assert.equal(1, r.log.minds.pages.filter((p) => p.page === "plan").length);
    Assert.equal(3, r.log.minds.pages.filter((p) => p.page === "notes").length);
    const back = GameLog.fromJsonl(r.log.toJsonl());
    Assert.equal(r.log.minds.pages, back.minds.pages);
    Assert.equal("Season 2.", back.minds.at("Mitanni", 2).find((p) => p.page === "notes")?.text);
    // A replay of the game, and the export, carry them too.
    const replay = GameRunner.forReplay(back);
    Assert.equal(r.log.minds.pages, replay.log.minds.pages);
    Assert.equal(r.log.minds.pages, GameLog.fromJsonl(exportJsonl(r.log)).minds.pages);
  });
});
