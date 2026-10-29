/**
 * Item 12, "Languages", as script kings play it. A king sees only what people say they speak, in words ("Kings never see
 * skills"), and which languages each court speaks and reads, which is map data. So he sends to a court the envoy who says
 * he speaks its language, or Akkadian where it keeps Akkadian scribes, and his own king's well enough to take in his words
 * quickly; and when an envoy nobody at his court understands waits there, he takes on a free person at court who says he
 * speaks both the envoy's language and his own, to stay a few seasons and bridge. `--no-language-play` turns it off, and
 * `--language-play-half` leaves it to half the kings.
 */
import {
  courtReads,
  courtSpeaks,
  spokenIn,
  type CharacterView,
  type Power,
  type SeatView,
  UnheardTitle,
  WorldMap,
} from "@amarna/engine";

export const LanguagePlay: {
  off: boolean;
  only: ReadonlySet<string> | null;
  on: (me: string) => boolean;
} = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

const Levels: Record<string, number> = { halting: 1, good: 2, fluent: 3 };

/** What a person says it speaks, by language, as a level from 1 (halting) to 3 (fluent). */
export function claimedTongues(c: CharacterView): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of c.speaks) {
    const m = /^(.*) \((halting|good|fluent)\)$/.exec(s);
    if (m !== null) out.set(m[1], Levels[m[2]]);
  }
  return out;
}

/**
 * How well a person would be understood at a court, as he says: the court's own language counts in full, Akkadian where it
 * keeps Akkadian scribes nearly so, and any other tongue spoken at its capital less; and how quickly he would take in his
 * own king's words, by the king's language, at half weight.
 */
export function tongueScore(c: CharacterView, to: Power, me: Power): number {
  const said = claimedTongues(c);
  const capital = WorldMap.default.capital(to).id;
  const own = courtSpeaks(to, capital);
  let there = said.get(own) ?? 0;
  if (courtReads(to, capital).includes("Akkadian"))
    there = Math.max(there, 0.9 * (said.get("Akkadian") ?? 0));
  for (const [l] of spokenIn(capital, to).entries())
    if (l !== own) there = Math.max(there, 0.6 * (said.get(l) ?? 0));
  const mine = said.get(courtSpeaks(me, WorldMap.default.capital(me).id)) ?? 0;
  return there + 0.5 * mine;
}

/**
 * The envoy for a court, from those at hand in the order the king would otherwise take them: the first who says he speaks
 * well enough to be understood there (a score of 2 or more), else the best by what he says.
 */
export function envoyFor(
  ready: readonly CharacterView[],
  to: Power,
  me: Power,
  fromEnd: boolean,
): CharacterView {
  const order = fromEnd ? [...ready].reverse() : [...ready];
  if (!LanguagePlay.on(me)) return order[0];
  const good = order.find((c) => tongueScore(c, to, me) >= 2);
  if (good !== undefined) return good;
  let best = order[0];
  for (const c of order)
    if (tongueScore(c, to, me) > tongueScore(best, to, me)) best = c;
  return best;
}

/**
 * The envoys standing at this court whom nobody understands (the season's notice names each), and the free people at court
 * who say they speak one of the envoy's languages and the king's own: the cheapest such bridge for each, if any.
 */
export function bridgesWanted(
  v: SeatView,
  free: readonly CharacterView[],
): CharacterView[] {
  if (!LanguagePlay.on(v.power)) return [];
  const mine = courtSpeaks(v.power, WorldMap.default.capital(v.power).id);
  const out: CharacterView[] = [];
  for (const n of v.inbox) {
    if (n.title !== UnheardTitle || n.subject === null) continue;
    const envoy = v.known.find((c) => c.id === n.subject);
    if (envoy === undefined) continue;
    const his = claimedTongues(envoy);
    const fits = free.filter((c) => {
      const said = claimedTongues(c);
      return (
        (said.get(mine) ?? 0) >= 2 &&
        [...his.keys()].some((l) => (said.get(l) ?? 0) >= 2) &&
        !out.includes(c) &&
        c.askingPrice !== null
      );
    });
    fits.sort(
      (a, b) => a.askingPrice! - b.askingPrice! || (a.id < b.id ? -1 : 1),
    );
    if (fits.length > 0) out.push(fits[0]);
  }
  return out;
}
