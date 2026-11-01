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
            {/* Duty, where and term, each only when there is one: a free person has no duty, so no line opens with "·". */}
            {[
              (dated(c.duty, court) + (c.timing.length > 0 ? ` (${dated(c.timing, court)})` : "")).trim(),
              c.where,
              c.term.length > 0 ? dated(c.term, court) : "",
            ]
              .filter((s) => s.length > 0)
              .join(" · ")}
          </small>
        </div>
      )}
      {c.owed !== null && (
        <div>
          <small>You let {shekels(c.owed)} of their fee fall due unpaid.</small>
        </div>
      )}
      {c.lends !== null && (
        <div>
          <small>
            Offers to lend you up to {shekels(c.lends.amount)}, {c.lends.perHundred} in a hundred more back after {c.lends.seasons} seasons.
          </small>
        </div>
      )}
      {c.employer !== null && !c.ours && (
        <div>
          <small>Serves {powerName(c.employer)}</small>
        </div>
      )}
      {c.knownFacts.length > 0 && (
        <div>
          <small>Known: {c.knownFacts.map((f) => dated(f, court)).join(" ")}</small>
        </div>
      )}
      {c.speaks.length > 0 && (
        <div>
          <small>Says they speak {c.speaks.join(", ")}</small>
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
    </div>
  );
}
