import { AllPowers, type GameConfig } from "@amarna/engine";
import { MarkKindsShown, MarkNames, markGlyph } from "../map/crossings.ts";
import { dash } from "../map/glyphs.ts";
import { powerName } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";
import { MapCard } from "./MapCard.tsx";

/** The map's key, compact: opened from the map and closed back to it. Icons reuse the map's own symbols. */
export function MapLegend({ config, onClose }: { config: GameConfig; onClose: () => void }) {
  // What the ground does, in one line: rough ground, passes and river crossings help a unit that stands its ground.
  const ground =
    config.terrainDefence <= 0
      ? "The ground gives no defence in this game."
      : `Rough ground, and a pass or a river crossing on the attacker's way, give a unit standing its ground ${config.terrainDefence} more against that attack (${config.terrainDefence} in all). At sea the blockade decides: an army lands only where no enemy fleet holds the coast's waters.`;
  return (
    <MapCard className="legend" label="Map legend" onClose={onClose} head={<strong>Legend</strong>}>
      <div className="legend-grid">
        <span><svg viewBox="-12 -12 24 24"><rect className="tok-bg lg" x="-11" y="-11" width="22" height="22" rx="4" /><use href="#g-army" className="tok-icon" x="-9.5" y="-9.5" width="19" height="19" /></svg> army (chariots)</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="tok-bg lg" r="11.5" /><use href="#g-fleet" className="tok-icon" x="-9.5" y="-9.5" width="19" height="19" /></svg> fleet</span>
        <span><svg viewBox="-12 -12 24 24"><rect className="tok-bg ghost-lg" x="-11" y="-11" width="22" height="22" rx="4" /><use href="#g-army" className="tok-icon dim" x="-9.5" y="-9.5" width="19" height="19" /></svg> seen before, not now</span>
        <span><svg viewBox="-10 -10 20 20"><rect className="chip-bg lg" x="-8" y="-8" width="16" height="16" rx="3.5" /><use href="#g-tablet" className="chip-icon" x="-6" y="-6" width="12" height="12" /></svg> envoy</span>
        <span><svg viewBox="-10 -10 20 20"><rect className="chip-bg lg" x="-8" y="-8" width="16" height="16" rx="3.5" /><use href="#g-eye" className="chip-icon" x="-6.5" y="-6.5" width="13" height="13" /></svg> spy at a post</span>
        <span><svg viewBox="-10 -10 20 20"><rect className="chip-bg lg" x="-8" y="-8" width="16" height="16" rx="3.5" /><use href="#g-fetter" className="chip-icon" x="-6.5" y="-6.5" width="13" height="13" /></svg> captive or detained</span>
        <span><svg viewBox="-10 -10 20 20"><use href="#g-ingot" className="ingot lg" x="-9" y="-9" width="18" height="18" /></svg> gold on the road</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="halo" r="11" /><rect className="chip-bg lg" x="-7" y="-7" width="14" height="14" rx="7" /></svg> traveller (place guessed)</span>
        <span><svg viewBox="-10 -10 20 20"><path className="news-bg" d="M-9,-7H9V5H2L-2,9V5H-9Z" /><text className="news-q" y="3">?</text></svg> rumour or report</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="cap-ring" r="10" /><circle className="seal s-hatti" r="7.5" /></svg> capital</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="walls" r="9" /><circle className="seal s-free" r="6" /></svg> walls, a ring for each level (broken while besieged)</span>
        <span><svg viewBox="0 0 40 14"><path className="lg-arrow" d="M2,7H32" /><path className="lg-head" d="M30,2L38,7L30,12Z" /></svg> move</span>
        <span><svg viewBox="0 0 40 14"><path className="lg-arrow" d="M2,7H30" /><use href="#g-burst" className="burst" x="27" y="0" width="13" height="13" /></svg> attack</span>
        <span><svg viewBox="0 0 40 14"><path className="lg-arrow" d="M2,7H22" /><path className="lg-bar" d="M23,1V13" /></svg> bounced</span>
        <span><svg viewBox="0 0 40 14"><path className="lg-sup" d="M2,7H32" /><circle className="lg-dot" cx="34" cy="7" r="3" /></svg> support</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="lg-cap" r="9" /></svg> changed hands</span>
        <span><svg viewBox="0 0 30 14"><rect width="30" height="14" className="lg-fog" fill="url(#fog)" /></svg> out of sight: the denser, the older the news (land: of who holds it)</span>
        <span><svg viewBox="0 0 30 14"><rect width="30" height="14" className="lg-fert" fill="url(#fert4)" /></svg> rich land (close furrows)</span>
        <span><svg viewBox="0 0 30 14"><rect width="30" height="14" className="lg-desert" fill="url(#stipple)" /></svg> desert (it feeds no army: an army there lives on its baggage, its king's stores and his caravans)</span>
        <span><svg viewBox="0 0 30 14"><path className="lg-lit" d="M2,13L11,3L13,13Z M15,13L22,5L23,13Z" /><path className="lg-shade" d="M11,3L20,13L13,13Z M22,5L29,13L23,13Z" /></svg> mountains and hills (real relief, lit from the north-west)</span>
        <span><svg viewBox="0 0 30 14"><rect width="30" height="14" className="marsh" fill="url(#reeds)" /></svg> marsh</span>
        <span className="season"><svg viewBox="0 0 30 14"><rect width="30" height="14" className="inundation" /><rect width="30" height="14" fill="url(#flood)" /></svg> the Nile in flood (Akhet); a river in spate; a ruinous flood still lying</span>
        <span className="season"><svg viewBox="0 0 30 14"><rect width="30" height="14" className="green" /></svg> green with the winter rains (Peret)</span>
        <span className="season"><svg viewBox="0 0 30 14"><rect width="30" height="14" className="frost lg-frost" /></svg> snow on the high ground, frost on the plateau (Peret): passes slow, the open sea stormy</span>
        <span className="season"><svg viewBox="0 0 30 14"><rect width="30" height="14" className="ripe" /><rect width="30" height="14" fill="url(#sheaves)" /></svg> harvest gold, where the land reaps this season</span>
        <span className="season"><svg viewBox="0 0 30 14"><rect width="30" height="14" className="dry" /></svg> dry at the end of summer</span>
        <span className="season"><svg viewBox="0 0 30 14"><rect width="30" height="14" className="drought" /><rect width="30" height="14" fill="url(#cracks)" /></svg> drought (in a king's view, as his people last saw it)</span>
        <span className="season"><svg viewBox="0 0 30 14"><rect width="30" height="14" className="spoiled" /></svg> fields spoiled the year after a flood; paler brown, a low Nile (in a king's view, as last seen)</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="seal s-hatti" r="3.4" /></svg> a city's small seal, where its badge would touch a more important one (zoom in for the badge)</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="seal s-hatti crowd-lg" r="3.4" /></svg> small seal with a dark rim: its troops are hidden until you zoom in</span>
        {MarkKindsShown.map((k) => (
          <span key={k}>
            <svg viewBox="-10 -10 20 20" className="xmark" dangerouslySetInnerHTML={{ __html: markGlyph(k) }} /> {MarkNames[k]}
          </span>
        ))}
    </div>
      <p className="muted small">{ground} Tap a mark on the map for what it does to a journey and to a defender.</p>
      <p className="muted small">Each power has a colour, an emblem and its own border line:</p>
      <div className="legend-powers">
        {AllPowers.map((p) => (
          <span key={p}>
            <Emblem power={p} /> {powerName(p)}{" "}
            <svg className="lg-band" viewBox="0 0 36 8">
              <line x1="0" y1="4" x2="36" y2="4" className={`band b-${p.toLowerCase()}`} strokeDasharray={dash(p)} />
            </svg>
          </span>
        ))}
      </div>
    </MapCard>
  );
}
