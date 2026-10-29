import type { GameConfig } from "@amarna/engine";
import { Marks, markGlyph, markText } from "../map/crossings.ts";
import { MapCard } from "./MapCard.tsx";

/** A crossing or a stretch of rough ground, tapped on the map: what it does, in words (item 11c+). */
export function MarkInfo({ id, config, onClose }: { id: string; config: GameConfig; onClose: () => void }) {
  const m = Marks.find((x) => x.key === id);
  if (m === undefined) return null;
  const t = markText(m, config);
  return (
    <MapCard
      className="infocard"
      label={t.title}
      onClose={onClose}
      head={
        <>
          <svg viewBox="-10 -10 20 20" className="xmark head" dangerouslySetInnerHTML={{ __html: markGlyph(m.kind) }} />
          <h3>{t.title}</h3>
        </>
      }
    >
      {t.lines.map((l) => (
        <p className="small" key={l}>
          {l}
        </p>
      ))}
    </MapCard>
  );
}
