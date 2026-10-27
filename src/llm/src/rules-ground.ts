/**
 * The rulebook's TERRAIN and THE SEA sections (build order items 5 and 7a), with the lists from the map data
 * (`Geography`, `WorldMap`), so the text stays true if the map changes. Only what applies in this game is said.
 */
import { Crossings, Desert, Rough, WorldMap, groupBy, type GameConfig } from "@amarna/engine";
import { joinS } from "./text.ts";

/**
 * TERRAIN: what rough ground and the crossings give a unit that stands its ground, and what they never do, and what the
 * desert costs an army.
 */
export function terrainRules(c: GameConfig): string {
  const t = c.terrainDefence;
  const rough = joinS(`, `, Rough);
  const crossings = joinS(
    `, `,
    groupBy(
      Crossings.filter((x) => x.kind !== "Desert"),
      (x) => x.name,
    ).map(([key, g]) => `${key} (${joinS(` and `, g.map((x) => `${x.a}-${x.b}`))})`),
  );
  const deserts = joinS(
    `, `,
    groupBy(
      Crossings.filter((x) => x.kind === "Desert"),
      (x) => x.name,
    ).map(([key, g]) => `${key} (${joinS(` and `, g.map((x) => `${x.a}-${x.b}`))})`),
  );
  const lines: string[] = [`TERRAIN`];
  if (t <= 0) lines.push(`- In this game the ground gives no unit any help: rough ground, mountain passes and rivers change nothing in a battle.`);
  else {
    lines.push(
      `- The ground helps a unit that stands its ground: one that holds, besieges, supports or convoys, or whose own move fails. Against an attack it holds with ${t} more when it stands on rough ground (${rough}), or when the attack comes over a mountain pass or a great river, crossed at its fords and ferry towns (${crossings}): ${t} in all, however many of these apply. THE MAP marks the rough ground and the crossings on the links.`,
    );
    lines.push(
      `- The ground never helps a unit that moves, nor one met head on (both are on the road), nor empty land, nor a unit landing or attacked from the sea (at sea the blockade decides: see THE SEA). It adds nothing to walls and nothing to a siege's pace; but a storm must beat the walls plus the hold strength of the defenders it beat, and the ground's help to them is part of that. A support is cut as always. Your battle report gives the ground's share wherever it counted in the strength you had to beat.`,
    );
  }
  lines.push(`- Some links cross the desert (${deserts}); they give no help in battle. THE MAP marks them.`);
  if (c.desertUpkeep > 0)
    lines.push(
      `- Desert (${joinS(`, `, Desert)}) costs an army supplies: an army that ends a season in desert land its king did not hold when that season's moves were made pays ${c.desertUpkeep} with the next upkeep, and your treasury notice says so. An army in its own land pays nothing: a king who holds the desert crosses it freely, and so does whoever takes it, from the season after. Only armies pay it.`,
    );
  return joinS(`\n`, lines);
}

/** THE SEA: each coast's waters, landings and the blockade, the open-sea crossings and the winter. */
export function seaRules(c: GameConfig): string {
  const map = WorldMap.default;
  const open = joinS(
    `, `,
    map.edges.filter((e) => e.open).map((e) => `${e.a}-${e.b}`),
  );
  const shared = map.provinces.filter((p) => p.isSea && map.coastsOf(p.id).length > 1).map((p) => `${p.id} by ${joinS(` and `, map.coastsOf(p.id).map((x) => x.id))}`);
  const lines: string[] = [`THE SEA`];
  lines.push(
    `- Ships keep to the coasts. Every coast has waters of its own, a sea zone off its harbour and shore (THE MAP names each coast's waters)${shared.length > 0 ? `, shared only by neighbours that share a short shore: ${joinS(`; `, shared)}` : ``}. A fleet moves between a coast and its waters, along the shore between neighbouring coasts or neighbouring waters, and across the open sea only by the open-sea crossings (${open}).`,
  );
  lines.push(
    `- An army goes to sea only by convoy: a fleet of any power in each sea zone it sails through, each ordered to convoy it, from the waters of its own coast to the waters of the coast it lands on. So an army lands only where no enemy fleet holds that coast's waters: a fleet there must first be driven out. An island is reached only this way.`,
  );
  if (c.seaSupply > 0)
    lines.push(
      `- The blockade: a besieged coastal city is supplied by sea, and worn down ${c.seaSupply} step less each season, unless a fleet of its besieger holds its waters. A fleet of the besieger's in a city's waters blockades it; your news says whether each siege of yours, or of your cities, was supplied or blockaded.`,
    );
  lines.push(
    `- The sea has a season. In winter, the second season of each year (Peret in Egypt), the open-sea crossings are closed: no fleet crosses them and no convoy is carried over them, and an order to cross them is refused. Along the coasts ships sail all year.`,
  );
  return joinS(`\n`, lines);
}
