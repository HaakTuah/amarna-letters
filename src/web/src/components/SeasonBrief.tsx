import type { SeatView } from "@amarna/engine";
import { briefRows, type BriefRow } from "../ui/brief.ts";
import { shown } from "../ui/names.ts";

/**
 * The season brief (item 18b): at most six lines of what this season brought the seat, most urgent first, under the
 * panel's tabs while its orders are open. A tap on a line shows its place on the map and opens what answers it.
 */
export function SeasonBrief({ view, onLine }: { view: SeatView; onLine: (row: BriefRow) => void }) {
  const rows = briefRows(view);
  return (
    <section className="brief" aria-label="This season">
      {rows.length === 0 ? (
        <p className="brief-none">Nothing new concerns you this season.</p>
      ) : (
        <ul>
          {rows.map((r, i) => (
            <li key={i}>
              <button className={`brief-line brief-${r.kind.toLowerCase()}`} onClick={() => onLine(r)}>
                <span className="brief-icon" aria-hidden="true">
                  {r.icon}
                </span>
                <span className="sr">{r.label}: </span>
                <span className="brief-text">{shown(r.text)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
