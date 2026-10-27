import { clauseTag, inboxOf, ledger, type GameState, type InboxKind, type Power } from "@amarna/engine";
import { useState } from "react";
import { dated, powerName, shekels, whenCap } from "../ui/format.ts";

const order = (k: InboxKind): number =>
  ({ Catastrophe: 0, EnvoyReport: 1, Audience: 2, SpyReport: 3, Rumor: 4, Battle: 5, Rejected: 6, Notice: 9 })[k as string] ?? 7;

const kindName = (k: InboxKind): string =>
  k === "EnvoyReport" ? "envoy report" : k === "SpyReport" ? "agent" : k === "CheckResult" ? "inquiry" : k === "Rejected" ? "rejected" : k.toLowerCase();

/** What has reached a court, the newest season first. */
export function InboxPanel({ state, power }: { state: GameState; power: Power }) {
  const [showAll, setShowAll] = useState(false);
  const items = inboxOf(state, power);
  const turns = [...new Set(items.map((i) => i.turn))].sort((a, b) => b - a);
  const shown = showAll ? turns : turns.slice(0, 1);
  const t = state.treasuries.get(power);
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: ".5rem" }}>
        <h3 style={{ margin: 0 }}>{powerName(power)}'s court</h3>
        <label>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Earlier seasons
        </label>
      </div>
      <p className="muted">
        Treasury (by your ledger): {shekels(ledger(t))}
        {t.lots.length > 0 ? `, including ${t.lots.length} unassayed shipment(s)` : ""}.
      </p>
      {items.length === 0 && <p className="muted">Nothing has arrived yet.</p>}
      {shown.map((turn) => (
        <div key={turn}>
          <h4 className="muted" style={{ margin: ".8rem 0 .3rem" }}>
            {whenCap(turn, power)}
          </h4>
          {items
            .filter((i) => i.turn === turn)
            .sort((a, b) => order(a.kind) - order(b.kind))
            .map((item, i) => (
              <div className="item" key={i}>
                <h4>
                  {item.title} <span className="pill">{kindName(item.kind)}</span>
                </h4>
                <div className="body">{dated(item.body, power)}</div>
                {item.clauses.length > 0 && <small className="muted">The answer in clauses, as reported: {item.clauses.map(clauseTag).join("; ")}.</small>}
              </div>
            ))}
        </div>
      ))}
    </>
  );
}
