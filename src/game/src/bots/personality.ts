/**
 * How a script king plays. Every weight runs from 0 to 1. Each power has a historical archetype, and every game nudges
 * each weight by a seeded amount, so a king is recognisable from game to game but never quite the same.
 */
import { Rng, clamp, cmpNum, desc, sortBy, type Power } from "@amarna/engine";

export interface Personality {
  readonly epithet: string;
  readonly description: string;
  /** Appetite for war: how readily it attacks land that is not free. */
  readonly aggression: number;
  /** Weight on keeping what it has: troops held back, reserves of gold. */
  readonly caution: number;
  /** Keeps sealed oaths, sends fine gold, tells envoys the truth. */
  readonly honesty: number;
  /** Hoards gold rather than spending it. */
  readonly greed: number;
  /** Sends gifts and returns favours. */
  readonly generosity: number;
  /** Cares about titles: who is called brother and Great King. */
  readonly pride: number;
  /** Writes letters, seals tablets, builds coalitions. */
  readonly diplomacy: number;
  /** Spies, bribes, forgeries and turned captives. */
  readonly cunning: number;
  /** How long it remembers a wrong, and how hard it punishes one. */
  readonly vengeance: number;
  /** Prefers buying cities to conquering them. */
  readonly commerce: number;
}

const archetypes: Record<Power, Personality> = {
  Egypt: {
    epithet: "Pharaoh of the gilded gifts",
    description: "Proud and lavish, sends gold to keep the other kings in his debt (not always fine gold), and expands by buying the cities of Canaan.",
    aggression: 0.4,
    caution: 0.6,
    honesty: 0.45,
    greed: 0.35,
    generosity: 0.8,
    pride: 0.9,
    diplomacy: 0.75,
    cunning: 0.5,
    vengeance: 0.5,
    commerce: 0.75,
  },
  Hatti: {
    epithet: "the conqueror of Anatolia",
    description: "Expansionist and impatient, keeps oaths while they serve him, and strikes where a neighbour is weak.",
    aggression: 0.85,
    caution: 0.35,
    honesty: 0.4,
    greed: 0.45,
    generosity: 0.3,
    pride: 0.8,
    diplomacy: 0.5,
    cunning: 0.6,
    vengeance: 0.7,
    commerce: 0.3,
  },
  Babylonia: {
    epithet: "keeper of the old order",
    description: "Rich and status-conscious, counts every shekel of a gift, refuses to call upstarts brother, and fights only to protect his own.",
    aggression: 0.35,
    caution: 0.7,
    honesty: 0.65,
    greed: 0.75,
    generosity: 0.35,
    pride: 1.0,
    diplomacy: 0.7,
    cunning: 0.45,
    vengeance: 0.6,
    commerce: 0.6,
  },
  Mitanni: {
    epithet: "seeker of a patron",
    description: "Squeezed between Hatti and Assyria, courts the great kings with gifts and alliances, and keeps faith with whoever protects him.",
    aggression: 0.3,
    caution: 0.8,
    honesty: 0.75,
    greed: 0.4,
    generosity: 0.7,
    pride: 0.6,
    diplomacy: 0.95,
    cunning: 0.4,
    vengeance: 0.4,
    commerce: 0.5,
  },
  Assyria: {
    epithet: "the upstart who would be brother",
    description: "Ambitious newcomer, claims the title of Great King, pushes hard into Mitanni and Babylonia, and breaks oaths that hold him back.",
    aggression: 0.75,
    caution: 0.4,
    honesty: 0.35,
    greed: 0.5,
    generosity: 0.4,
    pride: 0.85,
    diplomacy: 0.6,
    cunning: 0.65,
    vengeance: 0.65,
    commerce: 0.4,
  },
  Arzawa: {
    epithet: "the western opportunist",
    description: "Survives by being courted, sells his friendship to the highest bidder, and is not above a forged tablet.",
    aggression: 0.5,
    caution: 0.55,
    honesty: 0.3,
    greed: 0.6,
    generosity: 0.35,
    pride: 0.5,
    diplomacy: 0.65,
    cunning: 0.8,
    vengeance: 0.5,
    commerce: 0.55,
  },
  Alashiya: {
    epithet: "the copper merchant",
    description: "Trade partner to all and threat to none: buys coastal cities, pays tribute rather than fights, and keeps his word.",
    aggression: 0.1,
    caution: 0.9,
    honesty: 0.8,
    greed: 0.55,
    generosity: 0.55,
    pride: 0.4,
    diplomacy: 0.75,
    cunning: 0.35,
    vengeance: 0.3,
    commerce: 1.0,
  },
};

/** The archetype for a power, varied by a seed: a script seat's own (see ScriptLeader.seatSeed), never the game's. */
export function personalityFor(p: Power, seed: number): Personality {
  const a = archetypes[p];
  const r = Rng.for(seed, 0, "personality", p);
  const j = (v: number): number => clamp(v + (r.nextDouble() - 0.5) * 0.3, 0, 1);
  // The jitter is drawn in the order of the C# record's with-expression: aggression first, commerce last.
  const aggression = j(a.aggression);
  const caution = j(a.caution);
  const honesty = j(a.honesty);
  const greed = j(a.greed);
  const generosity = j(a.generosity);
  const pride = j(a.pride);
  const diplomacy = j(a.diplomacy);
  const cunning = j(a.cunning);
  const vengeance = j(a.vengeance);
  const commerce = j(a.commerce);
  return { ...a, aggression, caution, honesty, greed, generosity, pride, diplomacy, cunning, vengeance, commerce };
}

export function archetype(p: Power): Personality {
  return archetypes[p];
}

/** The two or three traits that stand out, for display. */
export function highlights(t: Personality): string[] {
  const traits: [string, string, number][] = [
    ["warlike", "peaceable", t.aggression],
    ["cautious", "reckless", t.caution],
    ["honest", "faithless", t.honesty],
    ["greedy", "open-handed", t.greed],
    ["generous", "stingy", t.generosity],
    ["proud", "humble", t.pride],
    ["diplomatic", "aloof", t.diplomacy],
    ["cunning", "guileless", t.cunning],
    ["vengeful", "forgiving", t.vengeance],
    ["mercantile", "martial", t.commerce],
  ];
  return sortBy(traits, [(x: [string, string, number]) => Math.abs(x[2] - 0.5), desc(cmpNum)])
    .slice(0, 3)
    .map(([high, low, v]) => (v >= 0.5 ? high : low));
}
