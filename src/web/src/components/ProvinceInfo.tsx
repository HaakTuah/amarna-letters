import {
  Crossings,
  WorldMap,
  capacityOf,
  EconomyData,
  harvestIn,
  reapSeasonOf,
  reckonedOf,
  economyOf,
  harvestOf,
  needOf,
  priceAt,
  priceForTen,
  riversThrough,
  taxOf,
  terrainOf,
  type Crossing,
  type GameState,
  type Province,
  type Terrain,
 modernOf } from "@amarna/engine";
import { unitKindName, type MapScene } from "../map/scene.ts";
import { aboutTwo, powerName, provinceName, shekels, when } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";
import { MapCard } from "./MapCard.tsx";

/**
 * What the ground does here (Build order item 5, terrain): rough ground and the crossings on its links give a unit that
 * stands its ground more against an attack. On a coast, the sea (item 7a): an army lands only where no enemy fleet holds
 * its waters, and a besieged city is supplied by sea unless its besieger's fleet does.
 */
function groundText(state: GameState, p: Province, terrain: Terrain, crossings: readonly Crossing[]): string {
  const t = state.config.terrainDefence;
  const lines: string[] = [];
  if (t <= 0) lines.push("The ground gives no defence in this game.");
  else if (terrain === "Rough") lines.push(`A unit standing its ground here holds with ${t} more against any attack.`);
  else {
    if (crossings.length > 0) lines.push(`A unit standing its ground here holds with ${t} more against an attack over ${[...new Set(crossings.map((c) => c.name))].join(" or ")}.`);
  }
  if (p.waters !== null) {
    const waters = WorldMap.default.get(p.waters).name;
    lines.push(`An army lands here from the sea only when no enemy fleet holds ${waters}.`);
    if (state.config.seaSupply > 0) lines.push(`Besieged, the city is supplied by sea, and worn down more slowly, unless its besieger's fleet holds ${waters}.`);
  }
  // The desert feeds nobody (item 9+a): an army here lives on its baggage, its king's stores and his caravans.
  if (terrain === "Desert") lines.push("The desert feeds nobody: an army here finds nothing to take from the land, and lives on its baggage, its king's stores and his caravans.");
  if (lines.length === 0) lines.push("The ground gives a defender nothing here.");
  return lines.join(" ");
}

/** One province as the current eyes know it: who holds it, its walls and ground, the troops and people there. */
export function ProvinceInfo({
  state,
  id,
  scene,
  onClose,
  onPerson,
}: {
  state: GameState;
  id: string;
  scene: MapScene;
  onClose: () => void;
  onPerson: (id: string) => void;
}) {
  const map = WorldMap.default;
  const p = map.get(id);
  const owner = scene.owner.get(id) ?? null;
  const units = scene.units.filter((u) => u.province === id);
  const people = scene.people.filter((x) => x.province === id);
  const age = scene.viewer === null ? 0 : (scene.fogAge.get(id) ?? -1);
  const terrain = terrainOf(id);
  const rivers = riversThrough(id).map((r) => r.name);
  const crossings = Crossings.filter((c) => (c.a === id || c.b === id) && c.kind !== "Desert");
  const walls = scene.walls.get(id) ?? 0;
  const siege = scene.sieges.find((x) => x.province === id);
  return (
    <MapCard
      className="infocard"
      label={p.name}
      onClose={onClose}
      head={
        <>
          <Emblem power={p.isSea ? null : owner} />
          <h3>
            {p.name} {p.capital && <small className="muted">· capital of {p.home !== null ? powerName(p.home) : ""}</small>}
          </h3>
          {/* Item 17+ ("Places by their own names"): the modern name on a second, smaller line, for the human player only. */}
          {modernOf(p.id) !== null && <small className="muted">today {modernOf(p.id)}</small>}
        </>
      }
    >
      {p.isSea ? (
        <p className="small">
          {WorldMap.default.coastsOf(p.id).length > 0
            ? `The waters of ${WorldMap.default.coastsOf(p.id).map((x) => x.name).join(" and ")}: a fleet here blockades ${WorldMap.default.coastsOf(p.id).length > 1 ? "them" : "it"}, and no army lands there against it.`
            : "The open sea."}{" "}
          Fleets here can convoy armies across, one fleet in each sea zone of the way.
          {WorldMap.default.edges.some((e) => e.open && (e.a === p.id || e.b === p.id)) ? " An open-sea crossing leaves from here: dangerous in winter, the second season of the year, when storms may sink a fleet and the army it carries." : ""}
        </p>
      ) : (
        <>
          <p className="small">
            {owner !== null ? `Held by ${powerName(owner)}` : "Held by no one"}
            {age > 0 ? ` as of ${age} season${age === 1 ? "" : "s"} ago, as far as you have heard` : ""}. Its tax brings in about {taxOf(scene.viewer === null || owner === scene.viewer ? Math.floor(state.reaped.getOrDefault(p.id, 0) / 3) : harvestOf(p))} measures of grain a season{economyOf(p).mine > 0 ? `, and its mines ${shekels(economyOf(p).mine)}` : ""}
            {p.home !== null && p.home !== owner ? `; part of the homeland of ${powerName(p.home)}` : ""}.
            {walls > 0 && (
              <span>
                {" "}
                Walls of level {walls}
                {scene.viewer === null || age === 0 ? "" : age < 0 ? " as the map gave them at the start" : " as your court last saw them"}: an attacker takes it
                at once only by storming them (a strength above the walls and the defenders together); otherwise its army stands inside and must besiege the
                city until it starves or the walls are breached.
              </span>
            )}
          </p>
          {(scene.viewer === null || owner === scene.viewer) && (
            <p className="small">
              {/* The economy at home (item 9+a): what its own king's stewards report, or anyone in god view. */}
              Stores {state.stores.getOrDefault(p.id, 0)} of {capacityOf(p)} measures of grain. Its market holds {state.markets.tryGet(p.id)?.stock ?? 0} (its town
              needs {needOf(p)} a season) at {shekels(priceForTen(priceAt(state.markets.tryGet(p.id)?.stock ?? 0, needOf(p))))} for ten measures; its people&apos;s purse holds{" "}
              {shekels(state.markets.tryGet(p.id)?.purse ?? 0)}.
            </p>
          )}
          {(scene.viewer === null || owner === scene.viewer) && state.people.has(p.id) && (
            <p className="small">
              {/* People at home (item 10+a). */}
              {/* Item 17++: its town and its land apart, as the engine keeps them: the town eats from the market, the land harvests. */}
              {(() => {
                const settled = state.people.get(p.id).settled;
                const town = Math.min(settled, economyOf(p).town * 1000);
                return p.town && town > 0
                  ? `About ${aboutTwo(town)} in the town; about ${aboutTwo(settled - town)} on its land. `
                  : "";
              })()}
              Its people: {state.people.get(p.id).settled.toLocaleString("en")} settled ({state.people.get(p.id).men.toLocaleString("en")} men of fighting age), its land
              carrying {reckonedOf(WorldMap.default, p.id).room.toLocaleString("en")}; {state.people.get(p.id).loose.toLocaleString("en")} loose. Tax{" "}
              {state.taxes.getOrDefault(p.id, EconomyData.taxPercent)}% of its last harvest, {state.reaped.getOrDefault(p.id, 0)} measures, a third of it a season; its
              farmers&apos; granaries hold {state.granary.getOrDefault(p.id, 0)}, and the crop in its fields {state.crop.getOrDefault(p.id, 0)}, reaped in{" "}
              {reapSeasonOf(p.id) === 0 ? "Akhet" : reapSeasonOf(p.id) === 1 ? "Peret" : "Shemu"}
              {state.fed.has(p.id) ? `; last season its countryside ate ${Math.round(state.fed.get(p.id) / 10)}% of its need` : ""}.
            </p>
          )}
          {siege !== undefined && (
            <p className="small">
              <Emblem power={siege.besieger} /> Besieged by {powerName(siege.besieger)} since {when(siege.since, scene.viewer)}: worn down {siege.progress} of{" "}
              {siege.walls}. It yields nothing while besieged.
            </p>
          )}
          <p className="small muted">
            {terrain === "Open" ? "Open ground" : terrain === "Rough" ? "Rough ground" : "Desert"}
            {rivers.length > 0 ? ` on the ${rivers.join(" and the ")}` : ""}
            {crossings.length > 0 ? `; ${crossings.map((c) => `${c.name} towards ${provinceName(c.a === id ? c.b : c.a)}`).join("; ")}` : ""}.{" "}
            {groundText(state, p, terrain, crossings)}
          </p>
        </>
      )}
      {units.map((u) => (
        <p className="small" key={u.key}>
          <Emblem power={u.power} /> {u.count > 1 ? `${u.count} ${unitKindName(u.kind)}s` : u.kind === "Army" ? "An army" : "A fleet"}
          {u.men > 0 ? `, ${u.men.toLocaleString("en")} men,` : ""} of {powerName(u.power)}
          {u.ghost ? `: last seen here in ${when(u.seenAt + 1, scene.viewer)}; it may have gone` : " stands here"}.
        </p>
      ))}
      {scene.viewer !== null && age !== 0 && (
        <p className="small muted">
          {age < 0
            ? "Never in your sight: you cannot see troops here."
            : `Out of your sight: you last saw troops here in ${when(scene.index - age + 1, scene.viewer)}, ${age} season${age === 1 ? "" : "s"} ago.`}{" "}
          Who holds it is known to every court.
        </p>
      )}
      {people.map((x) => (
        <p className="small tap" key={x.id} onClick={() => onPerson(x.id)}>
          <Emblem power={x.owner} /> {x.title} <span className="link">follow</span>
        </p>
      ))}
      <small className="muted">Neighbours: {[...new Set(map.neighbors(id))].map(provinceName).join(", ")}</small>
    </MapCard>
  );
}
