import { WorldMap, type Power } from "@amarna/engine";
import { memo } from "react";
import { captureLine, unitKindName, type MapScene, type MoveStyle } from "../map/scene.ts";
import type { FrameNews, FrameSleep } from "../session/frames.ts";
import { dated, powerName, provinceName, shekels, when, whenCap } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";

const rank = (s: MoveStyle): number => (s === "Attack" ? 0 : s === "Bounce" ? 1 : s === "Move" ? 2 : s === "Convoy" ? 3 : 4);
const tag = (s: MoveStyle): string =>
  s === "Attack" ? "attack" : s === "Bounce" ? "bounced" : s === "Move" ? "move" : s === "Support" ? "support" : s === "SupportCut" ? "support cut" : "convoy";
const powerRank = (p: Power): number => ["Egypt", "Hatti", "Babylonia", "Mitanni", "Assyria", "Arzawa", "Alashiya"].indexOf(p);
const personRank = (k: string): number => ["Envoy", "Spy", "Captive", "Missing"].indexOf(k);
const ordinal = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** A sleeping seat's line, with the date labels: asleep since when, woken by when at the latest, and why it last woke. */
export function sleepLine(s: FrameSleep, court: Power | null): string {
  return (
    (s.asleep ? `Asleep since ${when(s.lastCalled + 1, court)}; wakes by ${when(s.wakeAt, court)} at the latest.` : "Awake.") +
    (s.lastWokeAt > 0 ? ` Last woken in ${when(s.lastWokeAt, court)} by: ${s.lastReasons.join("; ")}.` : s.spells > 0 ? " Sleeping for the first time." : " Has not slept yet.")
  );
}

/**
 * The season in words, beside the map: what was ordered and what came of it, what changed hands, who is on the road and
 * where everyone stands, as the current view knows it. Every line points at the map: a tap selects the place or follows
 * the person. Drawn again only when the scene changes.
 */
export const SeasonPanel = memo(function SeasonPanel({
  scene,
  onProvince,
  onPerson,
}: {
  scene: MapScene;
  onProvince: (id: string) => void;
  onPerson: (id: string) => void;
}) {
  const f = scene.frame;
  const v = scene.viewer;
  const moves = [...scene.moves].sort((a, b) => rank(a.style) - rank(b.style) || powerRank(a.power) - powerRank(b.power));
  const events = f.events.filter((e) => e.kind !== "support" && e.kind !== "battle" && e.kind !== "conquest" && (v === null || e.visibleTo.includes(v)));
  const news = v !== null ? f.news.filter((n) => n.court === v) : [];
  const follow = (id: string | null): void => {
    if (id !== null) onPerson(id);
  };
  const newsAt = (n: FrameNews): void => {
    const at = n.province ?? (n.fromCourt !== null ? WorldMap.default.capital(n.fromCourt).id : null);
    if (at !== null) onProvince(at);
  };

  return (
    <div className="season-panel">
      {scene.index === 0 ? (
        <>
          <h3>The opening positions</h3>
          <p className="muted">Every king holds his homeland; the free cities hold their walls. Step forward to see the first season.</p>
        </>
      ) : (
        <>
          <h3>{whenCap(scene.index, v)}</h3>
          <p className="muted small">
            {v !== null ? `What ${powerName(v)} saw of the season's moves, and its own people as it believes them.` : "Everything that happened in the season."}
          </p>
        </>
      )}

      {f.ended && scene.index === f.index && (
        <div className="notice">
          <strong>The age has ended</strong> ({f.endReason}). Winner: {f.winners.join(" and ")}. The richest characters are ranked under Standings.
        </div>
      )}

      {scene.captures.length > 0 && (
        <>
          <h4>Changed hands</h4>
          <ul className="lines">
            {scene.captures.map((c) => (
              <li key={c.province} onClick={() => onProvince(c.province)}>
                <Emblem power={c.to} /> <strong>{provinceName(c.province)}</strong> {captureLine(c)}
              </li>
            ))}
          </ul>
        </>
      )}

      {moves.length > 0 ? (
        <>
          <h4>Moves and battles</h4>
          <ul className="lines">
            {moves.map((m, i) => (
              <li key={i} className={`ms-${m.style.toLowerCase()}`} onClick={() => onProvince(m.to)}>
                <Emblem power={m.power} /> <span className="mv-tag">{tag(m.style)}</span> {m.text}
              </li>
            ))}
            {scene.destroyed.map((d, i) => (
              <li key={`d${i}`} className="ms-destroyed" onClick={() => onProvince(d.province)}>
                <Emblem power={d.power} /> <span className="mv-tag">destroyed</span> {powerName(d.power)}'s {unitKindName(d.kind)} in {provinceName(d.province)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        scene.index > 0 && <p className="muted">{v === null ? "Every unit held." : "No moves were seen."}</p>
      )}

      {scene.travellers.length > 0 && (
        <>
          <h4>On the road</h4>
          <ul className="lines">
            {[...scene.travellers]
              .sort((a, b) => a.arrive - b.arrive)
              .map((t) => (
                <li key={t.key} onClick={() => follow(t.characterId)} className={t.believed ? "believed" : ""}>
                  <Emblem power={t.owner} /> {t.title}
                  <span className="muted">
                    ; {t.believed ? "due back about" : "arrives"} {when(t.arrive, v)}
                    {t.gold > 0 && t.kind !== "Gold" ? `, carrying ${shekels(t.gold)}` : ""}
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}

      {scene.people.length > 0 && (
        <>
          <h4>{v === null ? "At foreign courts and posts" : "Your people abroad, and envoys at your court"}</h4>
          <ul className="lines">
            {[...scene.people]
              .sort((a, b) => personRank(a.kind) - personRank(b.kind) || ordinal(a.title, b.title))
              .map((p) => (
                <li key={p.id} onClick={() => follow(p.id)} className={p.believed ? "believed" : ""}>
                  <Emblem power={p.owner} /> {p.title}
                  {p.double && v === null ? " (secretly serves another)" : ""}
                </li>
              ))}
          </ul>
        </>
      )}

      {news.length > 0 && (
        <>
          <h4>Word that reached you</h4>
          <ul className="lines">
            {news.map((n, i) => (
              <li key={i} onClick={() => newsAt(n)}>
                <span className="mv-tag">{n.kind === "SpyReport" ? "agent" : "rumour"}</span> <strong>{n.title}</strong>: {dated(n.body, v)}
              </li>
            ))}
          </ul>
        </>
      )}

      {events.length > 0 && (
        <>
          <h4>Also this season</h4>
          <ul className="lines plain">
            {events.slice(-30).map((e, i) => (
              <li key={i}>{dated(e.text, v)}</li>
            ))}
          </ul>
        </>
      )}

      {v === null && f.sleep.size > 0 && (
        <>
          <h4>Sleeping kings</h4>
          <ul className="lines plain">
            {[...f.sleep]
              .sort((a, b) => powerRank(a[0]) - powerRank(b[0]))
              .map(([p, s]) => (
                <li key={p}>
                  <Emblem power={p} /> {sleepLine(s, null)}
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}, (a, b) => a.scene === b.scene);
