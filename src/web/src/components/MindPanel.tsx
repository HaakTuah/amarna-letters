import type { Power } from "@amarna/engine";
import type { MindPage } from "@amarna/game";
import { useEffect, useState } from "react";
import { powerName, when } from "../ui/format.ts";

/** A page's heading: what the king wrote it as. */
const heading = (page: string): string =>
  page === "notes"
    ? "His notes of his last orders"
    : page === "summary"
      ? "His summary of older seasons"
      : page === "plan"
        ? "The plan he plays by"
        : page.startsWith("ledger:")
          ? `His ledger: ${powerName(page.slice(7))}`
          : page;

const rank = (page: string): number => (page === "plan" ? 0 : page === "notes" ? 1 : page === "summary" ? 2 : 3);

/**
 * Item 17+++, "a mind's own words are kept and shown": a model king's notes, summary, plan and ledger as they stood at the
 * season shown, each with the season he wrote it, beside the seat's decisions. Open only where the record is (a spectator
 * watching through the seat, or every view once the game ends), never another seat's during play.
 */
export function MindPanel({ power, turn, session }: { power: Power; turn: number; session: { mind(who: Power, turn: number): Promise<MindPage[]> } }) {
  const [pages, setPages] = useState<MindPage[] | null>(null);
  useEffect(() => {
    let live = true;
    setPages(null);
    void session.mind(power, turn).then((p) => live && setPages(p));
    return () => {
      live = false;
    };
  }, [power, turn, session]);
  return (
    <>
      <h3>{powerName(power)}, in his own words</h3>
      <p className="muted">What the king wrote for himself, as it stood at the end of the season shown: nobody else's words.</p>
      {pages === null && <p className="muted">Reading…</p>}
      {pages !== null && pages.length === 0 && <p className="muted">He had written nothing for himself by then.</p>}
      {(pages ?? [])
        .slice()
        .sort((a, b) => rank(a.page) - rank(b.page) || (a.page < b.page ? -1 : 1))
        .map((p) => (
          <div className="item" key={p.page}>
            <div className="muted">
              {heading(p.page)}, {when(p.turn, power)}
            </div>
            <div className="body">{p.text}</div>
          </div>
        ))}
    </>
  );
}
