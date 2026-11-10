import { governorLine } from "../map/holding.ts";
import { facedAcross } from "../map/land-layers.ts";
import {
  Crossings,
  WorldMap,
  capacityOf,
  connectionDays,
  connectionNote,
  EconomyData,
  reapSeasonOf,
  reckonedOf,
  economyOf,
  countOf,
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
 modernOf,
  describedAs } from "@amarna/engine";
import { ownEconomy, unitKindName, type MapScene } from "../map/scene.ts";
import { about, counted, powerName, provinceName, shekels, when } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";
import type { HistoryOf } from "./HistoryPanel.tsx";
import { LearnMore } from "./LearnMore.tsx";
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
    const waters = provinceName(p.waters);
    lines.push(`An army lands here from the sea only when no enemy fleet holds ${waters}.`);
    // A port whose way to its waters is longer than the map draws it (#554): what makes it so, and the voyage's days.
    const note = connectionNote(p.id, p.waters);
    if (note !== null) lines.push(`${note} A ship takes about ${Math.round(connectionDays(WorldMap.default, p.id, p.waters))} days to reach ${waters}.`);
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
  onHistory,
}: {
  state: GameState;
  id: string;
  scene: MapScene;
  onClose: () => void;
  onPerson: (id: string) => void;
  onHistory: (h: HistoryOf) => void;
}) {
  const map = WorldMap.default;
  const p = map.get(id);
  const owner = scene.owner.get(id) ?? null;
  const units = scene.units.filter((u) => u.province === id);
  // Where its border glows: the armies the seat sees now on the other side of each such frontier (#586).
  const faced = facedAcross(scene, id).map((q) => ({ q, armies: scene.units.filter((u) => u.province === q && u.kind === "Army" && !u.ghost) }));
  const people = scene.people.filter((x) => x.province === id);
  const age = scene.viewer === null ? 0 : (scene.fogAge.get(id) ?? -1);
  const terrain = terrainOf(id);
  const rivers = riversThrough(id).map((r) => r.name);
  const crossings = Crossings.filter((c) => (c.a === id || c.b === id) && c.kind !== "Desert");
  const walls = scene.walls.get(id) ?? 0;
  const siege = scene.sieges.find((x) => x.province === id);
  // Its economy, as the viewer may know it: in god view as it is; in a seat view only in land it knows it holds (never by
  // the true owner): from the live state where it holds it now (as the engine's own view of a court shows it its
  // provinces), and from the season it last held it where it was lost without its knowing (map/known.ts), the figures its
  // stewards last sent and nothing newer, until word of the loss arrives. Looking back at an earlier season, the live state
  // is a later one, so the card gives only that season's recorded figures (`ownEconomy`).
  const mine = ownEconomy(scene, id);
  const live = mine !== null && mine.live;
  return (
    <MapCard
      className="infocard"
      label={provinceName(p.id)}
      onClose={onClose}
      head={
        <>
          <Emblem power={p.isSea ? null : owner} />
          <h3>
            {provinceName(p.id)} {p.capital && <small className="muted">· capital of {p.home !== null ? powerName(p.home) : ""}</small>}
          </h3>
          {/* "Places by their own names", for the human player only: what the name alone does not say, then the modern name. */}
          {(describedAs(p.id) !== null || modernOf(p.id) !== null || provinceName(p.id) !== p.name) && (
            <small className="muted">
              {[provinceName(p.id) !== p.name ? `in 1346 ${p.name}` : null, describedAs(p.id), modernOf(p.id) !== null ? `today ${modernOf(p.id)}` : null]
                .filter((x) => x !== null)
                .join(", ")}
            </small>
          )}
          {/* Item 17+++b: its history, and what to read of it outside the game. */}
          <button className="small link" onClick={() => onHistory({ kind: "province", id: p.id })}>
            History
          </button>
          <LearnMore state={state} kind="province" id={p.id} />
        </>
      }
    >
      {p.isSea ? (
        <p className="small">
          {WorldMap.default.coastsOf(p.id).length > 0
            ? `The waters of ${WorldMap.default.coastsOf(p.id).map((x) => provinceName(x.id)).join(" and ")}: a fleet here blockades ${WorldMap.default.coastsOf(p.id).length > 1 ? "them" : "it"}, and no army lands there against it.`
            : "The open sea."}{" "}
          Fleets here can convoy armies across, one fleet in each sea zone of the way.
          {WorldMap.default.edges.some((e) => e.open && (e.a === p.id || e.b === p.id)) ? " An open-sea crossing leaves from here: dangerous in winter, the second season of the year, when storms may sink a fleet and the army it carries." : ""}
        </p>
      ) : (
        <>
          <p className="small">
            {owner !== null ? `Held by ${powerName(owner)}` : "Held by no one"}
            {age > 0 ? ` as of ${age} season${age === 1 ? "" : "s"} ago, as far as you have heard` : ""}. Its tax brings in about {taxOf(live ? Math.floor(state.reaped.getOrDefault(p.id, 0) / 3) : harvestOf(p))} measures of grain a season{economyOf(p).mine > 0 ? `, and its mines ${shekels(economyOf(p).mine)}` : ""}
            {p.home !== null && p.home !== owner ? `; part of the homeland of ${powerName(p.home)}` : ""}.
            {(() => {
              // Item 17++, part C: who stands between the king and the land, as the viewer knows it.
              const h = scene.holding.get(p.id);
              const gov = governorLine(scene, p.id);
              return h?.kind === "vassal" ? ` A vassal of ${powerName(h.overlord)}, by a tablet sealed between them.` : gov !== null ? ` ${gov}` : "";
            })()}
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
          {live && (
            <p className="small">
              {/* The economy at home (item 9+a): what its own king's stewards report, or anyone in god view. */}
              Stores {scene.viewer === null ? state.stores.getOrDefault(p.id, 0) : `about ${about(state.stores.getOrDefault(p.id, 0))}`} of {capacityOf(p)} measures of grain. Its market holds {state.markets.tryGet(p.id)?.stock ?? 0} (its town
              needs {needOf(p)} a season) at {shekels(priceForTen(priceAt(state.markets.tryGet(p.id)?.stock ?? 0, needOf(p))))} for ten measures; its people&apos;s purse holds{" "}
              {shekels(state.markets.tryGet(p.id)?.purse ?? 0)}.
            </p>
          )}
          {mine !== null && !mine.live && (
            <p className="small">
              {/* Land lost without the court's knowing: what its stewards last sent, as the map shows it; or, looking back at an
                  earlier season, what was recorded then, never the present. */}
              {mine.age === 0 ? "That season" : `As your stewards last reported, ${mine.age} season${mine.age === 1 ? "" : "s"} ago`}: stores {scene.viewer === null ? mine.stores : `about ${about(mine.stores)}`} of{" "}
              {capacityOf(p)} measures of grain;{" "}
              {mine.settled === undefined ? (scene.viewer === null ? "no count of its people" : "its people never counted by your scribes") : `${scene.viewer === null ? mine.settled.toLocaleString("en") : counted(mine.settled, mine.countAge ?? 0)} on its land${scene.viewer === null ? "" : " as last counted"}`}
              {mine.fed !== undefined ? `; its countryside ate ${Math.round(mine.fed / 10)}% of its need` : ""}.{mine.age > 0 ? " No word has come since." : ""}
            </p>
          )}
          {live && state.people.has(p.id) && (
            <p className="small">
              {/* People at home (item 10+a): the town and the land apart (item 17++), in a seat view as its scribes last counted them. */}
              {(() => {
                const x = state.people.get(p.id);
                const c = scene.viewer === null ? null : countOf(state, scene.viewer, p.id);
                const n = scene.viewer === null ? { town: economyOf(p).town * 1000, settled: x.settled, men: x.men, loose: x.loose, harvest: state.reaped.getOrDefault(p.id, 0), granary: state.granary.getOrDefault(p.id, 0), crop: state.crop.getOrDefault(p.id, 0) } : c;
                const amount = state.amounts.tryGet(p.id);
                const asked = amount !== undefined ? `${amount} measures of grain a season` : `${state.shares.getOrDefault(p.id, EconomyData.taxPercent)}% of its last harvest`;
                if (n === null) return `Your scribes have never counted it (order a census); by a rough guess, ${counted(reckonedOf(WorldMap.default, p.id).settled, null)} live on its land. You ask ${asked}.`;
                // God view exact; a seat's count shows two figures while under a year old, then one ("Counts as the scribes knew them").
                const age = c === null ? 0 : state.turn - c.turn;
                const f = (x: number): string => (c === null ? x.toLocaleString("en") : counted(x, age));
                return (
                  <>
                    {c !== null ? `As your scribes counted it in ${when(c.turn, scene.viewer)}: ` : ""}
                    {f(n.town)} in the town; {f(n.settled)} on its land ({f(n.men)} men of fighting age), its land carrying{" "}
                    about {about(reckonedOf(WorldMap.default, p.id).room)}; {f(n.loose)} loose. {scene.viewer === null ? "Its king asks" : "You ask"} {asked}; its last harvest {f(n.harvest)} measures, a third of it a season; its farmers&apos; granaries
                    held {f(n.granary)}, and the crop in its fields {f(n.crop)}, reaped in {reapSeasonOf(p.id) === 0 ? "Akhet" : reapSeasonOf(p.id) === 1 ? "Peret" : "Shemu"}
                    {state.fed.has(p.id) ? `; last season its countryside ate ${Math.round(state.fed.get(p.id) / 10)}% of its need` : ""}.
                  </>
                );
              })()}
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
      {faced.length > 0 && <p className="small">Its border glows where two powers' armies face each other. On the other side, as you see them this season:</p>}
      {faced.map(({ q, armies }) => (
        <p className="small" key={q}>
          In {provinceName(q)}:{" "}
          {armies.map((u, i) => (
            <span key={u.key}>
              {i > 0 ? "; " : ""}
              <Emblem power={u.power} /> {u.count > 1 ? `${u.count} armies` : "an army"}
              {u.men > 0 ? `, ${u.men.toLocaleString("en")} men,` : ""} of {powerName(u.power)}
            </span>
          ))}
          .
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
