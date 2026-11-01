import { WorldMap, dateLabel, shortDate, type Province } from "@amarna/engine";
import { useState } from "react";
import type { MapScene } from "../map/scene.ts";
import { powerName } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";

/**
 * Every province as a list, with large rows to tap: the alternative to tapping small provinces on a phone map. A tap
 * selects the province as a tap on the map would (in the orders tab, it picks a unit or a destination).
 */
export function ProvinceList({ scene, selected, onProvince }: { scene: MapScene; selected: string | null; onProvince: (id: string) => void }) {
  const [filter, setFilter] = useState("");
  const groups = new Map<string, Province[]>();
  for (const p of WorldMap.default.provinces) {
    if (filter.length > 0 && !p.name.toLowerCase().includes(filter.toLowerCase())) continue;
    const o = scene.owner.get(p.id) ?? null;
    const key = p.isSea ? "Sea zones" : o !== null ? powerName(o) : "Held by no one";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const rank = (k: string): number => (k === "Sea zones" ? 2 : k === "Held by no one" ? 1 : 0);
  const ordered = [...groups].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], "en"));
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>Provinces</h3>
        <input className="search" type="search" placeholder="Find a province" value={filter} onChange={(e) => setFilter(e.target.value)} enterKeyHint="search" />
      </div>
      {ordered.map(([key, list]) => (
        <div key={key}>
          <h4>{key}</h4>
          <ul className="plist">
            {[...list]
              .sort((a, b) => a.name.localeCompare(b.name, "en"))
              .map((p) => {
                const units = scene.units.filter((u) => u.province === p.id);
                return (
                  <li key={p.id} className={selected === p.id ? "on" : ""}>
                    <button className="prow" onClick={() => onProvince(p.id)}>
                      <Emblem power={p.isSea ? null : (scene.owner.get(p.id) ?? null)} />
                      <span className="pname">
                        {p.name}
                        {p.capital ? " ♛" : ""}
                      </span>
                      <span className="pmeta">
                        {units.map((u) => (
                          <span key={u.key} className={`pu${u.ghost ? " ghost" : ""}`} title={u.ghost ? `last seen ${dateLabel(u.seenAt + 1, scene.viewer)}` : ""}>
                            {u.kind === "Army" ? "army" : "fleet"} of {powerName(u.power)}
                            {u.ghost ? ` (seen ${shortDate(u.seenAt + 1, scene.viewer)})` : ""}
                          </span>
                        ))}
                        {!p.isSea && (
                          <span className="muted" title="The land's base yield, as the map gives it: each season's harvest is reckoned from it">
                            yield {p.yield}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </>
  );
}
