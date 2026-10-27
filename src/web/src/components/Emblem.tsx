import type { Power } from "@amarna/engine";
import { emblem } from "../map/glyphs.ts";

/** A power's emblem in its colour, inline with text: the key to the map's colours and its colour-free emblems. */
export function Emblem({ power }: { power: Power | null | undefined }) {
  return (
    <svg className={`emblem-inline ${power ? `e-${power.toLowerCase()}` : "e-none"}`} viewBox="-10 -10 20 20" aria-hidden="true">
      {power ? (
        <>
          <circle r="9.6" className="ei-bg" />
          <path d={emblem(power)} className="ei-fg" transform="scale(.78)" />
        </>
      ) : (
        <circle r="8.5" className="ei-free" />
      )}
    </svg>
  );
}
