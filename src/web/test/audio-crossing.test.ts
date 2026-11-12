import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { Ease, Wait, crossAt, crossPlan, crossWait, heardMood, nextPass, passMood, riseNow, type Turn } from "../src/audio/crossing.ts";

// Items 19+++b and 19+++c: the music rises fast and falls slow, by the mood a piece stands for (the higher of its own and
// the one it was drawn for; MoodPieces: Kings is calm, Envoys tension, Chariots war, Siege and Battle the top step, the
// Hymn the menu's), and a spectator's turns over calmly.
const player: Turn = { ears: "own", clear: false, eyes: null };
const watcher = (over: Partial<Turn> = {}): Turn => ({ ears: "realm", clear: false, eyes: null, ...over });

describe("AudioCrossingTests", () => {
  test("A piece stands for the higher of its own mood and the one it was drawn for", () => {
    Assert.equal("calm", heardMood("kings", "calm"));
    Assert.equal("war", heardMood("kings", "war"));
    Assert.equal("war", heardMood("chariots", "tension"));
    Assert.equal("menu", heardMood("hymn", null));
    // A moment's piece belongs to no mood: it stands for the mood it was drawn in, if any.
    Assert.equal(null, heardMood("triumph", null));
  });

  test("A player's rise crosses at a phrase end within 8 s; a fall or a step aside waits for the piece's end", () => {
    Assert.equal(Wait.rise, crossWait("calm", "battle", false));
    Assert.equal(Wait.rise, crossWait("tension", "war", false));
    Assert.null(crossWait("battle", "war", false));
    Assert.null(crossWait("war", "calm", false));
    // Within a step: siege and battle, tension and the last seasons; and what the piece already stands for.
    Assert.null(crossWait("siege", "battle", false));
    Assert.null(crossWait("tension", "last", false));
    Assert.null(crossWait("war", "war", false));
  });

  test("A moment, the menu and the music's first piece wait up to 20 s for a phrase end", () => {
    Assert.equal(Wait.other, crossWait("battle", "calm", true));
    Assert.equal(Wait.other, crossWait("menu", "calm", false));
    Assert.equal(Wait.other, crossWait("war", "menu", false));
    Assert.equal(Wait.other, crossWait(null, "war", false));
  });

  test("A spectator's rise crosses so only for something clear in front of him; the world's never does", () => {
    Assert.equal({ wait: Wait.rise, late: false }, crossPlan("calm", "battle", false, player));
    Assert.equal({ wait: Wait.rise, late: false }, crossPlan("calm", "battle", false, watcher({ clear: true })));
    // Not clear: the piece plays to its end.
    Assert.null(crossPlan("calm", "battle", false, watcher()));
    Assert.null(crossPlan("tension", "war", false, { ears: "world", clear: false, eyes: null }));
    Assert.true(riseNow("calm", "battle", player));
    Assert.true(riseNow("calm", "battle", watcher({ clear: true })));
    Assert.false(riseNow("calm", "battle", watcher()));
    Assert.false(riseNow("battle", "calm", player));
    // The menu, and a moment, are not a rise: they wait for a phrase end as before.
    Assert.false(riseNow("menu", "calm", player));
    Assert.equal({ wait: Wait.other, late: false }, crossPlan("menu", "calm", false, watcher()));
    Assert.equal({ wait: Wait.other, late: false }, crossPlan("war", "calm", true, watcher()));
  });

  test("A change of what he watches never cuts a piece: it plays on, or at most 45 s to a phrase end", () => {
    // The mood asked is of another height than the piece's: late, within the 45 s left of the change.
    Assert.equal({ wait: Ease, late: true }, crossPlan("war", "calm", false, watcher({ eyes: 0 })));
    Assert.equal({ wait: Ease - 30, late: true }, crossPlan("calm", "war", false, watcher({ eyes: 30 })));
    Assert.equal({ wait: 0, late: true }, crossPlan("war", "calm", false, watcher({ eyes: 60 })));
    // Of the same height, or with no change of eyes: nothing to cross to.
    Assert.null(crossPlan("tension", "last", false, watcher({ eyes: 0 })));
    Assert.null(crossPlan("war", "calm", false, watcher()));
  });

  test("A rise takes the next phrase end within its wait; a late change the last one within it, and none where the piece ends first", () => {
    const phrases = [10, 30, 50, 70, 90, 110];
    const rise = { wait: 8, late: false };
    Assert.equal(29.6, crossAt(rise, phrases, 22, 0.4, 120));
    // No phrase end that soon: at once.
    Assert.equal(32, crossAt(rise, phrases, 32, 0.4, 120));
    const late = { wait: 45, late: true };
    // 120 s long, 20 s in: the last phrase end within 45 s of now (the one at 50).
    Assert.equal(49.6, crossAt(late, phrases, 20, 0.4, 120));
    // The piece ends within the 45 s: it plays on to its end.
    Assert.null(crossAt(late, phrases, 90, 0.4, 120));
    // No phrase end within the wait: the piece plays on to the 45 s and crosses there.
    Assert.equal(65, crossAt(late, [10], 20, 0.4, 200));
    // Its length not known yet: a phrase end within the wait is still the last one.
    Assert.equal(49.6, crossAt(late, phrases, 20, 0.4, null));
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
    // A spectator's rise that is not clear waits for the pass to end too.
    Assert.equal("calm", passMood(nextPass(null, "calm", "theme", 4), "battle", false));
  });
});
