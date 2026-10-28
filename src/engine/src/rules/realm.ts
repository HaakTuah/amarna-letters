/**
 * The state of the realm each court gets at the start ("A state of the realm" under The world, built in item 11+): plain
 * facts from the data by one rule for all, never a role or a goal. What its land produces, what it lacks, whose land its
 * roads and coasts touch, and where it stands among the powers, with the vassal bonds of the opening relations. Each later
 * phase of the economy may add its part.
 */
import { economyOf, grainWorth, harvestOf, needOf } from "../model/economy.ts";
import type { WorldMap } from "../model/map.ts";
import { land, type Power } from "../model/power.ts";
import { alive, type GameState } from "../model/state.ts";
import { vassalBonds } from "../model/vassals.ts";

/** The title of the notice that brings it, in each court's inbox at the start. */
export const StateOfRealmTitle = "The state of the realm";

/** The state of `p`'s realm as the game starts. */
export function stateOfRealm(s: GameState, map: WorldMap, p: Power): string {
  const held = map.landProvinces.filter((x) => s.owner.getOrDefault(x.id, null) === p);
  const lines: string[] = [];
  // What it produces.
  const crop = held.reduce((a, x) => a + grainWorth(harvestOf(x)), 0);
  const metal = held.reduce((a, x) => a + economyOf(x).mine, 0);
  lines.push(
    `${land(p)} holds ${held.length === 1 ? held[0].name : `${held.length} provinces (${held.map((x) => x.name).join(", ")})`}; its land brings in about ${crop + metal} shekels' worth a season at reference prices${metal > 0 ? `, ${metal} of it gold and silver from its mines` : ""}.`,
  );
  // What it lacks.
  const need = held.reduce((a, x) => a + needOf(x), 0);
  const harvest = held.reduce((a, x) => a + harvestOf(x), 0);
  const lacks: string[] = [];
  if (harvest < need * 2) lacks.push(harvest < need ? "grain: its harvest falls short of what its towns and farmers eat" : "grain to spare: its harvest barely feeds its people");
  if (metal === 0) lacks.push("mines of its own");
  if (!held.some((x) => x.isCoastal)) lacks.push("a coast: its goods go by road");
  else if (!held.some((x) => economyOf(x).trading)) lacks.push("a market that trades abroad");
  lines.push(lacks.length === 0 ? "It lacks nothing the land gives." : `It lacks ${lacks.join("; ")}.`);
  // Whose land its roads and coasts touch.
  const touch = new Map<Power, string[]>();
  for (const x of held)
    for (const n of map.neighbors(x.id)) {
      if (map.get(n).isSea) continue;
      const o = s.owner.getOrDefault(n, null);
      if (o === null || o === p) continue;
      const names = touch.get(o) ?? [];
      if (!names.includes(map.get(n).name)) names.push(map.get(n).name);
      touch.set(o, names);
    }
  lines.push(touch.size === 0 ? "No land road leads from it to another power's land: its neighbours are across the sea." : `Its roads lead into the land of ${[...touch.entries()].map(([o, ns]) => (ns.length === 1 && ns[0] === o ? o : `${o} (${ns.join(", ")})`)).join(", ")}.`);
  // Where it stands among the powers.
  const ranked = [...alive(s)].sort((a, b) => s.startStrength.get(b) - s.startStrength.get(a) || a.localeCompare(b));
  const rank = ranked.indexOf(p) + 1;
  lines.push(`Of the ${ranked.length} powers, it is the ${ordinal(rank)} in wealth.`);
  const bonds = vassalBonds(s.tablets);
  const over = bonds.filter((b) => b.vassal === p);
  const under = bonds.filter((b) => b.overlord === p);
  if (over.length > 0) lines.push(`It is ${over.map((b) => `${b.overlord}'s vassal by a sealed tablet${b.tribute > 0 ? `, which names ${b.tribute} shekels of tribute a year` : ""}`).join(", and ")}.`);
  if (under.length > 0) lines.push(`Its vassals by sealed tablets: ${under.map((b) => `${b.vassal}${b.tribute > 0 ? ` (${b.tribute} a year)` : ""}`).join(", ")}.`);
  return lines.join(" ");
}

function ordinal(n: number): string {
  const words = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
  if (n <= words.length) return words[n - 1];
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${s}`;
}
