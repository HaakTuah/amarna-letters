import type { Thread } from "@amarna/game";

/** What a telling is called: the first as it was first told, each after it as told anew. */
const heading = (i: number, n: number): string => (n === 1 ? "" : i === 0 ? "As first told" : n === 2 ? "Told anew" : `Told anew (${i})`);

/**
 * Item 17+++, part F: the threads to watch, the narrator's pick from the record of the few live stories with the most at
 * stake this season, each a click away: follow the person, open the message trail (god view's), take the map there. The
 * eyes the page sees through choose which (a seat's, only from what it knows); a telling anew stands beside the first.
 */
export function ThreadsPanel({
  tellings,
  trails,
  director,
  canTellAnew,
  onPerson,
  onTrail,
  onPlace,
  onDirector,
  onTellAnew,
}: {
  /** The season's tellings, the first first; null while reading. */
  tellings: Thread[][] | null;
  /** Whether the message trails are open to the page (god view). */
  trails: boolean;
  director: boolean;
  canTellAnew: boolean;
  onPerson: (id: string) => void;
  onTrail: (id: string) => void;
  onPlace: (province: string) => void;
  onDirector: (on: boolean) => void;
  onTellAnew: () => void;
}) {
  const first = tellings?.[0] ?? [];
  return (
    <>
      <h3>Threads to watch</h3>
      <p className="muted">The live stories with the most at stake this season, as the narrator picks them from the record. Choosing one changes nothing in the game.</p>
      <label className="row" title="Takes the map to the scene with the most at stake as each season plays out">
        <input type="checkbox" checked={director} onChange={(e) => onDirector(e.target.checked)} /> Director camera
      </label>
      {tellings === null && <p className="muted">Reading…</p>}
      {tellings !== null && first.length === 0 && <p className="muted">Nothing hangs in the balance this season, as far as these eyes can see.</p>}
      {(tellings ?? []).map((told, i) => (
        <section key={i}>
          {heading(i, tellings!.length) !== "" && <h4>{heading(i, tellings!.length)}</h4>}
          {told.map((t, j) => (
            <div className="item thread" key={j}>
              <div className="body">{t.text}</div>
              <div className="row">
                {t.person !== "" && (
                  <button className="small link" onClick={() => onPerson(t.person)}>
                    Follow
                  </button>
                )}
                {trails && t.trail !== "" && (
                  <button className="small link" onClick={() => onTrail(t.trail)}>
                    Message trail
                  </button>
                )}
                {t.province !== "" && (
                  <button className="small link" onClick={() => onPlace(t.province)}>
                    Show on the map
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
      {canTellAnew && first.length > 0 && (
        <p>
          <button className="small" onClick={onTellAnew} title="The narrator tells this season's threads again; the first telling is kept beside the new">
            Tell anew
          </button>
        </p>
      )}
    </>
  );
}
