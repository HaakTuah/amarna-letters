import { shortDate, type GameState, type Power } from "@amarna/engine";
import { SignalDetector } from "@amarna/game";
import { useState } from "react";
import { dated, when } from "../ui/format.ts";

/**
 * The record of events, as the eyes chosen know it; in god view also the signals read from it. upTo shows only what had
 * happened by the end of that season: events are only ever added, each stamped with its season, so the newest state
 * filtered by season reads as the state of that season did, without loading it.
 */
export function EventsPanel({ state, upTo, viewer }: { state: GameState; upTo: number | null; viewer: Power | null }) {
  const [kind, setKind] = useState<string | null>(null);
  const [limit, setLimit] = useState(120);
  const last = upTo ?? Number.MAX_SAFE_INTEGER;
  const events = state.events.filter((e) => e.turn <= last && (viewer === null || e.visibleTo.includes(viewer)));
  const signals = viewer === null ? SignalDetector.detect(state).filter((s) => s.turn <= last) : [];
  const groups = new Map<string, number>();
  for (const s of signals) groups.set(s.kind, (groups.get(s.kind) ?? 0) + 1);
  const ranked = [...groups].sort((a, b) => b[1] - a[1]);
  return (
    <>
      {viewer === null && (
        <>
          <h3>Signals of the hypothesis</h3>
          <p className="muted">Markers read from the record: none of these is a rule in the game.</p>
          <div className="row" style={{ marginBottom: ".6rem" }}>
            {ranked.map(([k, n]) => (
              <button key={k} className={`small ${kind === k ? "primary" : ""}`} onClick={() => setKind(kind === k ? null : k)}>
                {k} · {n}
              </button>
            ))}
          </div>
          {kind !== null &&
            signals
              .filter((s) => s.kind === kind)
              .slice(-40)
              .reverse()
              .map((s, i) => (
                <div className="item" key={i}>
                  <small className="muted" title={when(s.turn, null)}>
                    {shortDate(s.turn)}
                  </small>{" "}
                  {dated(s.text, null)}
                </div>
              ))}
        </>
      )}
      <h3 style={{ marginTop: ".8rem" }}>{viewer === null ? "Everything that happened" : "What your court heard of"}</h3>
      {events
        .slice(-limit)
        .reverse()
        .map((e, i) => (
          <div key={i} style={{ padding: ".2rem 0", borderBottom: "1px solid var(--line)" }}>
            <small className="muted" title={when(e.turn, viewer)}>
              {shortDate(e.turn, viewer)} · {e.kind}
            </small>{" "}
            {dated(e.text, viewer)}
            {viewer === null && e.visibleTo.length < 7 && (
              <small className="muted"> (known to {e.visibleTo.length === 0 ? "nobody" : e.visibleTo.join(", ")})</small>
            )}
          </div>
        ))}
      {events.length > limit && (
        <button style={{ marginTop: ".5rem" }} onClick={() => setLimit(limit + 100)}>
          Show more
        </button>
      )}
    </>
  );
}
