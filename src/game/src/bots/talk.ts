/**
 * Talk of a province's leaning (item 17++, part D, #431): "each of whom may act on it: the king with concessions, a governor
 * or troops, his enemies by courting the claimant". Travellers' talk that the people of a province of ours lean toward
 * another king reaches us at the roads' pace, and a script king treats that province as restless, easing what it is asked
 * (`freedom.ts`), before its offer reaches the other king and he takes it up. Talk that a rival's province leans toward
 * someone warms a script king to that claimant (`Brain.learn`); talk that one leans our way sends a spy of ours to watch it,
 * whose reports bring its offer home (`statecraft-court.ts`). An offer read on a carrier we caught (#553) is heeded as
 * talk of it would be. `--no-talk-play` and `--talk-play-half` ignore the talk and the offers caught, only to measure what
 * heeding them is worth.
 */
import { AllPowers, landFor, OfferCaught, type Power } from "@amarna/engine";
import { Board } from "./board.ts";

/** Script kings that ignore talk of their land's leaning (`--no-talk-play`, `--talk-play-half`). None by default. */
export const TalkPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The power a notice names, by the name our court knows and gives him (a house's, where it gives his name to another). */
function named(b: Board, name: string): Power | null {
  return AllPowers.find((q) => landFor(b.me, q) === name) ?? null;
}

/** Seasons a travellers' read of a province's unrest is acted on (a first guess). */
export const TalkHeeded = 4;

/**
 * The provinces of ours that travellers' talk, as last heard, calls restless or near revolt: talk of a people leaning
 * toward another king is kept as such a read of the land (`SeatView.moods`), dated, until newer word replaces it.
 */
export function talkedAway(b: Board): string[] {
  if (!TalkPlay.on(b.me)) return [];
  const out = b.v.moods.filter((r) => r.source === "travellers" && (r.mood === "restless" || r.mood === "near revolt") && b.v.turn - r.seen <= TalkHeeded && b.ownerOf(r.province) === b.me).map((r) => r.province);
  // #553: and those whose people's own offer we read on a carrier we caught, for as long as talk of it would be heeded.
  for (const [id, read] of b.offersRead.entries()) if (b.v.turn - read <= TalkHeeded && b.ownerOf(id) === b.me && !out.includes(id)) out.push(id);
  return out;
}

/** The province's name and the claimant's in the notice of an offer caught (`OfferCaught`); null for any other notice. */
function offerCaught(body: string): [string, string] | null {
  if (!body.startsWith(OfferCaught.opens)) return null;
  const people = body.indexOf(OfferCaught.people);
  const ends = people < 0 ? -1 : body.indexOf(OfferCaught.words, people);
  if (ends < 0) return null;
  const said = body.slice(people + OfferCaught.people.length, ends);
  const to = said.lastIndexOf(" to ");
  return to < 0 ? null : [said.slice(0, to), said.slice(to + " to ".length)];
}

/** The offers read this season on carriers we caught (#553): from which province, to which claimant. */
export function offersCaught(b: Board): { province: string; claimant: Power }[] {
  if (!TalkPlay.on(b.me)) return [];
  const out: { province: string; claimant: Power }[] = [];
  for (const m of b.v.inbox) {
    if (m.title !== "A letter taken on the road") continue;
    const x = offerCaught(m.body);
    const p = x !== null ? Board.Map.provinces.find((q) => q.name === x[0]) : undefined;
    const claimant = p === undefined ? null : named(b, x![1]);
    if (p !== undefined && claimant !== null) out.push({ province: p.id, claimant });
  }
  return out;
}

/** The provinces another king holds that talk this season says lean our way: where a spy of ours would bring their offer. */
export function talkedOurWay(b: Board): string[] {
  if (!TalkPlay.on(b.me)) return [];
  const out: string[] = [];
  for (const m of b.v.inbox) {
    if (!m.title.startsWith("Talk of ") || !m.body.includes(" lean your way")) continue;
    const p = Board.Map.provinces.find((q) => q.name === m.title.slice("Talk of ".length));
    if (p !== undefined && b.ownerOf(p.id) !== b.me && !out.includes(p.id)) out.push(p.id);
  }
  return out;
}

/** How much a script king's trust in a claimant rises on talk that a rival's land leans toward him (a first guess). */
export const CourtTrust = 0.1;

/** The claimants that talk this season says a rival's people lean toward: "lean toward X, away from H", ours being neither. */
export function claimantsTalkedOf(b: Board): Power[] {
  if (!TalkPlay.on(b.me)) return [];
  const out: Power[] = [];
  for (const m of b.v.inbox) {
    if (!m.title.startsWith("Talk of ")) continue;
    const at = m.body.indexOf(" lean toward ");
    const away = m.body.indexOf(", away from ");
    if (at < 0 || away < 0) continue;
    const claimant = named(b, m.body.slice(at + " lean toward ".length, away));
    if (claimant !== null && claimant !== b.me && !out.includes(claimant)) out.push(claimant);
  }
  return out;
}
