/**
 * A script player and vassalage (build order item 11+, "Vassalage is words" and "What a breach means, and to whom"). It
 * reads every vassal bond it knows from the tablets' template clauses (the opening bonds are public, the rest it holds
 * copies of), and plays both sides by its own sums, as the design asks:
 *
 * - A vassal pays its tribute once a year while its overlord's power over it is worth the price: the overlord strong and
 *   near enough to punish it, or its protection needed against a third king. It stops when it has grown strong enough or
 *   the overlord has failed it (attacked it, or fallen), and it raises no arms against the overlord it still pays.
 * - An overlord counts what its vassals send. A vassal that pays is a friend, worth more as a vassal than as a conquest;
 *   one in arrears hears a demand, and then becomes prey.
 * - A strong king offers a weak neighbour vassalage instead of war, and a weak power that a strong neighbour threatens
 *   offers itself, on the template's clauses; each side seals by the same sums.
 * - A third king weighs an overlord's troops before falling on its vassal.
 *
 * Tribute is wealth crossing a border, so the score needs no rule for it: what leaves the vassal joins the overlord.
 */
import { HSet, StartVassals, clause, cmpPower, sortBy, vassalTerms, type Clause, type Power, type TabletProposal, type VassalTerms } from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";

/** Script players play vassalage (`--no-vassal-play`), or half of them leave it alone (`--vassal-play-half`). */
export const VassalPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** First guesses of the bots (item 18 tunes nothing here: these are the bots' own judgements). */
const Year = 3;
/** Seasons past a year without tribute before an overlord counts a vassal in arrears: gold travels. */
const Grace = 2;
/** A neighbour this many times our strength can make us a vassal; we offer vassalage to one this many times weaker. */
const Overawes = 3;
/** The tribute a year a script overlord asks: this share of the vassal's land's worth a season (its yield), at least 5. */
const AskShare = 0.5;

/** Every vassal bond this court knows: the opening ones (public), and those on the tablets it holds, newest last. */
export function knownBonds(b: Board): VassalTerms[] {
  const out: VassalTerms[] = [];
  const seen = new HSet<string>();
  for (const t of b.v.tablets) {
    if (t.repudiatedTurn !== null) continue;
    const terms = vassalTerms({ id: t.tabletId, vassal: t.vassal, proposedBy: t.proposedBy, partner: t.partner, clauses: t.clauses, sealedTurn: t.sealedTurn });
    if (terms === null || seen.has(`${terms.vassal}>${terms.overlord}`)) continue;
    if (t.seals.length < 2) continue;
    seen.add(`${terms.vassal}>${terms.overlord}`);
    out.push(terms);
  }
  for (const s of StartVassals) {
    if (seen.has(`${s.vassal}>${s.overlord}`)) continue;
    seen.add(`${s.vassal}>${s.overlord}`);
    out.push({ tabletId: "", vassal: s.vassal, overlord: s.overlord, tribute: s.tribute, protects: true, serves: true, sealedTurn: 0 });
  }
  return out.filter((x) => b.alive.has(x.vassal) && b.alive.has(x.overlord));
}

/** Whether `p`'s troops or land are within reach of `target`'s land: next to it, or a move away. */
function nearLand(b: Board, p: Power, target: Power): boolean {
  const theirs: string[] = [];
  for (const [k, o] of b.v.owner.entries()) if (o === target) theirs.push(k);
  for (const k of theirs) {
    if (Board.Map.neighbors(k).some((n) => b.ownerOf(n) === p)) return true;
    if (b.muster(p, k) > 0) return true;
  }
  return false;
}

/** How much a king fears `over`, 0 to 1: its strength against ours, if it can reach us. */
function awe(b: Board, me: Power, over: Power): number {
  if (!b.alive.has(over)) return 0;
  const ratio = b.strength(over) / Math.max(1, b.strength(me));
  const near = nearLand(b, over, me) ? 1 : 0.35;
  return Math.max(0, Math.min(1, (ratio - 1) / (2 * Overawes))) * near;
}

/**
 * The season's reckoning, before strategy: the bonds this court knows, the overlord it still serves and the vassals it
 * counts as friends ({@link Brain.bondFriends}), and the tribute it owes this year.
 */
export function vassalSeason(b: Board, brain: Brain): void {
  brain.bonds = knownBonds(b);
  brain.bondFriends.clear();
  brain.tributeDue = null;
  if (!VassalPlay.on(b.me)) return;
  const me = b.me;
  const p = brain.p;
  for (const bond of brain.bonds) {
    if (bond.vassal === me) {
      const over = bond.overlord;
      const r = brain.rel.get(over);
      // Re-weighed once a year, so the choice does not turn with every season's news.
      const last = brain.weighed.getOrDefault(over, -99);
      if (b.v.turn - last >= Year) {
        brain.weighed.set(over, b.v.turn);
        // What the bond is worth to us: the overlord's power over us, and his protection against another who threatens us.
        const threat = Math.max(0, ...[...b.alive].filter((x) => x !== me && x !== over).map((x) => (brain.hostility(x, b) > 0.5 ? awe(b, me, x) : 0)));
        const keep = awe(b, me, over) + 0.5 * threat + 0.25 * p.honesty + 0.15 * p.caution - 0.2 * p.greed - (r.lastAttackedUs >= b.v.turn - Year ? 0.6 : 0);
        if (keep >= 0.3) brain.serving.add(over);
        else brain.serving.delete(over);
      }
      if (!brain.serving.has(over)) continue;
      brain.bondFriends.add(over);
      if (bond.tribute > 0 && b.v.turn - brain.tributePaid.getOrDefault(over, -Year) >= Year) brain.tributeDue = [over, bond.tribute];
    } else if (bond.overlord === me) {
      // A vassal that pays is a friend; one in arrears is not.
      if (!inArrears(b, brain, bond)) brain.bondFriends.add(bond.vassal);
    }
  }
}

/** Whether a vassal of ours has sent no tribute for a year and the grace of the road. */
export function inArrears(b: Board, brain: Brain, bond: VassalTerms): boolean {
  if (bond.tribute <= 0) return false;
  const last = brain.tributeIn.getOrDefault(bond.vassal, bond.sealedTurn);
  return b.v.turn - last > Year + Grace;
}

/** Gold an envoy brought from a vassal of ours: its tribute, for this year. */
export function noteGold(brain: Brain, sender: Power, turn: number): void {
  if (brain.bonds.some((x) => x.vassal === sender && x.overlord === brain.me)) brain.tributeIn.set(sender, turn);
}

/**
 * What a war on `x` is worth beside its prize, from the bonds (added to the war target's score): a vassal of ours that pays
 * is worth more paying than conquered, and one in arrears is fair game; the overlord we serve we do not attack; and another's
 * vassal brings its overlord's troops, if they are near, and his friendship lost.
 */
export function bondWar(b: Board, brain: Brain, x: Power): number {
  if (!VassalPlay.on(b.me)) return 0;
  const me = b.me;
  if (brain.serving.has(x)) return -Number.MAX_VALUE;
  let score = 0;
  for (const bond of brain.bonds) {
    if (bond.vassal !== x) continue;
    if (bond.overlord === me) score += inArrears(b, brain, bond) ? 60 + 100 * brain.p.vengeance : -600;
    else if (b.alive.has(bond.overlord)) {
      const o = bond.overlord;
      const near = b.muster(o, Board.Map.capital(x).id) + (nearLand(b, o, x) ? 1 : 0);
      score -= near * 60 * (0.5 + brain.p.caution) + (brain.isFriend(o) ? 250 : 0);
    }
  }
  return score;
}

/** A letter the bonds call for this season, as a mission: kind, recipient, its worth, and the tribute it names. */
export interface BondLetter {
  kind: "tribute" | "demand" | "offer" | "submit";
  to: Power;
  score: number;
  amount: number;
}

/** The letters of vassalage this season: the year's tribute, a demand of a vassal in arrears, and offers either way. */
export function bondLetters(b: Board, brain: Brain): BondLetter[] {
  if (!VassalPlay.on(b.me)) return [];
  const me = b.me;
  const p = brain.p;
  const out: BondLetter[] = [];
  if (brain.tributeDue !== null && b.v.gold >= brain.tributeDue[1] + 10) out.push({ kind: "tribute", to: brain.tributeDue[0], score: 0.95, amount: brain.tributeDue[1] });
  const fresh = (x: Power): boolean => b.v.turn - brain.bondAsked.getOrDefault(x, -99) >= 2 * Year;
  for (const bond of brain.bonds) {
    if (bond.overlord !== me || !inArrears(b, brain, bond) || !fresh(bond.vassal)) continue;
    out.push({ kind: "demand", to: bond.vassal, score: 0.5 + 0.3 * p.pride, amount: bond.tribute });
  }
  const mineServed = brain.bonds.some((x) => x.vassal === me && brain.serving.has(x.overlord));
  for (const x of sortBy(b.neighbours(), [(y: Power) => y, cmpPower])) {
    if (!fresh(x) || brain.bonds.some((y) => (y.vassal === x && y.overlord === me) || (y.vassal === me && y.overlord === x))) continue;
    const ratio = b.strength(x) / Math.max(1, b.strength(me));
    const theirs = brain.bonds.find((y) => y.vassal === x);
    // A weak neighbour we could take: offered vassalage first, unless it serves a king we would rather not cross.
    if (ratio * Overawes <= 1 && (theirs === undefined || !b.alive.has(theirs.overlord) || brain.rel.get(theirs.overlord).hostile))
      out.push({ kind: "offer", to: x, score: 0.35 + 0.35 * p.diplomacy + 0.2 * (1 - p.aggression), amount: askOf(b, x) });
    // A strong neighbour who threatens us, while no overlord stands over us: we offer ourselves.
    else if (ratio >= Overawes && !mineServed && brain.hostility(x, b) > 0.45)
      out.push({ kind: "submit", to: x, score: 0.4 + 0.4 * p.caution, amount: askOf(b, me) });
  }
  return out;
}

/** The tribute a year a script player names for `x`: half a season of its land's yield, at least 5 shekels. */
function askOf(b: Board, x: Power): number {
  let y = 0;
  for (const [k, o] of b.v.owner.entries()) if (o === x) y += Board.Map.get(k).yield;
  return Math.max(5, Math.round((y * AskShare) / 5) * 5);
}

/** The template clauses of a vassal tablet, from the writer's side: what it offers as overlord, or as vassal. */
export function bondClauses(asOverlord: boolean, amount: number): Clause[] {
  return asOverlord ? [clause("askTribute", { amount }), clause("protect"), clause("askServe")] : [clause("tribute", { amount }), clause("serve"), clause("askProtect")];
}

/**
 * Whether to seal a vassal tablet brought to us, or null when the tablet is not one. As overlord we take a vassal whose
 * tribute is real and who is no friend's prey; as vassal we accept an overlord we fear or need, at a price we can bear.
 */
export function sealBond(b: Board, brain: Brain, sender: Power, proposal: TabletProposal): boolean | null {
  if (proposal.vassal === null) return null;
  if (!VassalPlay.on(b.me)) return false;
  const me = b.me;
  const terms = vassalTerms({ id: "", vassal: proposal.vassal, proposedBy: sender, partner: me, clauses: proposal.clauses, sealedTurn: b.v.turn });
  if (terms === null) return false;
  if (terms.overlord === me) return terms.tribute > 0 && !brain.rel.get(sender).hostile;
  // As the vassal: the price against what the overlord's power over us is worth.
  const income = Math.max(1, b.v.income);
  const bearable = terms.tribute <= Year * income * (0.25 + 0.2 * brain.p.caution);
  const fear = awe(b, me, terms.overlord) + (brain.hostility(terms.overlord, b) > 0.5 ? 0.2 : 0);
  return bearable && fear >= 0.3 && !brain.bonds.some((x) => x.vassal === me && brain.serving.has(x.overlord) && x.overlord !== terms.overlord);
}

/** After sealing one: a vassal serves its new overlord from now, and its first tribute is due at once. */
export function sealedBond(brain: Brain, sender: Power, proposal: TabletProposal): void {
  if (proposal.vassal === brain.me) {
    brain.serving.add(sender);
    brain.weighed.set(sender, brain.turn);
  }
}
