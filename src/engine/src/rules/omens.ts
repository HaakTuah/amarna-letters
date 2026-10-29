/**
 * Omens of the end ("Omens of the end" under Victory, built with the royal council in build order item 16). Each season
 * every court's diviners read the signs, and the signs darken as the public chance of the end grows: in tiers, never in
 * numbers. Presentation only: no rule checks an omen, and nothing here reads the drawn last season (rules/ending.ts).
 *
 * - The tiers follow the public chance alone, quiet, troubled, then grave, as it passes 40% and 75% of its level at the
 *   table's median season (first guesses).
 * - Borrowed time: from a season drawn in secret near the median (85% to 115% of it, from the game's seed and "omens" alone,
 *   so no other roll can shift it and it says nothing of the last season), the diviners say the age has outlived its
 *   measure: the tone changes, not only the strength.
 * - The darkest tier comes at the bottom of the cap's range (season 80 by default) and then holds, so it tells nothing
 *   beyond the range itself. With no cap it comes where the chance reaches its level at that season for the default table
 *   (80 of a 44-season median).
 * - An open age has no end to foreshadow: the omens fall silent.
 *
 * Each court reads in its own diviners' voice: Babylonia, Assyria and Mitanni the liver; Hatti and Arzawa oracles that
 * answer yes or no; Egypt the gods turning away (the Restoration Stela); Alashiya the eagle diviner and the hand of Nergal
 * (EA 35). Courts the sources say nothing of read in a plain voice ("Start from" in docs/history/14-courts-and-free-cities.md).
 * Voice may name a power ("Different data, same rules"); the tier never does.
 */
import { Rng } from "../core/rng.ts";
import type { GameConfig } from "../model/config.ts";
import type { Power } from "../model/power.ts";
import { endChanceAt } from "./ending.ts";

export const OmenTierValues = ["Quiet", "Troubled", "Grave", "Borrowed", "Darkest"] as const;
export type OmenTier = (typeof OmenTierValues)[number];

/** First guesses: the share of the median season's chance at which the signs turn troubled, then grave. */
const TroubledAt = 0.4;
const GraveAt = 0.75;
/** With no cap: the darkest tier where the default table reaches it (season 80 of a 44-season median). */
const DarkestNoCap = 80 / 44;

/** The season, drawn in secret near the median, from which the diviners speak of borrowed time. */
export function borrowedFrom(seed: number, c: GameConfig): number {
  const r = Rng.for(seed, 0, "omens");
  return Math.max(2, Math.round(c.endMedian * (0.85 + 0.3 * r.nextDouble())));
}

/** The tier of the signs in a season, or null in an open age. */
export function omenTier(seed: number, c: GameConfig, turn: number): OmenTier | null {
  if (c.openAge) return null;
  const median = Math.max(1, c.endMedian);
  const darkest = c.capped ? Math.max(1, Math.min(c.capMin, c.capMax) || 1) : Math.round(median * DarkestNoCap);
  if (turn >= darkest) return "Darkest";
  if (turn >= borrowedFrom(seed, c)) return "Borrowed";
  const share = endChanceAt(turn, median) / Math.max(1e-12, endChanceAt(median, median));
  return share >= GraveAt ? "Grave" : share >= TroubledAt ? "Troubled" : "Quiet";
}

type Voice = "Liver" | "Oracle" | "Egypt" | "Eagle" | "Plain";

/** Whose diviners speak in which voice: presentation, after the sources (see the head of this file). */
const voices: Record<string, Voice> = {
  Babylonia: "Liver",
  Assyria: "Liver",
  Mitanni: "Liver",
  Hatti: "Oracle",
  Arzawa: "Oracle",
  Egypt: "Egypt",
  Alashiya: "Eagle",
};

const lines: Record<Voice, Record<OmenTier, string[]>> = {
  Liver: {
    Quiet: [
      "The diviners read the sheep's liver: the station is in its place and the path is clear. The signs favour the king and the land.",
      "The liver is whole and well formed; the diviners find no mark against the age.",
    ],
    Troubled: [
      "The diviners find a faint mark on the left of the liver, the enemy's side: the age has begun to turn.",
      "A thin line crosses the path on the liver; the diviners write that the age has its measure, and part of it is spent.",
    ],
    Grave: [
      "The liver is marked on both sides; the diviners write that the days of the age are numbered, though no one can count them.",
      "The station is loose and the finger bent: the diviners say the end of the age is no longer far.",
    ],
    Borrowed: [
      "The diviners have read the same marks for many seasons, and still the age stands: it has outlived its measure and lives on borrowed days.",
    ],
    Darkest: [
      "The liver bears the mark of Ibbi-Sin, the last king of Ur, whose land was given to the wind: the diviners say the age may close in any season.",
    ],
  },
  Oracle: {
    Quiet: [
      "The augurs asked the gods whether the age will hold: the birds flew on the favourable side. Favourable.",
      "The Old Woman drew the lots on the age: favourable.",
    ],
    Troubled: [
      "The augurs asked again, as the rite allows: the first answer favourable, the second unfavourable. They ask which god is angry.",
      "The entrail readers find the signs mixed: favourable for the king, unfavourable for the age.",
    ],
    Grave: [
      "Question after question comes back unfavourable; the diviners chain them to find the angry god, and have not found him.",
      "The birds, the liver and the lots agree only that the age is ending: unfavourable.",
    ],
    Borrowed: [
      "The augurs say the end they read long ago has not come: the gods are holding their hand, and nobody knows for how long.",
    ],
    Darkest: ["Every question is answered unfavourable, by the birds, by the liver and by the Old Woman's lots. The gods' anger does not lift."],
  },
  Egypt: {
    Quiet: [
      "The chief lector priest reads the sacred books and the dreams: the gods are in their shrines, and the land is at peace with them.",
      "The lector priests find the dreams of the season good, and the offerings well received.",
    ],
    Troubled: [
      "The lector priests report dreams that trouble them; the offerings are made, and the gods are slow to answer.",
      "The lector priests say the gods hear the prayers of this land less readily than they did.",
    ],
    Grave: [
      "The lector priests say the gods have grown distant: prayers are answered late, if at all, and the dreams are dark.",
      "The sacred books are searched for evil times like these; the lector priests say the age is near its end.",
    ],
    Borrowed: [
      "The lector priests have long said the gods were leaving, and still the age goes on: they speak of a time lent, not given.",
    ],
    Darkest: [
      "The lector priests say the gods are turning away from this land: if one prays to a god to ask a thing of him, he does not come.",
    ],
  },
  Eagle: {
    Quiet: ["The eagle diviner watches the birds: they fly from the right, and the sky is clean.", "The eagles keep to their heights; the diviner reads no harm in them."],
    Troubled: [
      "The eagle diviner saw an eagle turn back over the sea; he says the age has turned with it.",
      "The birds fly late and few; the eagle diviner says the age has begun to wane.",
    ],
    Grave: [
      "The birds fly low and from the left; the diviner fears the hand of Nergal over the land.",
      "The eagle diviner says the birds have read the end of the age, and only its season is hidden.",
    ],
    Borrowed: ["The eagle diviner has foretold the end for many seasons and it has not come; he says the age flies now on borrowed wind."],
    Darkest: ["The hand of Nergal is in the land, the diviner says, and the eagles have gone from the sky."],
  },
  Plain: {
    Quiet: ["The seers read the signs: they are quiet, and the age stands firm.", "The seers find nothing in the signs against the age."],
    Troubled: ["The seers say the signs have begun to trouble them: the age has turned.", "The seers find the signs uneasy; the age has its measure, and part of it is spent."],
    Grave: ["The seers say the signs are grave: the age is near its end, though nobody can say when.", "The seers read dark signs, season upon season: the end of the age is no longer far."],
    Borrowed: ["The seers say the end they read long ago has not come: the age has outlived its measure and lives on borrowed time."],
    Darkest: ["The seers say every sign is against the age: it may close in any season."],
  },
};

/** What a court's diviners say of the end this season ("" in an open age), seeded so a replay reads the same. */
export function omenLine(seed: number, c: GameConfig, turn: number, court: Power | null): string {
  const tier = omenTier(seed, c, turn);
  if (tier === null) return "";
  const voice = (court !== null ? voices[court] : undefined) ?? "Plain";
  const choices = lines[voice][tier];
  return choices[Rng.for(seed, turn, "omen", court ?? "").next(choices.length)];
}
