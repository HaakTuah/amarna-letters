import { Crossings, WorldMap, riversThrough, terrainOf, type Crossing, type GameState, type Province, type Terrain } from "@amarna/engine";
import { unitKindName, type MapScene } from "../map/scene.ts";
import { powerName, provinceName, shekels, when } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";

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
  // The desert costs an army supplies unless its king holds it.
  if (terrain === "Desert" && state.config.desertUpkeep > 0)
    lines.push(`An army that ends a season here while its king does not hold it pays ${shekels(state.config.desertUpkeep)} for supplies; in its own land it pays nothing.`);
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
    <div className="infocard map-ui">
      <div className="info-head">
        <Emblem power={p.isSea ? null : owner} />
        <h3>
          {p.name} {p.capital && <small className="muted">· capital of {p.home !== null ? powerName(p.home) : ""}</small>}
        </h3>
        <button className="small" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {p.isSea ? (
        <p className="small">
          {WorldMap.default.coastsOf(p.id).length > 0
            ? `The waters of ${WorldMap.default.coastsOf(p.id).map((x) => x.name).join(" and ")}: a fleet here blockades ${WorldMap.default.coastsOf(p.id).length > 1 ? "them" : "it"}, and no army lands there against it.`
            : "The open sea."}{" "}
          Fleets here can convoy armies across, one fleet in each sea zone of the way.
          {WorldMap.default.edges.some((e) => e.open && (e.a === p.id || e.b === p.id)) ? " An open-sea crossing leaves from here: closed in winter, the second season of the year." : ""}
        </p>
      ) : (
        <>
          <p className="small">
            {owner !== null ? `Held by ${powerName(owner)}` : "A free city-state"}
            {age > 0 ? ` as of ${age} season${age === 1 ? "" : "s"} ago, as far as you have heard` : ""}. Yields {shekels(p.yield)} a season
            {p.home !== null && p.home !== owner ? `; part of the homeland of ${powerName(p.home)}` : ""}.
            {walls > 0 && (
              <span>
                {" "}
                Walls of level {walls}
                {scene.viewer === null || age === 0 ? "" : age < 0 ? " as the map gave them at the start" : " as your court last saw them"}: an attacker takes it
                at once only by storming them (a strength above the walls and the defenders together); otherwise its army stands inside and must besiege the
                city for as many seasons as the walls are high.
              </span>
            )}
            {walls > 0 && owner === null && <span> Buy it for {shekels(p.yield * state.config.neutralPriceFactor)}.</span>}
          </p>
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
          <Emblem power={u.power} /> {u.count > 1 ? `${u.count} ${unitKindName(u.kind)}s` : u.kind === "Army" ? "An army" : "A fleet"} of {powerName(u.power)}
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
    </div>
  );
}
