import { describe, test } from "vitest";
import { type Character, type MindRequest, TurnEngine, first, newGame, newMindReply, remember, requestFor, single } from "@amarna/engine";
import { Assert } from "./support.ts";
import { playRandom } from "./games.ts";

describe("MemoryTests", () => {
  test("A long memory is folded into a summary", () => {
    let s = newGame(2);
    let c = s.characters[0];
    c.memory.length = 0;
    for (let i = 1; i <= 13; i++) remember(c, i, `memory number ${i}`);

    let e = new TurnEngine(s);
    e.beginTurn();
    let req = single(e.mindRequests, (r) => r.task === "SummarizeMemory" && r.characterId === c.id);
    Assert.equal(13 - s.config.memoryKeep / 2, req.fold);
    Assert.equal("season 1: memory number 1", req.facts[0]);

    e.fulfil(req, newMindReply({ text: "I remember the early seasons well." }));
    Assert.equal("I remember the early seasons well.", c.memorySummary);
    Assert.equal(s.config.memoryKeep / 2, c.memory.length);
    Assert.equal("memory number 8", c.memory[0].text);
  });

  test("A summary names the court a character belongs to and none for one that belongs to none", () => {
    let s = newGame(2);
    let servant = first(s.characters, (c) => c.employer === "Hatti");
    let guest = first(s.characters, (c) => c.status === "Free" && c.at !== null);
    // Free and on the road: no employer, and at no court (no Egyptian, nor anyone else's).
    let wanderer = first(s.characters, (c) => c.status === "Free" && c !== guest);
    [wanderer.at, wanderer.duty, wanderer.heldBy] = [null, "None", null];
    for (const c of [servant, guest, wanderer]) for (let i = 1; i <= 13; i++) remember(c, i, `memory number ${i}`);

    let e = new TurnEngine(s);
    e.beginTurn();
    function doFor(c: Character): MindRequest {
      return single(e.mindRequests, (r) => r.task === "SummarizeMemory" && r.characterId === c.id);
    }
    Assert.equal("Hatti", doFor(servant).court);
    Assert.equal(guest.at, doFor(guest).court);
    Assert.null(doFor(wanderer).court);
    // A summary goes to nobody: it is still folded in, with no court to name.
    Assert.throws(() => requestFor(doFor(wanderer)));
    e.fulfil(doFor(wanderer), newMindReply({ text: "I have walked the roads alone." }));
    Assert.equal("I have walked the roads alone.", wanderer.memorySummary);
    Assert.equal(s.config.memoryKeep / 2, wanderer.memory.length);
    // Every request that is for a court names one.
    Assert.all(
      e.mindRequests.filter((r) => r.task !== "SummarizeMemory"),
      (r) => Assert.notNull(r.court),
    );
  });

  test("An empty summary changes nothing", () => {
    let s = newGame(2);
    let c = s.characters[0];
    for (let i = 1; i <= 13; i++) remember(c, i, `m${i}`);
    let count = c.memory.length;
    let e = new TurnEngine(s);
    e.beginTurn();
    e.fulfil(
      first(e.mindRequests, (r) => r.task === "SummarizeMemory" && r.characterId === c.id),
      newMindReply({ text: "  " }),
    );
    Assert.equal(count, c.memory.length);
  });

  test("Memory stays bounded over a long game", () => {
    // A seed whose random play gives someone a long enough memory to fold (summaries are rare in random play).
    let s = playRandom(36, 40);
    Assert.all(s.characters, (c) => Assert.true(c.memory.length <= s.config.memoryKeep + 8, `${c.name} remembers ${c.memory.length} things`));
    Assert.contains(s.characters, (c) => c.memorySummary.length > 0);
  });
});
