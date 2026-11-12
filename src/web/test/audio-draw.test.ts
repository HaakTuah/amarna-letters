import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { FamilyOf, Rest, Shares, drawPiece, ownPiece, restFor } from "../src/audio/draw.ts";
import { MoodPieces, type Mood } from "../src/audio/situation.ts";

// Item 19+++c: no mood is a switch: each next piece is drawn by chance from the pieces of every mood, weighted toward the
// mood's own, and rests of silence fall between pieces. A seeded generator keeps the tests exact.
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** How the draws of a mood fall, by the family of piece drawn. */
function tally(mood: Mood, n = 6000): Record<string, number> {
  const dice = seeded(7);
  const out: Record<string, number> = {};
  let last: string | null = null;
  for (let i = 0; i < n; i++) {
    const piece = drawPiece(mood, last, dice);
    last = piece;
    const fam = (Object.keys(MoodPieces) as Mood[]).filter((m) => MoodPieces[m].includes(piece)).map((m) => FamilyOf[m])[0];
    out[fam] = (out[fam] ?? 0) + 1 / n;
  }
  return out;
}

describe("AudioDrawTests", () => {
  test("Every mood's shares sum to one", () => {
    for (const row of Object.values(Shares)) Assert.true(Math.abs(Object.values(row).reduce((a, b) => a + b, 0) - 1) < 1e-9);
  });

  test("In war about one piece in two is a war piece, in tension one in three, the rest tension or calm; calm has none", () => {
    for (const mood of ["war", "siege", "battle"] as const) Assert.true(Math.abs((tally(mood).war ?? 0) - 0.5) < 0.04);
    const tension = tally("tension");
    Assert.true(Math.abs(tension.war - 1 / 3) < 0.04);
    Assert.true(tension.tension > 0.25 && tension.calm > 0.25);
    const calm = tally("calm");
    Assert.equal(undefined, calm.war);
    Assert.true(calm.calm > 0.7);
  });

  test("Siege and battle pieces are earned: drawn only in their own mood, and never two running", () => {
    for (const mood of ["calm", "tension", "war", "last"] as const) {
      const dice = seeded(3);
      let last: string | null = null;
      for (let i = 0; i < 400; i++) {
        last = drawPiece(mood, last, dice);
        Assert.false(last === "siege" || last === "battle");
      }
    }
    const dice = seeded(5);
    let last: string | null = null;
    let seen = 0;
    for (let i = 0; i < 600; i++) {
      const piece = drawPiece("battle", last, dice);
      Assert.false(piece === "battle" && last === "battle");
      Assert.false(piece === "siege");
      if (piece === "battle") seen++;
      last = piece;
    }
    Assert.true(seen > 50);
  });

  test("A piece is another than the one just heard; the menu has only the Hymn", () => {
    const dice = seeded(11);
    let last: string | null = "kings";
    for (let i = 0; i < 200; i++) {
      const piece = drawPiece("calm", last, dice);
      Assert.true(piece !== last);
      last = piece;
    }
    Assert.equal("hymn", drawPiece("menu", "hymn", dice));
  });

  test("A rise crosses to the new mood's own piece", () => {
    const dice = seeded(2);
    for (let i = 0; i < 50; i++) {
      Assert.true(MoodPieces.war.includes(ownPiece("war", null, dice)));
      Assert.equal("battle", ownPiece("battle", "chariots", dice));
      Assert.true(MoodPieces.tension.includes(ownPiece("tension", "envoys", dice)));
      Assert.true(ownPiece("tension", "envoys", dice) !== "envoys");
    }
  });

  test("Rests of silence last a few seconds to half a minute", () => {
    Assert.equal(Rest.least, restFor(() => 0));
    Assert.equal(Rest.most, restFor(() => 1));
    Assert.true(Rest.least >= 3 && Rest.most <= 30);
  });
});
