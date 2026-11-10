import type { CouncilLine } from "@amarna/engine";
import type { OrdersContext } from "./use-orders.ts";

/**
 * Item 16: the omens of the end, and the royal council. Four advisors who only inform, compact: what all four advise once,
 * then each where they differ. The toggle takes effect from next season and is recorded in the log.
 */
export function CouncilSection({ c }: { c: OrdersContext }) {
  const { draft, onChanged, v } = c;
  const council = v.council;
  const take = (lines: readonly CouncilLine[]): void => {
    draft.take(lines.map((l) => l.order));
    onChanged();
  };
  const wanted = draft.council === "" ? v.councilOn : draft.council === "on";
  return (
    <div className="section">
      {v.omens !== "" && (
        <p>
          <strong>Omens.</strong> {v.omens}
        </p>
      )}
      <h3>Your royal council</h3>
      <label>
        <input
          type="checkbox"
          checked={wanted}
          onChange={(e) => {
            draft.council = e.target.checked === v.councilOn ? "" : e.target.checked ? "on" : "off";
            onChanged();
          }}
        />{" "}
        Hear the council{wanted !== v.councilOn ? " (from next season)" : ""}
      </label>
      {council !== null && (
        <>
          <p className="muted">
            <small>
              Four advisors who only advise, each with a known bent. They see only what you see, rivals' gold guessed and their troops as last seen, so
              they can be wrong and sure of it. "Pictured seasons" are eight ways this season may go, played out by the rules from your view. Where all
              four agree, the move is usually sound.
            </small>
          </p>
          {council.agreed.length > 0 && (
            <div className="item">
              <strong>All four advise:</strong>
              <ul>
                {council.agreed.map((l, i) => (
                  <li key={i}>{l.text}</li>
                ))}
              </ul>
              <button className="small" onClick={() => take(council.agreed)}>
                Take these orders
              </button>
            </div>
          )}
          {council.advisors.map((a) => (
            <div className="item" key={a.advisor}>
              <strong>{a.title.charAt(0).toUpperCase() + a.title.slice(1)}</strong>, <span className="muted">{a.tilt}</span>
              <div>{a.reading}</div>
              {a.lines.length > 0 && (
                <>
                  <ul>
                    {a.lines.map((l, i) => (
                      <li key={i}>{l.text}</li>
                    ))}
                  </ul>
                  <button className="small" onClick={() => take([...council.agreed, ...a.lines])}>
                    Take {a.title.replace(/ \(.*\)$/, "")}'s orders
                  </button>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
