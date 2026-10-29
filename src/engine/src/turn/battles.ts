/**
 * Battles: one season, losses, no dice (build order item 13, "Battles: one season, losses, no dice" under Territory and
 * military). The adjudicator decides who wins as before, the stronger side, each unit counting by its men; this part
 * decides what the battle costs. The loser loses men in proportion to the margin it lost by, and the winner fewer; a unit
 * beaten from where it stood falls back to a neighbouring province its side holds, or that no one holds, rather than being
 * destroyed, unless it has nowhere to go or was beaten by far. Until item 13 every unit dislodged was destroyed.
 */
import { Dict, HSet } from "../core/collections.ts";
import { idiv } from "../core/num.ts";
import { cmpStr, sortBy } from "../core/seq.ts";
import { BattleData, battleLosses } from "../model/command.ts";
import type { Power } from "../model/power.ts";
import { AllPowers } from "../model/power.ts";
import { logEvent, notify, unitLabel, type Unit } from "../model/state.ts";
import { remember } from "../model/people.ts";
import type { AdjudicationResult, Fight } from "../rules/adjudicator.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /**
     * What the season's battles cost (item 13): men lost on both sides, and where each unit beaten from its place falls
     * back, or whether it is destroyed. Moves the survivors' new places into `result.newPositions`, and returns the units
     * destroyed (removed from the state by the caller's rules for a destroyed unit).
     */
    battles(result: AdjudicationResult, sightBefore: Dict<Power, HSet<string>>): Unit[];
    /** Where a unit beaten from its province falls back, or null if it has nowhere to go. */
    fallBackTo(u: Unit, from: readonly string[], taken: HSet<string>, contested: HSet<string>): string | null;
  }
}

const P = TurnEngine.prototype;

P.battles = function (result, sightBefore) {
  const S = this.s;
  const unit = (id: string): Unit | undefined => S.units.find((u) => u.id === id);
  const seeing = (provinces: string[], ...sides: Power[]): Power[] => [...new HSet([...AllPowers.filter((p) => provinces.some((x) => sightBefore.get(p)?.has(x))), ...sides])];
  // The men each unit loses, and in which battle's province, in the order the battles were fought (the map's order of moves).
  const lost = new Dict<string, number>();
  const where = new Dict<string, string>();
  const margins = new Dict<string, number>();
  const lose = (u: Unit, men: number, at: string): void => {
    lost.set(u.id, Math.min(u.men, lost.getOrDefault(u.id, 0) + men));
    if (!where.has(u.id)) where.set(u.id, at);
  };
  for (const f of result.fights) {
    const a = unit(f.attacker);
    const d = unit(f.defender);
    if (a === undefined || d === undefined) continue;
    const [winner, loser, w, l] = f.won ? [a, d, f.attack, f.defence] : [d, a, f.defence, f.attack];
    const x = battleLosses(w, l);
    const loserLost = idiv(loser.men * x.loserPercent, 100);
    const winnerLost = Math.min(winner.men, idiv(loserLost * x.winnerShare, 100));
    lose(loser, loserLost, f.at);
    lose(winner, winnerLost, f.at);
    if (f.won) margins.set(d.id, Math.max(margins.getOrDefault(d.id, 0), x.margin));
    // Each commander's record (item 13): a good general should feel like his king's achievement, and his name grows with it.
    const wc = this.commanderOf(winner);
    const lc = this.commanderOf(loser);
    if (wc !== null) wc.won++;
    if (lc !== null) lc.lost++;
    battleNews(this, f, a, d, x.margin, loserLost, winnerLost, seeing([f.from, f.at], a.power, d.power));
  }
  // The men lost: some killed, the rest run and turn loose where the battle was fought (none at sea, where they drown).
  for (const [id, men] of lost) {
    const u = unit(id)!;
    if (men <= 0) continue;
    const share = u.men > 0 ? idiv(u.savings * men, u.men) : 0;
    u.savings -= share;
    u.men -= men;
    const at = this.map.get(where.get(id));
    if (!at.isSea) this.peopleOf(at.id).loose += men - idiv(men * BattleData.dead, 100);
  }

  // The units beaten from their places fall back, or are destroyed: those beaten by far, or with nowhere to go. The
  // provinces taken are those troops end the season in; a land two moves bounced over stays contested. Units falling back
  // choose in an order the seed draws, so the order of resolution never decides which of two gets a province.
  const taken = new HSet<string>();
  for (const u of S.units) if (!result.dislodgedUnitIds.includes(u.id)) taken.add(result.newPositions.tryGet(u.id) ?? u.province);
  const contested = new HSet<string>();
  for (const m of result.moves) if (!m.succeeded && !taken.has(m.to) && result.moves.filter((x) => x.to === m.to).length > 1) contested.add(m.to);
  const destroyed: Unit[] = [];
  const order = this.r("fall-back").shuffle(sortBy(result.dislodgedUnitIds, [(x: string) => x, cmpStr]));
  for (const id of order) {
    const u = unit(id);
    if (u === undefined) continue;
    const from = result.fights.filter((f) => f.defender === id && f.won).map((f) => f.from);
    const routed = margins.getOrDefault(id, 0) >= BattleData.rout || (u.men <= 0 && lost.getOrDefault(id, 0) > 0);
    const to = routed ? null : this.fallBackTo(u, from, taken, contested);
    if (to === null) {
      destroyed.push(u);
      continue;
    }
    taken.add(to);
    result.newPositions.set(u.id, to);
    this.tell(u.power, to, "Battle", "Fell back", `Your ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name} was beaten from it and fell back to ${this.map.get(to).name}, ${u.men} men strong.`);
    logEvent(S, "fallback", `${u.power}'s ${u.kind === "Army" ? "army" : "fleet"} was driven from ${this.map.get(u.province).name} and fell back to ${this.map.get(to).name}.`, seeing([u.province, to], u.power), "fallback");
  }
  // A unit a battle left with no men is gone too, though it won or held.
  for (const u of S.units) if (u.men <= 0 && !destroyed.includes(u) && lost.getOrDefault(u.id, 0) > 0) destroyed.push(u);
  // A commander whose army is destroyed may be taken by the side that beat it (first guess: half the time), else he escapes.
  const rng = this.r("commander-taken");
  for (const u of sortBy(destroyed, [(x: Unit) => x.id, cmpStr])) {
    const c = this.commanderOf(u);
    const by = result.fights.find((f) => (f.defender === u.id && f.won) || (f.attacker === u.id && !f.won));
    const taker = by === undefined ? undefined : unit(by.defender === u.id ? by.attacker : by.defender)?.power;
    if (c === null || taker === undefined || !rng.chance(0.5)) continue;
    u.commander = null;
    c.status = "Captured";
    c.heldBy = taker;
    c.at = taker;
    c.duty = "None";
    c.grantedBy = null;
    c.watchProvince = null;
    c.intercepted = true;
    this.meet(c, taker);
    remember(c, S.turn, `My army in ${this.map.get(u.province).name} was destroyed, and ${taker}'s men took me.`);
    notify(S, taker, "Battle", "A commander taken", `Your men took ${c.name}, who commanded ${u.power}'s ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name}: you may execute, question, ransom or release him.`, c.id);
  }
  return destroyed;
};

P.fallBackTo = function (u, from, taken, contested) {
  const S = this.s;
  const own = (x: string): number => {
    const holder = S.owner.getOrDefault(x, null);
    return holder === u.power ? 2 : this.guestAt(x, u.power) ? 1 : 0;
  };
  // Where its side's land or land nobody holds lies (or the sea, for a fleet), not where the attack came from, not where a
  // unit stands now, nor a land two moves bounced over. Its own land first, then a friend's, then the rest; then where
  // fewest foreign troops stand next to it; then the map's order.
  const foes = (x: string): number => this.map.neighbors(x).filter((n) => S.units.some((v) => v.province === n && v.power !== u.power)).length;
  const options = this.map
    .neighbors(u.province)
    .filter((x) => this.map.canMove(u.kind, u.province, x) && !from.includes(x) && !taken.has(x) && !contested.has(x))
    .filter((x) => this.map.get(x).isSea || own(x) > 0 || S.owner.getOrDefault(x, null) === null);
  if (options.length === 0) return null;
  const order = new Dict(this.map.provinces.map((p, i) => [p.id, i] as const));
  options.sort((a, b) => own(b) - own(a) || foes(a) - foes(b) || order.get(a) - order.get(b));
  return options[0];
};

/** What the sides, and those who saw it, are told of a battle: its place and outcome, and each side's own losses. */
function battleNews(engine: TurnEngine, f: Fight, a: Unit, d: Unit, margin: number, loserLost: number, winnerLost: number, seeing: Power[]): void {
  const S = engine.s;
  const at = engine.map.get(f.at).name;
  const kind = (u: Unit): string => (u.kind === "Army" ? "army" : "fleet");
  const [aLost, dLost] = f.won ? [winnerLost, loserLost] : [loserLost, winnerLost];
  const by = margin >= BattleData.rout ? "far" : margin >= 33 ? "clearly" : "narrowly";
  logEvent(
    S,
    "battle",
    `${a.power}'s ${kind(a)} from ${engine.map.get(f.from).name} fought ${d.power}'s ${kind(d)} at ${at}: ${f.won ? a.power : d.power} won, ${by}.`,
    seeing,
    "battle",
  );
  engine.tell(a.power, f.at, "Battle", "Battle", `Your ${kind(a)} (${unitLabel(a)}) attacked ${d.power}'s ${kind(d)} at ${at} and ${f.won ? "won" : "was beaten"}, ${by}: it lost ${aLost} men.`);
  engine.tell(d.power, f.at, "Battle", "Battle", `${a.power}'s ${kind(a)} from ${engine.map.get(f.from).name} attacked your ${kind(d)} at ${at} and ${f.won ? "won" : "was beaten back"}, ${by}: your ${kind(d)} lost ${dLost} men.`);
}
