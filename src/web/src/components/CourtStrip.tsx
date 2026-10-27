import { AllPowers, king, type Power } from "@amarna/engine";
import { useState } from "react";
import type { MapScene } from "../map/scene.ts";
import type { FrameSleep } from "../session/frames.ts";
import { powerName, when } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";
import { sleepLine } from "./SeasonPanel.tsx";

const short = (p: Power): string => (p === "Babylonia" ? "Babylon" : p === "Alashiya" ? "Alashiya" : powerName(p));

const title = (p: Power, held: number, fallen: boolean, s: FrameSleep | null): string =>
  `${powerName(p)}: ${held} provinces${fallen ? ", fallen" : ""}` + (s?.asleep ? `; asleep, wakes by ${when(s.wakeAt, null)} at the latest` : "");

/**
 * The seven courts along the top of the map: each power's colour and emblem (the key to the board), how many provinces it
 * holds, and in god view which kings sleep, until when at the latest, and what last woke them. No court's view shows
 * another's sleep.
 */
export function CourtStrip({ scene }: { scene: MapScene }) {
  const [open, setOpen] = useState<Power | null>(null);
  const f = scene.frame;
  const god = scene.viewer === null;
  const heldBy = (p: Power): number => [...f.owner.values()].filter((o) => o === p).length;
  const sleepOf = (p: Power): FrameSleep | null => (god ? (f.sleep.get(p) ?? null) : null);
  return (
    <div className="courtbar">
      <div className="courts">
        {AllPowers.map((p) => {
          const held = heldBy(p);
          const fallen = f.eliminated.has(p);
          const sleep = sleepOf(p);
          return (
            <button
              key={p}
              className={`court${open === p ? " on" : ""}${fallen ? " fallen" : ""}${sleep?.asleep ? " asleep" : ""}${scene.viewer === p ? " me" : ""}`}
              title={title(p, held, fallen, sleep)}
              onClick={() => setOpen(open === p ? null : p)}
            >
              <Emblem power={p} />
              <span className="cname">{short(p)}</span>
              <span className="ccount">{held}</span>
              {sleep?.asleep && (
                <svg className="moon" viewBox="-10 -10 20 20" aria-label="asleep">
                  <use href="#g-moon" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {open !== null && (
        <div className="court-pop">
          <strong>
            <Emblem power={open} /> {powerName(open)}
          </strong>{" "}
          · {king(open)} · {heldBy(open)} provinces
          {god || scene.viewer === open ? `, ${f.units.filter((u) => u.power === open).length} units` : ""}
          {f.eliminated.has(open) ? " · fallen" : ""}
          {sleepOf(open) !== null ? (
            <div className="small">{sleepLine(sleepOf(open)!, null)}</div>
          ) : (
            god && f.sleep.size > 0 && <div className="small muted">This king does not sleep (script and human kings play every season).</div>
          )}
        </div>
      )}
    </div>
  );
}
