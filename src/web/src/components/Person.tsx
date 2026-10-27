import { type CharacterView, type Power } from "@amarna/engine";
import { dated, shekels } from "../ui/format.ts";
import { powerName } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";

/** One person as a court sees them: its own servant, or someone who has come to its notice. Dates carry their label. */
export function Person({ c, court, onFollow }: { c: CharacterView; court: Power | null; onFollow?: (id: string) => void }) {
  return (
    <div className="item">
      <h4>
        <Emblem power={c.employer} /> {c.name} <small className="muted">of {c.origin}</small> <span className="pill">{c.status}</span>{" "}
        {c.heldByYou && <span className="pill">held by you</span>}
        {onFollow && (
          <button className="small link" onClick={() => onFollow(c.id)}>
            Follow
          </button>
        )}
      </h4>
      {(c.duty.length > 0 || c.where.length > 0) && (
        <div>
          <small>
            {dated(c.duty, court)}
            {c.timing.length > 0 ? ` (${dated(c.timing, court)})` : ""}
            {c.where.length > 0 ? ` · ${c.where}` : ""}
            {c.term.length > 0 ? ` · ${dated(c.term, court)}` : ""}
          </small>
        </div>
      )}
      {c.backPay !== null && (
        <div>
          <small>Owed {shekels(c.backPay)} of back pay, paid when they are back at your court.</small>
        </div>
      )}
      {c.employer !== null && !c.ours && (
        <div>
          <small>Serves {powerName(c.employer)}</small>
        </div>
      )}
      {c.knownFacts.length > 0 && (
        <div>
          <small>Known: {c.knownFacts.join(" ")}</small>
        </div>
      )}
      {c.pitch !== null && (
        <div className="speech" style={{ marginTop: ".3rem", fontSize: ".92rem" }}>
          “{c.pitch}”
        </div>
      )}
      {c.askingPrice !== null && (
        <div>
          <small>Asks {shekels(c.askingPrice)} a season.</small>
        </div>
      )}
      <small className="muted">{c.id}</small>
    </div>
  );
}
