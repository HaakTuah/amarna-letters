import { Views, WorldMap, claimedName, historyOf, knownName, shortDate, type GameState, type HistoryKind, type Power } from "@amarna/engine";
import { dated, provinceName, when } from "../ui/format.ts";
import { otherName, otherRealmName, realmName } from "../ui/names.ts";
import { titleName } from "../ui/search.ts";
import { LearnMore } from "./LearnMore.tsx";

/** What a history window is open on. */
export interface HistoryOf {
  kind: HistoryKind;
  id: string;
}

/**
 * The name a history window gives a thing, as the player's settings show it; a person by the name `viewer`'s court knows
 * them by (a false name it has not seen through stays false: `characterView`), the true one in the open record.
 */
export function nameOf(state: GameState, h: HistoryOf, viewer: Power | null): string {
  switch (h.kind) {
    case "province":
      return provinceName(h.id);
    case "realm":
      return realmName(h.id);
    case "title":
      return `the throne of ${titleName(h.id)}`;
    case "person":
      return knownAs(state, h.id, viewer) ?? "someone";
  }
}

/** A person's name as `viewer`'s court knows it (null: the record, their true name); null if the court does not know them. */
export function knownAs(state: GameState, id: string, viewer: Power | null): string | null {
  if (viewer === null) return state.characters.find((c) => c.id === id)?.name ?? null;
  const v = Views.for(state, viewer);
  return [...v.court, ...v.known].find((c) => c.id === id)?.name ?? null;
}

/** The engine's own name of a place or title, whose other name the window's second line gives (a realm's: `otherRealmName`). */
function rawName(h: HistoryOf): string | null {
  if (h.kind === "province") return WorldMap.default.exists(h.id) ? WorldMap.default.get(h.id).name : null;
  return h.kind === "title" ? h.id : null;
}

/**
 * The history button's window ("History, search and names" under Spectator mode, item 17+++b), as the ledgers of Crusader
 * Kings and Dwarf Fortress keep them: the events of one province, realm, title or person in order, each dated, with its
 * cause as the record words it, as this seat learned them, or the whole record (`record`: god view, and every seat once
 * the game ends and the record opens).
 */
export function HistoryPanel({ state, of, viewer, record, onProvince, onHistory, onClose }: {
  state: GameState;
  of: HistoryOf;
  viewer: Power | null;
  record: boolean;
  onProvince: (id: string) => void;
  onHistory: (h: HistoryOf) => void;
  onClose: () => void;
}) {
  const lines = historyOf(state, of.kind, of.id, record ? null : viewer);
  const seen = record ? null : viewer;
  const name = nameOf(state, of, seen);
  const raw = rawName(of);
  const other = of.kind === "realm" ? otherRealmName(of.id) : raw !== null ? otherName(raw) : null;
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>History of {name}</h3>
        <button className="small" onClick={onClose}>
          Close
        </button>
      </div>
      {other !== null && <p className="muted small">also {other}</p>}
      {of.kind === "realm" &&
        (() => {
          // The title it claims, as this court knows the claim: its own history button.
          const title = seen === null ? claimedName(of.id) : knownName(seen, of.id);
          return (
            <button className="small link" onClick={() => onHistory({ kind: "title", id: title })}>
              History of the throne of {titleName(title)}
            </button>
          );
        })()}
      <LearnMore state={state} kind={of.kind} id={of.id} knownAs={of.kind === "person" ? (knownAs(state, of.id, seen) ?? "") : undefined} />
      <p className="muted small">
        {record ? "The whole record" : "As your court learned it"}: {lines.length} event{lines.length === 1 ? "" : "s"}
        {record ? "" : " known"}.
      </p>
      {lines.length === 0 ? (
        <p className="muted">{record ? "The record holds nothing of it yet." : "Your court has heard nothing of it yet."}</p>
      ) : (
        <ul className="life">
          {lines.map((l, i) => (
            <li key={i} className={(l.province === null || of.kind === "province" ? "" : "tap ") + (l.turn > 0 ? "" : "nodate")} onClick={() => l.province !== null && of.kind !== "province" && onProvince(l.province)}>
              {l.turn > 0 && (
                <span className="when" title={when(l.turn, viewer)}>
                  {shortDate(l.turn, viewer)}
                </span>
              )}
              <span className="what">{dated(l.text, viewer)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
