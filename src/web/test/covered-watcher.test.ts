import { describe, test } from "vitest";
import { TurnEngine, newGame, newGameConfig, type GameState } from "@amarna/engine";
import { frameFrom } from "../src/session/frames.ts";
import { peopleOf } from "../src/map/scene.ts";
import { Assert, smallWorld } from "../../engine/test/support.ts";

// Bug #734 (Codex's review of #747): a spy watching a province, caught out of his court's sight, stands on its map where
// a free one would, by the place the court believes him in, so the map tells nothing the court has not heard.
describe("CoveredWatcherTests", () => {
  function watcher(caught: boolean): [GameState, string] {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
    const c = s.characters.find((x) => x.employer === "Babylonia" && x.status === "Employed")!;
    c.at = null;
    c.duty = "SpyPosted";
    c.missionTarget = null;
    c.watchProvince = "thebes";
    if (caught) {
      new TurnEngine(s).coverFor(c, "Babylonia", "SpyPosted");
      c.status = "Captured";
      c.heldBy = "Egypt";
      c.at = "Egypt";
    }
    return [s, c.id];
  }
  const placed = (s: GameState, id: string) => peopleOf(frameFrom(s, 0, null), "Babylonia")[1].filter((x) => x.id === id).map((x) => `${x.kind} ${x.province}`);

  test("A caught province watcher stands at his post on his master's map, as a free one does", () => {
    const [free, id] = watcher(false);
    const [caught] = watcher(true);
    Assert.equal(["Spy thebes"], placed(caught, id));
    Assert.equal(placed(free, id), placed(caught, id));
  });
});
