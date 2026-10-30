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
        <span className="lg-wide">
          {(["egypt", "anatolia", "hurrian", "kassite", "canaan", "nomad", "aegean"] as const).map((k) => (
            <svg key={k} viewBox="-12 -12 24 24"><rect className="tok-bg lg" x="-11" y="-11" width="22" height="22" rx="4" /><use href={`#fig-army-${k}`} className="tok-icon" x="-10" y="-10" width="20" height="20" /></svg>
          ))}{" "}
          army, in its land's own style: Egypt's spearmen, the Anatolian chariot, the Hurrian chariot of the seals, Babylonia's standard, Canaanite foot, the steppe's archers, the Aegean's shields
        </span>
        <span className="lg-wide">
          {(["egypt", "aegean", "levant"] as const).map((k) => (
            <svg key={k} viewBox="-12 -12 24 24"><circle className="tok-bg lg" r="11.5" /><use href={`#fig-fleet-${k}`} className="tok-icon" x="-10" y="-10" width="20" height="20" /></svg>
          ))}{" "}
          fleet: Egypt's river ship, the Aegean galley, the Syrian merchantman
        </span>
        <span><svg viewBox="-12 -12 24 24"><rect className="tok-bg ghost-lg" x="-11" y="-11" width="22" height="22" rx="4" /><use href="#fig-army-canaan" className="tok-icon dim" x="-10" y="-10" width="20" height="20" /></svg> seen before, not now</span>
        <span><svg viewBox="-10 -10 20 20"><rect className="chip-bg lg" x="-8" y="-8" width="16" height="16" rx="3.5" /><use href="#g-tablet" className="chip-icon" x="-6" y="-6" width="12" height="12" /></svg> envoy at a court; on the road, a figure with his tablet</span>
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
        <span><svg viewBox="-12 -12 24 24"><circle className="clash-bg f-hatti" r="9" /><use href="#fig-clash" className="clash-icon" x="-7" y="-7" width="14" height="14" /></svg> a battle, in the winner's colour</span>
        <span><svg viewBox="-12 -12 24 24"><use href="#fig-tent" className="tent t-hatti" x="-8" y="-8" width="16" height="16" /></svg> a siege camp: the besieger's tents round the walls</span>
        <span className="lg-wide lg-roads">
          {[0, 1, 2, 3].map((q) => (
            <svg key={q} viewBox="0 0 30 14"><path className={`road-net q${q}`} d="M2,7H28" /></svg>
          ))}{" "}
          roads, by their province's level: a track nobody keeps, a kept track, a road with bridges, wells and posts, a royal road; small squares, relay stations
        </span>
        <span><svg viewBox="-9 -9 18 18"><circle className="wk-bg" r="7" /><path className="hb-quay" d="M-6.5,-5H6.5V-3H-4.5V5H-6.5Z" /><path className="hb-boat" d="M-2.5,-1.5H5Q4,0.8 1.2,0.8Q-1.5,0.8 -2.5,-1.5Z" /></svg> a harbour, from a beach to quays (close up)</span>
        <span><svg viewBox="-9 -9 18 18"><circle className="wk-bg" r="7" /><circle className="wt-well" r="3" /><path className="wt-sweep" d="M-4.5,-5.5L4.5,-2.5" /></svg> a well, then cisterns, for a siege</span>
        <span><svg viewBox="-9 -9 18 18"><circle className="wk-bg" r="7" /><path className="gr-dome full" d="M-7.2,4V0A2.2,2.6 0 0 1 -2.8,0V4Z" /><path className="gr-dome" d="M-2.2,4V0A2.2,2.6 0 0 1 2.2,0V4Z" /></svg> granaries, filled as far as the stores go (your own)</span>
        <span><svg viewBox="-9 -9 18 18"><circle className="wk-bg" r="7" /><path className="mn-pick" d="M-5,5L3,-3M0.5,-5.5Q3.5,-5 5.5,-1.5" /><path className="mn-ore" d="M-1,4.5L1.5,1.5L4.5,2.5L5,5Z" /></svg> mines</span>
        <span><svg viewBox="-12 -12 24 24"><use href="#fig-stele" className="stele" x="-8" y="-8" width="16" height="16" /></svg> a battlefield's memorial</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="seal s-free" r="7" /><g className="ruin-lg"><path className="ruin-crack" d="M-6,-4L-1,-1L-3,3L2,6M2,-6L1,-1L6,1" /></g></svg> a city in ruins: sacked, not yet rebuilt</span>
        <span><svg viewBox="0 0 30 14"><rect width="30" height="14" fill="url(#scrub)" /></svg> wild land: no ruler, or a band works it</span>
        <span><svg viewBox="-9 -9 18 18"><circle className="wk-bg" r="7" /><path className="fm-dome" d="M-4,5V-1A4,4.6 0 0 1 4,-1V5Z" /><path className="fm-crack" d="M-1,-4L1,-1L-1,2L1,5" /></svg> famine: its countryside went short (close up)</span>
        <span><svg viewBox="-9 -9 18 18"><circle className="wk-bg" r="7" /><use href="#fig-houses" className="tw-houses" x="-5.5" y="-5.5" width="11" height="11" /></svg> a town: green rim growing, red shrinking (close up)</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="life-bg" r="9" /><use href="#fig-caravan" className="life-icon" x="-7.5" y="-7.5" width="15" height="15" /></svg> a caravan on the road</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="life-bg" r="9" /><use href="#fig-walkers" className="life-icon" x="-7.5" y="-7.5" width="15" height="15" /></svg> people carried off, on their road</span>
        <span className="lg-wide">In a king's view, the map is drawn by his scribes: Egypt's on papyrus, every other court's pressed in clay. In the corner, the diviners' sign in the sky darkens as the end draws near, and the map's border with it.</span>
        <span><svg viewBox="-12 -12 24 24"><circle className="band-bg" r="9" /><use href="#fig-fire" className="band-icon" x="-7" y="-7" width="14" height="14" /></svg> a band's campfire (with a ship, a pirate crew)</span>
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
