import { AllPowers, courtLegend, revelations, shortDate, tabletLegends, type GameState, type LegendLine, type Power } from "@amarna/engine";
import { useState } from "react";
import { dated, powerName, when } from "../ui/format.ts";

/**
 * Legends, read from the record (build order item 14): the rise and fall of each court, the history of every tablet, and
 * the hidden facts, which open to every seat when the game ends. Shown in god view only: to spectators, and to everyone
 * once the record opens.
 */
export function LegendsPanel({ state, onProvince }: { state: GameState; onProvince: (id: string) => void }) {
  const [part, setPart] = useState<"courts" | "tablets" | "hidden">(state.ended ? "hidden" : "courts");
  const [court, setCourt] = useState<Power>(() => (state.winners.find((w) => (AllPowers as readonly string[]).includes(w)) as Power | undefined) ?? "Egypt");
  const [open, setOpen] = useState<string | null>(null);
  const lines = (ls: readonly LegendLine[]) => (
    <ul className="life">
      {ls.map((l, i) => (
        <li key={i} className={(l.province === null ? "" : "tap ") + (l.turn > 0 ? "" : "nodate")} onClick={() => l.province !== null && onProvince(l.province)}>
          {l.turn > 0 && (
            <span className="when" title={when(l.turn, null)}>
              {shortDate(l.turn)}
            </span>
          )}
          <span className="what">{dated(l.text, null)}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <h3>Legends</h3>
      <p className="muted small">Read from the record, never written in advance: what people did, and nothing the engine did not record.</p>
      <div className="row" style={{ marginBottom: ".6rem" }}>
        <button className={`small ${part === "courts" ? "primary" : ""}`} onClick={() => setPart("courts")}>
          Courts
        </button>
        <button className={`small ${part === "tablets" ? "primary" : ""}`} onClick={() => setPart("tablets")}>
          Tablets
        </button>
        <button className={`small ${part === "hidden" ? "primary" : ""}`} onClick={() => setPart("hidden")}>
          {state.ended ? "The record opens" : "Hidden facts"}
        </button>
      </div>
      {part === "courts" && (
        <>
          <select value={court} onChange={(e) => setCourt(e.target.value as Power)} aria-label="Court">
            {AllPowers.map((p) => (
              <option key={p} value={p}>
                {powerName(p)}
              </option>
            ))}
          </select>
          <h4>The rise and fall of {powerName(court)}</h4>
          {lines(courtLegend(state, court))}
        </>
      )}
      {part === "tablets" &&
        (() => {
          const all = tabletLegends(state);
          if (all.length === 0) return <p className="muted">No tablet has been sealed yet.</p>;
          return all.map((t) => (
            <div key={t.id}>
              <h4 className="tap" onClick={() => setOpen(open === t.id ? null : t.id)}>
                {t.title} <small className="muted">{t.turn > 0 ? shortDate(t.turn) : ""}</small>
              </h4>
              {open === t.id && lines(t.lines)}
            </div>
          ));
        })()}
      {part === "hidden" && (
        <>
          <p className="muted small">
            {state.ended
              ? "The game is over, and the record is open to every seat: who lied, who skimmed, which seals were forged, which go-between was paid to bend what he passed on, and the season the end was drawn for."
              : "What no court saw, so far. When the game ends, every seat can read it."}
          </p>
          {revelations(state).map((r) => (
            <div key={r.title}>
              <h4>{r.title}</h4>
              {lines(r.lines)}
            </div>
          ))}
        </>
      )}
    </>
  );
}
