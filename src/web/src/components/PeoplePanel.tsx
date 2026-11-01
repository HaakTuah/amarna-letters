import { Personas, Views, shortDate, type Character, type GameState, type Power } from "@amarna/engine";
import { dated, powerName, shekels, when } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";
import { Person } from "./Person.tsx";

const traitsOf = (c: Character): [string, number][] => [
  ["Loyalty", c.traits.loyalty],
  ["Greed", c.traits.greed],
  ["Competence", c.traits.competence],
  ["Ambition", c.traits.ambition],
  ["Courage", c.traits.courage],
];

/** A court's own people and those it knows of; in god view, every character as the engine records it. */
export function PeoplePanel({ state, viewer, onPerson }: { state: GameState; viewer: Power | null; onPerson: (id: string) => void }) {
  if (viewer !== null) {
    const view = Views.for(state, viewer);
    return (
      <>
        <h3>Your people</h3>
        {view.court.length === 0 && <p className="muted">Nobody serves you.</p>}
        {view.court.map((c) => (
          <Person key={c.id} c={c} court={viewer} onFollow={onPerson} />
        ))}
        <h3 style={{ marginTop: "1rem" }}>Others you know of</h3>
        {view.known.length === 0 && <p className="muted">Nobody else has come to your notice.</p>}
        {view.known.map((c) => (
          <Person key={c.id} c={c} court={viewer} onFollow={onPerson} />
        ))}
      </>
    );
  }
  const people = [...state.characters].sort((a, b) => (a.employer ?? "~").localeCompare(b.employer ?? "~", "en") || a.name.localeCompare(b.name, "en"));
  return (
    <>
      <h3>Every character (god view)</h3>
      <p className="muted">Traits and facts are hidden from the players; here you see the engine's record.</p>
      {people.map((c) => (
        <div className="item" key={c.id}>
          <h4>
            <Emblem power={c.employer} />
            {c.name}{" "}
            <small className="muted">
              of {c.origin}, {c.calling}
            </small>{" "}
            <span className="pill">
              {c.status.toLowerCase()}
              {c.employer !== null ? ` · ${powerName(c.employer)}` : ""}
            </span>
            {c.secretMaster !== null && (
              <span className="pill" style={{ color: "var(--danger)" }}>
                secretly serves {powerName(c.secretMaster)}
              </span>
            )}
            <button className="small link" onClick={() => onPerson(c.id)}>
              Follow
            </button>
          </h4>
          <div>
            <small>
              {Views.dutyText(c)}
              {c.at !== null ? ` · at ${powerName(c.at)}` : ""}
              {c.heldBy !== null ? ` · held by ${powerName(c.heldBy)}` : ""} · purse {shekels(c.purse)}
              {c.contract !== null
                ? ` · ${dated(Views.termText(c.contract.fee + c.contract.carried, c.contract.advance, c.contract.untilTurn, state.turn, c.contract), null)}`
                : ""}
            </small>
          </div>
          <div className="row" style={{ margin: ".3rem 0" }}>
            {traitsOf(c).map(([name, v]) => (
              <span key={name} style={{ width: "7.5rem" }}>
                <small>
                  {name} {v}
                </small>
                <span className="bar">
                  <i style={{ width: `${v}%`, background: "var(--accent)" }} />
                </span>
              </span>
            ))}
          </div>
          {c.traits.sympathy !== null && (
            <div>
              <small>
                Sympathy for {powerName(c.traits.sympathy)} ({c.traits.sympathyStrength})
              </small>
            </div>
          )}
          <ul style={{ margin: ".2rem 0 .2rem 1rem", padding: 0 }}>
            {c.facts.map((f, i) => (
              <li key={i}>
                <small>
                  <span className="pill">{f.secrecy.toLowerCase()}</span> {dated(f.text, null)} {f.knownBy.length > 0 ? `(known to ${f.knownBy.map(powerName).join(", ")})` : ""}
                </small>
              </li>
            ))}
          </ul>
          <details>
            <summary>
              <small>Persona and memory</small>
            </summary>
            <p style={{ whiteSpace: "pre-line" }}>
              <small>{Personas.current(c)}</small>
            </p>
            {c.memorySummary.length > 0 && (
              <p>
                <small className="muted">Older memories:</small> <small>{c.memorySummary}</small>
              </p>
            )}
            {c.memory.slice(-6).map((m, i) => (
              <div key={i}>
                <small className="muted" title={when(m.turn, null)}>
                  {shortDate(m.turn)}:
                </small>{" "}
                <small>{m.text}</small>
              </div>
            ))}
          </details>
        </div>
      ))}
    </>
  );
}
