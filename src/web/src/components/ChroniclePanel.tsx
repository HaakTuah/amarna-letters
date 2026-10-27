import { AllPowers, shortDate, type GameState, type Power } from "@amarna/engine";
import { useState } from "react";
import { dated, powerName, when } from "../ui/format.ts";

/** After the game: two nations' self-serving annals side by side, against the true record. */
export function ChroniclePanel({ state, chronicles }: { state: GameState; chronicles: Record<string, string> }) {
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
