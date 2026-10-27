import { AllPowers, findCharacter, idNumber, type Character, type GameState, type MessageTrail, type Power } from "@amarna/engine";
import type { AuthorKind, Authorship, TrailAuthors } from "@amarna/game";
import { useState } from "react";
import type { Live } from "../session/protocol.ts";
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

const KindNames: Record<AuthorKind, string> = { model: "a model", script: "a script", human: "a human", file: "an agent through files", fallback: "a fallback" };

/** Who wrote a part of the message: "Sonnet 5.5 leader", or "fallback: the script for Sonnet 5.5 leader" with the reason. */
export function Author({ by }: { by: Authorship | null | undefined }) {
  if (by === null || by === undefined) return null;
  if (by.kind === "fallback")
    return (
      <small className="author fallback" title={by.reason}>
        {" "}
        · fallback: a script for {by.name}
      </small>
    );
  return <small className={`author ${by.kind}`}> · by {by.name}</small>;
}

/** Every author of a trail, the parts written so far. */
const authorsOf = (a: TrailAuthors | undefined): Authorship[] =>
  a === undefined ? [] : [a.letter, a.said, ...a.answered, ...a.replied, a.report].filter((x): x is Authorship => x !== null);

/**
 * Fallbacks counted aloud: how many of this season's model calls a script made in their place, and why, with every season
 * that had any below it.
 */
export function FallbackNotice({ live }: { live: Live }) {
  const seasons = live.fallbacks.filter((f) => f.asked > 0);
  if (seasons.length === 0) return null;
  const last = seasons[seasons.length - 1];
  const fell = seasons.filter((f) => f.fallen.length > 0);
  return (
    <details className={last.fallen.length > 0 ? "notice error" : "notice"}>
      <summary>
        {when(last.turn, null)}: {last.fallen.length} of {last.asked} model decisions fell back to scripts
        {fell.length > 0 ? ` · ${fell.reduce((n, f) => n + f.fallen.length, 0)} in the game so far` : ""}
      </summary>
      {fell
        .slice(-8)
        .reverse()
        .map((f) => (
          <div key={f.turn}>
            <small>
              <strong>
                {when(f.turn, null)}, {f.fallen.length} of {f.asked}:
              </strong>{" "}
              {f.fallen.map((x) => `${x.key} for ${x.name} (${x.reason})`).join("; ")}
            </small>
          </div>
        ))}
    </details>
  );
}

/** The spectator's message trail, in four parts: what the king wrote, what the envoy said abroad, what the host answered, what it reported home. */
export function TrailPanel({ state, authors, onPerson }: { state: GameState; authors: Record<string, TrailAuthors>; onPerson: (id: string) => void }) {
  const [filter, setFilter] = useState<Power | null>(null);
  const [by, setBy] = useState<string>("");
  const [limit, setLimit] = useState(20);
  // Filter by author: a kind ("model", "fallback"...) or one author by name, so one model's letter is found among scripts.
  const names = [...new Set(Object.values(authors).flatMap((a) => authorsOf(a).map((x) => x.name)))].sort();
  const written = (t: MessageTrail): boolean =>
    by === "" || authorsOf(authors[t.id]).some((x) => (by.startsWith("kind:") ? x.kind === by.slice(5) : x.kind !== "fallback" && x.name === by.slice(5)));
  const trails = state.trails
    .filter((t) => (filter === null || t.from === filter || t.to === filter) && written(t))
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
        <select value={by} onChange={(e) => setBy(e.target.value)} title="Show the messages one author, or one kind of author, had a hand in.">
          <option value="">Any author</option>
          {(Object.keys(KindNames) as AuthorKind[]).map((k) => (
            <option key={k} value={`kind:${k}`}>
              Written by {KindNames[k]}
            </option>
          ))}
          {names.map((n) => (
            <option key={n} value={`name:${n}`}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <p className="muted">Four versions of every message, each with who wrote it. The gaps between them are the game.</p>
      {trails.length === 0 && <p className="muted">No envoy has set out yet.</p>}
      {trails.slice(0, limit).map((t) => {
        const envoy = findCharacter(state, t.envoyId);
        const st = status(state, t, envoy);
        const a = authors[t.id];
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
                <h5>
                  The king wrote
                  <Author by={a?.letter} />
                </h5>
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
                <h5>
                  The envoy said abroad
                  <Author by={a?.said} />
                </h5>
                {t.audienceTurn === null ? <span className="muted">Not yet heard.</span> : t.delivered.length > 0 ? t.delivered : "(nothing was said)"}
                {t.exchanges.map(
                  (x, i) =>
                    x.envoy.length > 0 && (
                      <span key={i}>
                        <br />
                        <br />
                        <small className="muted">Answering, {i + 1}:</small> {x.envoy}
                        <Author by={a?.replied[i]} />
                      </span>
                    ),
                )}
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
                <h5>The host answered</h5>
                {t.exchanges.length === 0 ? (
                  <span className="muted">{t.audienceTurn === null ? "Not yet heard." : "(no answer)"}</span>
                ) : (
                  t.exchanges.map((x, i) => (
                    <span key={i}>
                      {i > 0 && (
                        <>
                          <br />
                          <br />
                        </>
                      )}
                      <small className="muted">{i + 1}:</small> {x.host}
                      <Author by={a?.answered[i]} />
                    </span>
                  ))
                )}
              </div>
              <div>
                <h5>
                  The envoy reported home
                  <Author by={a?.report} />
                </h5>
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
