/**
 * Which piece plays next, and how long the quiet before it (item 19+++c). No mood is a switch: each next piece is drawn
 * by chance from the pieces of every mood, weighted toward the mood's own, as Paradox's games weigh each song by the
 * country's state, so the music is mostly the game's calm and its age and war is a share of it, never the whole. In war
 * about one piece in two is a war piece, in tension one in three, the rest tension or calm. The siege's and the battle's
 * pieces are earned: drawn only while the mood is theirs, and never two running. A rise is not drawn: the piece that
 * crosses on it is the new mood's own (`ownPiece`). Pure, the dice passed in, so it is tested and measured without a
 * browser.
 */
import { MoodPieces, type Mood } from "./situation.ts";

/** A mood's family of pieces: the war family is war, siege and battle. */
export type Family = "menu" | "calm" | "tension" | "war" | "last";

export const FamilyOf: Record<Mood, Family> = { menu: "menu", calm: "calm", tension: "tension", war: "war", siege: "war", battle: "war", last: "last" };

/** The share of the draw each family has in each mood (first guesses, for the owner's ear): a row sums to 1. */
export const Shares: Record<Family, Partial<Record<Family, number>>> = {
  menu: { menu: 1 },
  calm: { calm: 0.8, tension: 0.2 },
  tension: { calm: 4 / 15, tension: 0.4, war: 1 / 3 },
  war: { war: 0.5, tension: 0.25, calm: 0.25 },
  last: { last: 0.7, tension: 0.15, calm: 0.15 },
};

/** The quiet between two pieces, in seconds: a few seconds to half a minute, so the world's own sounds come through. */
export const Rest = { least: 4, most: 30 } as const;

/** Seconds of quiet after a piece ends. */
export const restFor = (dice: () => number): number => Rest.least + dice() * (Rest.most - Rest.least);

/** The pieces a family offers in a mood: the earned pieces (siege, battle) only in their own mood. */
function family(mood: Mood, fam: Family): readonly string[] {
  if (fam !== "war") return MoodPieces[fam];
  return mood === "siege" || mood === "battle" ? [...MoodPieces.war, ...MoodPieces[mood]] : MoodPieces.war;
}

/** The piece a rise crosses to: the new mood's own, the first of its pieces, another than the one playing where it has several. */
export function ownPiece(mood: Mood, playing: string | null, dice: () => number): string {
  const pieces = MoodPieces[mood];
  const others = pieces.filter((p) => p !== playing);
  const list = others.length > 0 ? others : pieces;
  return list[Math.floor(dice() * list.length)];
}

/**
 * The next piece for a mood: a family by its share, then a piece of it, another than the one just heard where the family
 * has another. The war family outside siege and battle has only the chariots, which may follow themselves (in another
 * variation, as the player never repeats a file), so war keeps its one piece in two.
 */
export function drawPiece(mood: Mood, last: string | null, dice: () => number): string {
  const shares = Object.entries(Shares[FamilyOf[mood]]) as [Family, number][];
  let roll = dice() * shares.reduce((a, [, w]) => a + w, 0);
  let fam = shares[shares.length - 1][0];
  for (const [f, w] of shares) {
    if (roll < w) {
      fam = f;
      break;
    }
    roll -= w;
  }
  const pieces = family(mood, fam);
  const others = pieces.filter((p) => p !== last);
  const list = others.length > 0 ? others : pieces;
  return list[Math.floor(dice() * list.length)];
}
