/**
 * The rulebook's TERRAIN and THE SEA sections (build order items 5 and 7a), with the lists from the map data
 * (`Geography`, `WorldMap`), so the text stays true if the map changes. Only what applies in this game is said.
 */
import { Crossings, Desert, Rough, WorldMap, crossingBetween, groupBy, type GameConfig } from "@amarna/engine";
import { joinS } from "./text.ts";

const crossingKind = (a: string, b: string) => crossingBetween(a, b)?.kind ?? null;

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
      `- The ground never helps a unit that moves, nor one met head on (both are on the road), nor empty land, nor an army landing from the sea (at sea the blockade decides: see THE SEA); a unit on rough ground still has its help against a landing. It adds nothing to walls and nothing to a siege's pace; but a storm must beat the walls plus the hold strength of the defenders it beat, and the ground's help to them is part of that. A support is cut as always. Your battle report gives the ground's share wherever it counted in the strength you had to beat.`,
    );
  }
  lines.push(`- Some links cross the desert (${deserts}); they give no help in battle. THE MAP marks them.`);
  lines.push(
    `- Desert (${joinS(`, `, Desert)}) feeds nobody: an army there finds nothing to take from the land and lives on its baggage, its king's stores there if he holds it, and the caravans he sends (see ECONOMY).`,
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
  // A sea joined to no other by water (the Red Sea since item 11c): reached only from its own shore.
  const closed = map.provinces.filter((p) => p.isSea && !map.edges.some((e) => e.kind === "Sea" && ((e.a === p.id && map.get(e.b).isSea) || (e.b === p.id && map.get(e.a).isSea))));
  const shared = map.provinces.filter((p) => p.isSea && map.coastsOf(p.id).length > 1 && !closed.includes(p)).map((p) => `${p.id} by ${joinS(` and `, map.coastsOf(p.id).map((x) => x.id))}`);
  const lines: string[] = [`THE SEA`];
  lines.push(
    `- Ships keep to the coasts. Every coast has waters of its own, a sea zone off its harbour and shore (THE MAP names each coast's waters)${shared.length > 0 ? `, shared only by neighbours that share a short shore: ${joinS(`; `, shared)}` : ``}. A fleet moves between a coast and its waters, along the shore between neighbouring coasts or neighbouring waters, and across the open sea only by the open-sea crossings (${open}).`,
  );
  if (closed.length > 0)
    lines.push(
      `- ${joinS(` and `, closed.map((p) => `${p.id} (reached from ${joinS(` and `, map.coastsOf(p.id).map((x) => x.id))}${map.edges.some((e) => (e.a === p.id || e.b === p.id) && crossingKind(e.a, e.b) === "Desert") ? `, by desert roads to its shore` : ``})`))} ${closed.length === 1 ? `is` : `are`} joined to no other sea: no fleet sails there from elsewhere, so the only ships on ${closed.length === 1 ? `it` : `them`} are those raised on ${closed.length === 1 ? `its` : `their`} own coasts.`,
    );
  lines.push(
    `- An army goes to sea only by convoy: a fleet of any power in each sea zone it sails through, each ordered to convoy it, from the waters of its own coast to the waters of the coast it lands on. So an army lands only where no enemy fleet holds that coast's waters: a fleet there must first be driven out. An island is reached only this way.`,
  );
  if (c.seaSupply > 0)
    lines.push(
      `- The blockade: a besieged coastal city is supplied by sea, and worn down ${c.seaSupply} step less each season, unless a fleet of its besieger holds its waters: so a lone army besieging a harbour that is supplied wears it down not at all. The sea does not feed it: it eats from its market and stores like any city, and only ships of its king's bring it grain, while its waters are open (ECONOMY). A fleet of the besieger's in a city's waters blockades it; your news says whether each siege of yours, or of your cities, was supplied or blockaded.`,
    );
  lines.push(
    `- The sea has a season. In winter, the second season of each year (Peret in Egypt), the open-sea crossings stay open but are dangerous: a fleet that crosses one may sink, and an army carried over one may be lost with it (NEWS AND TRAVEL gives the chances). Along the coasts ships sail all year.`,
  );
  return joinS(`\n`, lines);
}
