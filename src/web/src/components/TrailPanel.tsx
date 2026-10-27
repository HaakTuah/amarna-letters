import { AllPowers, findCharacter, idNumber, type Character, type GameState, type MessageTrail, type Power } from "@amarna/engine";
import { useState } from "react";
import { powerName, shekels, when } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";

/**
 * Where the message stands while it is unfinished, instead of empty dashes: on the road and when it arrives, at the court,
 * on the road home and when it is back, detained, held, gone over to another court, or dead.
 */
function status(state: GameState, t: MessageTrail, envoy: Character | null): string | null {
  if (t.reportTurn !== null) return null;
  const journey = state.journeys.find((j) => j.characterId === t.envoyId && (j.dispatch?.trailId === t.id || j.cargo?.trailId === t.id));
  if (journey?.kind === "EnvoyOutbound") return `On the road, arrives in ${when(journey.arriveTurn, null)}.`;
  if (journey?.kind === "EnvoyHomebound") return `Heard; on the road home, back in ${when(journey.arriveTurn, null)}.`;
  if (envoy === null) return null;
  if (envoy.status === "Dead") return "Never came home: the envoy is dead.";
  if (envoy.status === "Captured" && envoy.heldBy !== null) return `Never came home: held captive by ${powerName(envoy.heldBy)}.`;
  if (envoy.duty === "Detained" || envoy.heldBy !== null) return `Detained at the court of ${powerName(envoy.heldBy ?? t.to)}.`;
  if (envoy.duty === "EnvoyAtCourt" && envoy.currentTrail === t.id) return `At the court of ${powerName(t.to)}.`;
  if (envoy.employer !== t.from) return envoy.employer !== null ? `Never reported: went over to ${powerName(envoy.employer)}.` : "Never reported: left the king's service.";
  return t.audienceTurn === null ? "Not heard." : null;
}

/** The spectator's message trail: what the leader wrote, what the envoy said abroad, what it reported home. */
export function TrailPanel({ state, onPerson }: { state: GameState; onPerson: (id: string) => void }) {
  const [filter, setFilter] = useState<Power | null>(null);
  const [limit, setLimit] = useState(20);
  const trails = state.trails
    .filter((t) => filter === null || t.from === filter || t.to === filter)
    .sort((a, b) => b.turn - a.turn || idNumber(b.id) - idNumber(a.id));
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: ".5rem" }}>
        <h3 style={{ margin: 0 }}>Message trail</h3>
        <select value={filter ?? ""} onChange={(e) => setFilter(e.target.value === "" ? null : (e.target.value as Power))}>
          <option value="">All powers</option>
          {AllPowers.map((p) => (
            <option key={p} value={p}>
              {powerName(p)}
            </option>
          ))}
        </select>
      </div>
      <p className="muted">Three versions of every message. The gaps between them are the game.</p>
      {trails.length === 0 && <p className="muted">No envoy has set out yet.</p>}
      {trails.slice(0, limit).map((t) => {
        const envoy = findCharacter(state, t.envoyId);
        const st = status(state, t, envoy);
        return (
          <div className="card trail-card" key={t.id}>
            <div className="trail-head">
              <strong>
                <Emblem power={t.from} /> {powerName(t.from)} → <Emblem power={t.to} /> {powerName(t.to)}
              </strong>
              <small className="muted">
                sent {when(t.turn, null)}
                {t.audienceTurn !== null ? ` · heard ${when(t.audienceTurn, null)}` : ""}
                {t.reportTurn !== null ? ` · reported ${when(t.reportTurn, null)}` : ""}
              </small>
              <button className="small link" onClick={() => onPerson(t.envoyId)}>
                Follow {t.envoyName}
              </button>
            </div>
            {st !== null && <p className="trail-status">{st}</p>}
            {t.greetingText.length > 0 ? (
              <div className="tablet" style={{ margin: ".4rem 0", fontSize: ".88rem" }}>
                {t.greetingText}
              </div>
            ) : (
              <p className="muted">
                <em>The tablet carried no greeting.</em>
              </p>
            )}
            <div className="trail">
              <div>
                <h5>The king wrote</h5>
                {t.leaderLetter}
                {t.mandate.length > 0 && (
                  <>
                    <br />
                    <br />
                    <small className="muted">Mandate: {t.mandate}</small>
                  </>
                )}
                {t.goldStated > 0 && (
                  <>
                    <br />
                    <small className="muted">Gold: {shekels(t.goldStated)} stated</small>
                  </>
                )}
                {t.proposalText !== null && (
                  <>
                    <br />
                    <small className="muted">Tablet to seal: {t.proposalText}</small>
                  </>
                )}
              </div>
              <div>
                <h5>The envoy said abroad</h5>
                {t.audienceTurn === null ? <span className="muted">Not yet heard.</span> : t.delivered.length > 0 ? t.delivered : "(nothing was said)"}
                {t.exchanges.map((x, i) => (
                  <span key={i}>
                    <br />
                    <br />
                    <small className="muted">Host:</small> {x.host}
                    {x.envoy.length > 0 && (
                      <>
                        <br />
                        <small className="muted">Envoy:</small> {x.envoy}
                      </>
                    )}
                  </span>
                ))}
                {t.goldStated > 0 && t.audienceTurn !== null && (
                  <>
                    <br />
                    <br />
                    <small className="muted">
                      Weighed {shekels(t.goldDelivered)}, fine gold {shekels(t.goldFine)}
                    </small>
                  </>
                )}
              </div>
              <div>
                <h5>The envoy reported home</h5>
                {t.reportTurn !== null ? (t.report.length > 0 ? t.report : "(no report)") : <span className="muted">No report yet.</span>}
              </div>
            </div>
            {t.outcomes.length > 0 && (
              <p style={{ margin: ".4rem 0 0" }}>
                <small>
                  <strong>What happened:</strong> {t.outcomes.join("; ")}
                </small>
              </p>
            )}
            {envoy !== null && (
              <details>
                <summary>
                  <small>{envoy.name}'s hidden traits</small>
                </summary>
                <small>
                  Loyalty {envoy.traits.loyalty} · greed {envoy.traits.greed} · competence {envoy.traits.competence} · ambition {envoy.traits.ambition} · courage{" "}
                  {envoy.traits.courage}
                  {envoy.traits.sympathy !== null ? ` · sympathy for ${envoy.traits.sympathy} (${envoy.traits.sympathyStrength})` : ""}
                  {envoy.secretMaster !== null ? ` · secretly serves ${envoy.secretMaster}` : ""}
                </small>
              </details>
            )}
          </div>
        );
      })}
      {trails.length > limit && <button onClick={() => setLimit(limit + 20)}>Show more</button>}
    </>
  );
}
