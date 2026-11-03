import { AllPowers, shortDate, type GameState, type Power } from "@amarna/engine";
import { useState } from "react";
import { dated, powerName, when } from "../ui/format.ts";

/** After the game: two nations' self-serving annals side by side, against the true record. */
export function ChroniclePanel({
  state,
  chronicles,
  anew,
  onTellAnew,
}: {
  state: GameState;
  chronicles: Record<string, string>;
  /** Item 17+++: each court's annals told anew at the game's owner's asking, beside the first telling. */
  anew: Record<string, string[]>;
  /** Asks the narrator to tell the annals anew; null where the page may only read (a loaded replay). */
  onTellAnew: (() => void) | null;
}) {
  const [pair, setPair] = useState<[Power, Power]>(() => {
    const winners = state.winners.map((w) => ((AllPowers as readonly string[]).includes(w) ? (w as Power) : "Egypt"));
    if (winners.length === 0) return ["Egypt", "Hatti"];
    return [winners[0], AllPowers.find((p) => p !== winners[0])!];
  });
  const [left, right] = pair;
  const keys = Object.keys(chronicles) as Power[];
  const events = state.events.filter((e) => (e.text.includes(left) || e.text.includes(right)) && e.kind !== "support").slice(-60);
  return (
    <>
      <h3>The annals</h3>
      <p className="muted">Each court wrote its own history, as Egypt and Hatti both recorded Kadesh as a victory. Compare them with the record.</p>
      <div className="row" style={{ marginBottom: ".6rem" }}>
        <select value={left} onChange={(e) => setPair([e.target.value as Power, right])}>
          {keys.map((p) => (
            <option key={p} value={p}>
              {powerName(p)}
            </option>
          ))}
        </select>
        <select value={right} onChange={(e) => setPair([left, e.target.value as Power])}>
          {keys.map((p) => (
            <option key={p} value={p}>
              {powerName(p)}
            </option>
          ))}
        </select>
      </div>
      <div className="trail" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
        <div className="chronicle">{chronicles[left] ?? ""}</div>
        <div className="chronicle">{chronicles[right] ?? ""}</div>
      </div>
      {(anew[left] ?? []).length + (anew[right] ?? []).length > 0 && (
        <>
          <h4 style={{ marginTop: "1rem" }}>Told anew</h4>
          <p className="muted">The first telling above stands; each telling since is kept beside it.</p>
          {Array.from({ length: Math.max(anew[left]?.length ?? 0, anew[right]?.length ?? 0) }, (_, i) => (
            <div className="trail" key={i} style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <div className="chronicle">{anew[left]?.[i] ?? ""}</div>
              <div className="chronicle">{anew[right]?.[i] ?? ""}</div>
            </div>
          ))}
        </>
      )}
      {onTellAnew !== null && (
        <p>
          <button className="small" onClick={onTellAnew} title="The narrator writes the annals again; the first telling is kept beside the new">
            Tell anew
          </button>
        </p>
      )}
      <h4 style={{ marginTop: "1rem" }}>The true record between them</h4>
      {events.map((e, i) => (
        <div key={i}>
          <small className="muted" title={when(e.turn, null)}>
            {shortDate(e.turn)}
          </small>{" "}
          {dated(e.text, null)}
        </div>
      ))}
    </>
  );
}
