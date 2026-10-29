/**
 * The rulebook's NEWS AND TRAVEL section (build order item 7b): routes and their pace, the winter's dangerous passes and
 * seas (item 9), the road check, closing one's roads, and news of distant land travelling. The numbers come from the map data and
 * the engine's own constants, so the text stays true if they change. Only what applies in this game is said.
 */
import { AllPowers, CrossedRivers, Crossings, LandData, Pace, WinterData, RoadOdds, Rivers, TravelData, WorldMap, max, min, travelTurns, type GameConfig } from "@amarna/engine";
import { joinS } from "./text.ts";

/**
 * How long envoys take between courts, as the map makes them in the sailing season: between courts, and, if longer, to a
 * distant province a spy is sent to watch. Worked out from the map, so it stays true if the paces change.
 */
export function travel(c: GameConfig): string {
  const map = WorldMap.default;
  const turns = (from: string, to: string): number => travelTurns(c, map, from, to, 1);
  const courts = AllPowers.flatMap((a) => AllPowers.filter((b) => b !== a).map((b) => turns(map.capital(a).id, map.capital(b).id)));
  const fields = max(
    AllPowers.flatMap((a) => map.provinces.filter((x) => !x.isSea).map((x) => turns(map.capital(a).id, x.id))),
    (x) => x,
  );
  const lo = min(courts, (x) => x);
  const hi = max(courts, (x) => x);
  const text = `Envoys take about ${lo === hi ? `${lo}` : hi === lo + 1 ? `${lo} or ${hi}` : `${lo} to ${hi}`} season${hi === 1 ? `` : `s`} each way between courts in the sailing season (ENVOY TRAVEL in your view gives each court this season; see NEWS AND TRAVEL)`;
  return text + (fields > hi ? `; a spy sent to watch a distant province may take up to ${fields} seasons to reach it, and its reports as long to come home.` : `.`);
}

/** NEWS AND TRAVEL: routes, pace, winter, the road check, closed roads, and news. */
export function travelRules(c: GameConfig): string {
  const passes = joinS(
    `, `,
    Crossings.filter((x) => x.kind === "Mountain").map((x) => `${x.name} (${x.a}-${x.b})`),
  );
  const floods = joinS(
    `; `,
    [...Rivers, ...CrossedRivers].filter((r) => Crossings.some((x) => x.river === r.id)).map((r) => `the ${r.name} in ${["Akhet", "Peret", "Shemu"][r.flood]}`),
  );
  const boats = joinS(
    `; `,
    Rivers.map((r) => (r.up > 0 ? `on the ${r.name} both ways, faster downstream` : `on the ${r.name} downstream only`)),
  );
  const lines: string[] = [`NEWS AND TRAVEL`];
  lines.push(
    `- Envoys and spies travel a road of provinces, link by link, and each link takes as long as its length and ground make it: about ${Pace.open} km a day on open ground, ${Pace.rough} over rough ground and ${Pace.pass} over mountain passes, ${Pace.desert} across the desert, ${Pace.coasting} a day by ship along the coast and ${Pace.openSea} on an open-sea crossing, quicker with the current. Boats carry them along the great rivers where that is quicker (${boats}). Crossing a great river at a ford or ferry costs ${TravelData.ferryDays} day, ${TravelData.ferryDays + TravelData.floodDays} in its flood season (${floods}). A traveller makes about ${c.travelDays} days of road a season, the rest going on halts, audiences and waiting at borders, and what it does not use carries over to the next season, so a journey's length counts to the day.`,
  );
  lines.push(
    `- Winter closes nothing, but the mountain passes (${passes}) and the open sea are dangerous then, in the same season. A traveller takes ${TravelData.winterPassPercent / 100} times as long over a snowbound pass and meets the snow on the road (below). An army that crosses a pass in winter, or is carried over the open sea then, loses men to cold, hunger and desertion or to the storms: about ${c.winterArmyLoss} in 100 of a full army's men, in proportion to its men, so a small company loses far fewer; a fleet that crosses the open sea in winter about ${c.winterFleetLoss} in 100 of a full fleet's crews the same way. One that carries a season's food loses ${WinterData.suppliedPercent} in 100 of what it would lose without. The weather makes it between half and half again as bad. On a pass, ${WinterData.desertPercent} in 100 of those lost desert and stay loose where the army set out. A troop left with fewer than ${LandData.levyLeast} men is lost whole. Nobody expects troops in winter, and news of them travels no faster than they do.`,
  );
  lines.push(
    `- Your people choose their own road from what your court knows: who holds each province, the troops you can see, and the kings you have heard closed their roads to you. A bold traveller takes the short, dangerous road and a careful one the long, safe one. Old news makes bad roads.`,
  );
  lines.push(
    `- On the road: once a season, in one province of the stretch a traveller crossed that season (chosen by the share of the season spent in each; a link's time counts half in the province at each end, and a desert link in the desert), it may be stopped. The chance in percent: ${RoadOdds.troops} if troops (army or fleet) of a king who has closed his roads to its court stand there; ${RoadOdds.found} if it is sneaking through that king's land (below), ${RoadOdds.foundGold} more if it carries gold and ${RoadOdds.foundTablets} more if it carries tablets, and a third of what that king spends on watchmen that season; outlaws ${RoadOdds.kingless} in land without a king, ${RoadOdds.free} in land held by no one, ${RoadOdds.royal} in a king's, and more where a band works (ROADS AND OUTLAWS), at sea too where pirates work off the coast; storms ${RoadOdds.storm} at sea, ${RoadOdds.winterStorm} in winter; snow ${RoadOdds.snow} at either end of a pass crossed in winter; ${RoadOdds.desert} in the desert, where supplies run out. These add up, to at most ${RoadOdds.most}, and the traveller's skill (0-100) takes off up to half. Caught by troops or found sneaking, it is that king's captive: he reads an envoy's letter and mandate and takes its gold and tablets, and may execute, ransom or release it (a spy, also turn it); you hear only, a season after it was due, that it has not returned. Robbed by outlaws, it loses the gold it carries and its own purse, which become the robbers', and on the way out gives up its errand and comes home; a band may kill it. Stopped by nature on the way out it turns back; on the way home it is held up a season. Your news tells you why one came back early.`,
  );
  lines.push(
    `- Closing your roads (close_roads, naming a power; open_roads to undo it): it stands until you change it. Your men then turn back that court's envoys and spies at your border, unless they are going to or coming from your own court, and your troops anywhere may seize them (above). A traveller who knows your roads are closed goes round your land or sneaks through it off the road, which takes half as long again and may be found. The court hears of it by word, as late as the journey from your capital takes; its travellers turned back at your border bring it home too.`,
  );
  lines.push(
    `- News of distant land travels. Who holds a province you see is as it is now. Elsewhere you know it from word, which goes by the fastest road and reaches you as late as that journey takes, so a province two seasons away shows its holder as of two seasons ago; and from your own people, who bring home who held each province they passed through when they passed. LANDS marks each province you do not see with the turn your news of it dates from. Word of a kingdom's fall travels the same way. Rumours and ransoms travel by the fastest road, talk carried by many. A spy's report from abroad needs a carrier (ROADS AND OUTLAWS).`,
  );
  return joinS(`\n`, lines);
}
