import { AllPowers, WorldMap, type GameState, type HistoryKind, type Power } from "@amarna/engine";
import { useMemo, useState } from "react";
import type { MapScene } from "../map/scene.ts";
import { provinceName, powerName } from "../ui/format.ts";
import { useNames } from "../ui/names.ts";
import { knownTo, scoreOf, type Known } from "../ui/search.ts";
import { Emblem } from "./Emblem.tsx";
import type { HistoryOf } from "./HistoryPanel.tsx";

const Kinds: readonly [HistoryKind, string][] = [
  ["province", "Provinces"],
  ["realm", "Realms"],
  ["title", "Titles"],
  ["person", "People"],
];

/**
 * The one search ("History, search and names" under Interface, item 17+++b): everything this seat knows, by any of its
 * names, period or modern, forgiving misspellings; narrowed by kind, realm, place, alive or dead, held or lost; each kind
 * with its count of what the seat knows, never the true total. A row opens its history, its place on the map, or its
 * person to follow.
 */
export function SearchPanel({ state, viewer, record, scene, onHistory, onProvince, onPerson }: {
  state: GameState;
  viewer: Power | null;
  record: boolean;
  scene: MapScene;
  onHistory: (h: HistoryOf) => void;
  onProvince: (id: string) => void;
  onPerson: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<HistoryKind | "">("");
  const [realm, setRealm] = useState("");
  const [place, setPlace] = useState("");
  const [life, setLife] = useState<"" | "alive" | "dead">("");
  const [held, setHeld] = useState<"" | "held" | "lost">("");
  // The names in each row follow the player's name settings, so a changed setting reads them anew.
  const names = useNames();
  const known = useMemo(() => knownTo(state, record ? null : viewer, scene), [state, viewer, record, scene, names]);
  const found = known
    .filter(
      (k) =>
        (kind === "" || k.kind === kind) &&
        (realm === "" || k.realms.includes(realm)) &&
        (place === "" || k.place === place) &&
        (life === "" || (k.alive !== null && k.alive === (life === "alive"))) &&
        (held === "" || k.held === held),
    )
    .map((k) => ({ k, score: scoreOf(query, k) }))
    .filter((x): x is { k: Known; score: number } => x.score !== null)
    .sort((a, b) => a.score - b.score || a.k.name.localeCompare(b.k.name, "en"));
  return (
    <>
      <h3>Search</h3>
      <input
        className="search wide"
        type="search"
        placeholder="Any name, period or modern: Gubla, Byblos, Rib-Hadda…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        enterKeyHint="search"
        aria-label="Search"
        autoFocus
      />
      <div className="row filters">
        <select value={kind} onChange={(e) => setKind(e.target.value as HistoryKind | "")} aria-label="Kind">
          <option value="">Every kind</option>
          {Kinds.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select value={realm} onChange={(e) => setRealm(e.target.value)} aria-label="Realm">
          <option value="">Any realm</option>
          {[...AllPowers].sort((a, b) => powerName(a).localeCompare(powerName(b), "en")).map((p) => (
            <option key={p} value={p}>
              {powerName(p)}
            </option>
          ))}
        </select>
        <select value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Place">
          <option value="">Any place</option>
          {WorldMap.default.provinces
            .filter((p) => !p.isSea)
            .map((p) => p.id)
            .sort((a, b) => provinceName(a).localeCompare(provinceName(b), "en"))
            .map((id) => (
              <option key={id} value={id}>
                {provinceName(id)}
              </option>
            ))}
        </select>
        <select value={life} onChange={(e) => setLife(e.target.value as "" | "alive" | "dead")} aria-label="Alive or dead">
          <option value="">Alive or dead</option>
          <option value="alive">Alive, standing</option>
          <option value="dead">Dead, fallen</option>
        </select>
        {!record && viewer !== null && (
          <select value={held} onChange={(e) => setHeld(e.target.value as "" | "held" | "lost")} aria-label="Held or lost">
            <option value="">Held or lost</option>
            <option value="held">Yours</option>
            <option value="lost">Lost</option>
          </select>
        )}
      </div>
      <p className="muted small">
        {record ? "In the record" : "Your court knows of"}:{" "}
        {Kinds.map(([k, label]) => `${known.filter((x) => x.kind === k).length} ${label.toLowerCase()}`).join(", ")}. Found {found.length}.
      </p>
      {Kinds.filter(([k]) => found.some((x) => x.k.kind === k)).map(([k, label]) => {
        const rows = found.filter((x) => x.k.kind === k);
        return (
          <div key={k}>
            <h4>
              {label} <small className="muted">{rows.length}</small>
            </h4>
            <ul className="plist">
              {rows.slice(0, 60).map(({ k: x }) => (
                <li key={`${x.kind}:${x.id}`}>
                  <div className="prow">
                    <Emblem power={x.realms.length === 1 ? x.realms[0] : null} />
                    <span className="pname">
                      {x.name}
                      {x.alive === false && <small className="muted"> · {x.kind === "person" ? "dead" : "fallen"}</small>}
                    </span>
                    <span className="pmeta">
                      <span className="muted">{x.what}</span>
                      <button className="small link" onClick={() => onHistory({ kind: x.kind, id: x.id })}>
                        History
                      </button>
                      {x.place !== null && x.kind !== "person" && (
                        <button className="small link" onClick={() => onProvince(x.place!)}>
                          On the map
                        </button>
                      )}
                      {x.kind === "person" && (
                        <button className="small link" onClick={() => onPerson(x.id)}>
                          Follow
                        </button>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {rows.length > 60 && <p className="muted small">And {rows.length - 60} more: narrow the search to see them.</p>}
          </div>
        );
      })}
    </>
  );
}
