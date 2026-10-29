/**
 * The rulebook's BUILDING AND POLICING part (build order item 15, "One rule for everything built", "Paid in gold or in
 * labour", the roads term of "What sets a company's pace", "A road belongs to the land it crosses", "Pirates and bandits",
 * "Tolls and smuggling", "Walls price the storm, not the clock", "Water too"): walls, roads, relay stations, harbours,
 * policing and water works as levels with upkeep, decay and projects. The numbers are read from the engine's data, so
 * the text stays true if they change.
 */
import { buildGold, LandData, PoliceMenPerLevel, PolicePerShekel, RepairData, WorksData, WorksEffect, type GameConfig, type WorkKind } from "@amarna/engine";

const line = (k: WorkKind, what: string): string => {
  const d = WorksData[k];
  const decay = d.decay <= 0 ? "gone at once" : `a level falls after ${d.decay} seasons unpaid`;
  const build = d.seasons <= 0 ? "hired at once, the first season's pay" : `${d.seasons} season${d.seasons === 1 ? "" : "s"} of work a level, each costing ${d.cost} x the level being built, or ${d.builders} men by corvée`;
  const upkeep = k === "Policing" ? `a shekel a season for every ${PolicePerShekel} levels (${PolicePerShekel * PoliceMenPerLevel} men), or the police themselves by corvée` : `${d.upkeep} a level a season, or ${d.upkeepMen} men a level by corvée`;
  return `  ${what}: up to ${k === "Policing" ? `${d.most * PoliceMenPerLevel} men, in tens` : `level ${d.most}`}; upkeep ${upkeep}; unpaid, ${decay}; building ${build}.`;
};

export function worksRules(_c: GameConfig): string {
  const e = WorksEffect;
  return [
    `BUILDING AND POLICING`,
    `- Walls, roads, relay stations, harbours, policing and water works are each a level in a province, and follow one rule. Each level costs upkeep every season; paid, it holds; unpaid, it decays at its kind's rate. A level above what stands is raised by a project, a level at a time over the seasons. You pay either in gold, which hires the province's own people (their pay goes into its purse), or by corvée, labour as tax: no gold, but the men are taken from the province's men of fighting age for the season, away from its fields, so its next harvest is smaller; if too few men are at home, it is not paid that season. What stands where you have given no order is kept by corvée, as it is, the normal way of the age. WORKS in your view gives, for each of your provinces, what stands, what you ordered kept, a project's seasons done and needed, and what a season of each costs.`,
    `- The kinds:`,
    line("Walls", "Walls"),
    line("Roads", "Roads"),
    line("Stations", "Relay stations (posts with fresh animals and stores)"),
    line("Harbour", "Harbours (only on a coast)"),
    line("Policing", "Policing (paid men, not built)"),
    line("Water", `Water works (a well sunk, a cistern dug, a guarded way down to a spring outside the walls; twice the cost in arid ground)`),
    `- Order build (gold) or build_corvee (corvée), naming the province of yours, in item what (walls, roads, stations, harbour, police, water) and in amount the level to keep (police: the men). It stands until you change it. Above what stands, a project starts and the first season's work is paid at the end of this season; below it, the levels above go unkept and decay; 0 keeps none. War stops a project: no work is done where foreign troops stand or a siege lies, and none is paid for; under siege only the walls, water works and police inside the walls are kept. A province you lose passes with what stands in it, and your orders for it lapse; one you take you keep as it stands, by corvée, until you order otherwise.`,
    `- Repairing walls under siege: while your city is besieged, an order for its walls (build or build_corvee, keeping at least the level standing) repairs them: each season ${RepairData.men} of the city's men of fighting age and ${RepairData.food} measures from its stores make good a step of the siege's wear, if the city has them. Gold from your treasury cannot reach a besieged city.`,
    `- Roads: a road belongs to the land it crosses, so each half of a link between two provinces is as good as the road of the province it lies in, and the province's holder keeps it. By level, the time on a half link on land: ${e.roadPercent.map((p, i) => `${i} ${p}%`).join(", ")} of a kept track's (level 1, the journey times the map gives). Everyone on the road goes faster on a good road, armies and caravans and the enemy's armies included; off the road (sneaking) and on the water, roads count for nothing. Relay stations speed a lone traveller on the road, your couriers, envoys and spies, on top of the road: ${e.stationPercent.map((p, i) => `${i} ${p}%`).join(", ")}. So roads and stations bring distant provinces within your couriers' season and speed your orders and reports (COMMAND AT A DISTANCE), and speed an invader just as well. A traveller who passes openly through another king's land uses his stations, and the letter it carries is read there: that king's station men tell him what it says. Your own couriers' orders read at a foreign station likewise. An army of yours standing in land another holds may raze a level of its roads, relay stations, harbour or water works (unit order raze, naming in target which), cutting his roads; what stands in land you take is yours to keep.`,
    `- Harbours: a harbour shelters ships through the winter. A fleet of yours in winter (Peret) in the waters of a coast where you hold a harbour, or have basing, has room there for ${e.harbourRoom.slice(1).map((r, i) => `${r} men of crews at level ${i + 1}`).join(", ")}, the room of all your harbours on those waters together; crews beyond the room winter on open beaches, and storms take ${e.exposedPercent} in a hundred of them. A landing needs no harbour.`,
    `- Policing: police hold the loose men's take, the bands' odds on the road and the chance that a crowd raises a chief down to 100 - ${e.policeMost} x men / (men + ${e.policeHalf}) in a hundred of what they would be (your troops standing there hold them to ${LandData.policedPercent} in a hundred; the lower counts). They also find smugglers and those sneaking through your land: a point for every ${e.policeFound} police in the province entered. Their pirates' odds at sea fall with the police of the coast the pirates put out from. Police reach only where your men can go: nowhere foreign troops stand, and in a besieged city only inside the walls, not on its roads and fields.`,
    `- Water works: a city whose water can fail drinks ${e.waterSeasons} seasons of siege longer for each level, and one whose spring lies outside its walls never runs dry once it has a level (a guarded way down). A city on a river, a spring inside its walls or wells reaching groundwater needs none, and an island's water comes by boat.`,
    `- Joint works: a road built with a neighbour is each side's own half, in his own land; who pays what is only words on a tablet (the clauses of a letter, kept or not), and gold changes hands as gifts do.`,
    `- At the start: walls as the sources give each city (capitals included: Akhetaten has none, Egypt's defence being its distance and its forts); every land with a lord keeps a track (roads 1), the Ways of Horus from the Delta to Gaza roads 2 with relay stations 1, the lands without towns none; the great ports (Ugarit, the Delta, Byblos, Tyre) harbours 3, the lesser ports 2, every other coast a beach, 1; police 20 men in each land with a lord, 50 in bandit country and on the frontiers, none in the lands without towns. A first season's projects cost, for example, ${buildGold("Roads", "", 2)} shekels for a road's second level.`,
  ].join("\n");
}
