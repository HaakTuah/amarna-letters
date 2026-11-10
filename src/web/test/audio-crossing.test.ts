import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { Wait, crossWait, nextPass, passMood, restsAfter } from "../src/audio/crossing.ts";

// Item 19+++b: the music rises fast and falls slow, by the pieces it plays (MoodPieces: Kings is calm, Envoys tension,
// Chariots war, Siege and Battle the top step, the Hymn the menu's).
describe("AudioCrossingTests", () => {
  test("A rise crosses at a phrase end within 8 s; a fall or a step aside waits for the piece's end", () => {
    Assert.equal(Wait.rise, crossWait("kings", "battle", false));
    Assert.equal(Wait.rise, crossWait("envoys", "war", false));
    Assert.null(crossWait("battle", "war", false));
    Assert.null(crossWait("chariots", "calm", false));
    // Within a step: siege and battle, tension and the last seasons.
    Assert.null(crossWait("siege", "battle", false));
    Assert.null(crossWait("envoys", "last", false));
  });

  test("A moment, the menu and the music's first piece wait up to 20 s for a phrase end", () => {
    Assert.equal(Wait.other, crossWait("battle", "calm", true));
    Assert.equal(Wait.other, crossWait("hymn", "calm", false));
    Assert.equal(Wait.other, crossWait("chariots", "menu", false));
    Assert.equal(Wait.other, crossWait(null, "war", false));
    // A moment's own piece belongs to no mood: what follows it crosses as the music's first piece does.
    Assert.equal(Wait.other, crossWait("triumph", "war", false));
  });

  test("After a fall the music rests before the calmer music; in a fight it never rests", () => {
    Assert.true(restsAfter("battle", "war"));
    Assert.true(restsAfter("kings", "calm"));
    Assert.false(restsAfter("chariots", "war"));
    Assert.false(restsAfter("kings", "battle"));
  });

  test("The fallback rises at the next stretch and holds a pass's mood through a fall until the pass ends", () => {
    // A pass of three stretches begun at war.
    let pass = nextPass(null, "war", "march", 3);
    Assert.equal(2, pass.left);
    // A fall to calm waits: the pass plays on at war to its end.
    Assert.equal("war", passMood(pass, "calm"));
    pass = nextPass(pass, passMood(pass, "calm"), "march", 3);
    pass = nextPass(pass, passMood(pass, "calm"), "march", 3);
    Assert.equal(0, pass.left);
    Assert.equal("calm", passMood(pass, "calm"));
    // A rise is heard at once, and a new score starts a new pass.
    Assert.equal("battle", passMood(nextPass(null, "calm", "theme", 4), "battle"));
    Assert.equal(5, nextPass(nextPass(null, "calm", "theme", 4), "battle", "march", 6).left);
  });
});
