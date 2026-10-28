/**
 * The first script leader, frozen as it was, kept as a benchmark opponent for the current bots (`--versus baseline` in the
 * batch runner). Do not improve it; improve ScriptLeader. Adapted only as far as the siege package made its rules wrong.
 */
import {
  AllPowers,
  Dict,
  HSet,
  Rng,
  WorldMap,
  assay,
  authenticate,
  besiege,
  buy,
  captive,
  check,
  cmpBool,
  cmpNum,
  cmpPower,
  cmpStr,
  count,
  counterIntel,
  desc,
  dispatch,
  distinct,
  firstBy,
  forge,
  formatMoney,
  hire,
  hold,
  move,
  newGreetingOptions,
  newHostReply,
  newTabletProposal,
  clause,
  newTurnSubmission,
  payRansom,
  placeSpy,
  raise,
  release,
  seekCandidates,
  sortBy,
  sum,
  economyOf,
  support,
  tier,
  trimEnd,
  type AudienceView,
  type DispatchOrder,
  type HostReply,
  type Order,
  type Power,
  type SeatView,
  type TurnSubmission,
  type UnitView,
} from "@amarna/engine";
import { plainGrainOrders } from "./grain.ts";
import { canLevy } from "./land.ts";
import type { ISeat } from "../contracts.ts";

class Memory {
  aggression = 0;
  honesty = 0;
  greed = 0;
  lastOwner = new Dict<string, Power | null>();
  readonly grudge = new Dict<Power, number>();
  readonly checked = new HSet<string>();
  readonly heldSince = new Dict<string, number>();
  readonly sentCopies = new HSet<string>();
  lastSeek = -10;
  lastTurnSeen = 0;
}

const Map_ = WorldMap.default;
const Oath = "By Shamash, Amun, Marduk and Teshub";

const G = (m: Memory, p: Power): number => m.grudge.getOrDefault(p, 0);

/** Whoever holds far more land than anyone else, as the public map shows it. */
function leaderOf(v: SeatView): Power | null {
  const counts = new Dict<Power, number>(
    AllPowers.filter((p) => !v.fallen.includes(p)).map((p) => {
      let n = 0;
      for (const [, o] of v.owner) if (o === p) n++;
      return [p, n] as const;
    }),
  );
  if (counts.size < 2) return null;
  const top = sortBy([...counts], [(x: [Power, number]) => x[1], desc(cmpNum)], [(x: [Power, number]) => x[0], cmpPower])[0];
  const others = [...counts].filter(([k]) => k !== top[0]).map(([, n]) => n);
  const rest = sum(others, (x) => x) / others.length;
  return top[1] >= 8 && top[1] >= rest * 1.6 && top[0] !== v.power ? top[0] : null;
}

function peaceOf(v: SeatView): HSet<Power> {
  return new HSet(
    v.tablets
      .filter((t) => t.sealedTurn !== null && t.seals.includes(v.power) && t.seals.length >= 2)
      .flatMap((t) => t.seals)
      .filter((p) => p !== v.power),
  );
}

export class BaselineLeader implements ISeat {
  readonly label: string = "Baseline bot (v1)";
  private readonly seed: number;
  private readonly mem = new Dict<Power, Memory>();

  constructor(seed: number) {
    this.seed = seed;
  }

  private memory(p: Power): Memory {
    const known = this.mem.tryGet(p);
    if (known !== undefined) return known;
    const r = Rng.for(this.seed, 0, "bot-temperament", p);
    const m = new Memory();
    m.aggression = 0.3 + r.nextDouble() * 0.6;
    m.honesty = r.nextDouble();
    m.greed = r.nextDouble();
    this.mem.set(p, m);
    return m;
  }

  // ================================================================= orders

  decide(view: SeatView, _signal?: AbortSignal): Promise<TurnSubmission> {
    const m = this.memory(view.power);
    learn(view, m);
    const rng = Rng.for(this.seed, view.turn, "bot-decide", view.power);
    const orders: Order[] = [];
    const destinations = military(view, m, rng, orders);
    economy(view, m, rng, orders, destinations);
    diplomacy(view, m, rng, orders);
    court(view, m, rng, orders);
    m.lastOwner = view.owner.clone();
    m.lastTurnSeen = view.turn;
    const notes = `Grudges: ${[...m.grudge]
      .filter(([, g]) => g > 0)
      .map(([k, g]) => `${k} ${g}`)
      .join(", ")}`;
    return Promise.resolve(newTurnSubmission({ orders, notes }));
  }

  hostAudience(view: AudienceView, court: SeatView, _signal?: AbortSignal): Promise<HostReply> {
    const me = view.host;
    const sender = view.from;
    const m = this.memory(me);
    const rng = Rng.for(this.seed, view.turn, "bot-host", `${view.audienceId}:${view.round}`);
    const peace = peaceOf(court);
    const hostile = G(m, sender) >= 3 || (leaderOf(court) === sender && m.aggression > 0.6);
    const friend = peace.has(sender) && !hostile;
    const reply = newHostReply({ end: true });
    const speech: string[] = [];

    if (view.greetingDeviations.includes("no greeting at all")) speech.push("Your tablet does not even greet me. Is this how one writes to a Great King?");
    else if (view.greetingDeviations.includes('no "brother"')) speech.push("You do not call me brother. Have I not been a brother to you?");
    if (view.greetingDeviations.includes("the sender's name first")) speech.push("And you put your own name before mine.");

    if (view.goldStated > 0 && view.goldWeighed < view.goldStated) {
      speech.push(
        `The inventory lists ${formatMoney(view.goldStated)}, but my weighers found only ${formatMoney(view.goldWeighed)}. Either your lord is mean or your messenger's hands are heavy with my gold.`,
      );
      m.grudge.set(sender, G(m, sender) + 1);
    } else if (view.goldWeighed > 0) speech.push("I have received your gift.");

    for (const copy of view.copiesShown) {
      for (const accused of copy.seals.filter((p) => p !== sender && p !== me)) m.grudge.set(accused, G(m, accused) + 1);
      speech.push("I have seen the tablet you show me. I will remember who breaks oaths.");
    }

    if (view.proposal !== null) {
      let aggressiveTowardSender = false;
      if (m.aggression > 0.75)
        for (const [k, o] of court.owner)
          if (o === sender && court.units.some((u) => u.power === me && Map_.areAdjacent(u.province, k))) {
            aggressiveTowardSender = true;
            break;
          }
      reply.sealProposal = !hostile && (!aggressiveTowardSender || m.honesty < 0.4);
      speech.push(reply.sealProposal ? "I have sealed the tablet before the gods." : "I will not seal this tablet now.");
    }

    speech.push(friend ? "Tell my brother that my love for him is great." : hostile ? "Tell your lord that I have not forgotten what he did." : "Tell your lord that I have heard his words.");

    if ((m.greed > 0.6 || hostile) && court.gold > 400 && rng.chance(0.35)) {
      reply.bribe = 40 + rng.range(0, 3) * 10;
      reply.bribeAsk = "Tell your lord that my armies are many and my friendship is worth keeping.";
    }
    if (hostile && rng.chance(0.4)) reply.detain = true;
    if (court.gold > 500 && rng.chance(0.06)) reply.jobOffer = 45;
    if (friend && view.goldWeighed >= 50 && court.gold > 300) reply.goldBack = 30;

    reply.speech = speech.join(" ");
    return Promise.resolve(reply);
  }
}

function learn(v: SeatView, m: Memory): void {
  const me = v.power;
  for (const [prov, before] of m.lastOwner) {
    const taker = v.owner.getOrDefault(prov, null);
    if (before === me && taker !== null && taker !== me) m.grudge.set(taker, G(m, taker) + 3);
  }

  for (const item of v.inbox) {
    for (const p of AllPowers.filter((p) => p !== me)) {
      const name: string = p;
      if (item.kind === "Rumor" && item.body.includes("has not returned from the court of " + name)) m.grudge.set(p, G(m, p) + 2);
      if (item.kind === "Assay" && item.body.includes("from " + name) && !item.body.includes("(100%)")) m.grudge.set(p, G(m, p) + 2);
      if (item.kind === "Rumor" && item.body.includes("was forged by") && item.body.includes("of " + name)) m.grudge.set(p, G(m, p) + 1);
      if (item.kind === "Notice" && item.body.includes("confesses to serving " + name)) m.grudge.set(p, G(m, p) + 2);
    }
  }
  if (v.turn % 4 === 0) for (const p of [...m.grudge.keys()]) m.grudge.set(p, Math.max(0, m.grudge.get(p) - 1));
}

function military(v: SeatView, m: Memory, rng: Rng, orders: Order[]): HSet<string> {
  const me = v.power;
  const peace = peaceOf(v);
  const unitAt = new Dict<string, UnitView>(v.units.map((u) => [u.province, u] as const));
  const mine = sortBy(
    v.units.filter((u) => u.power === me),
    [(u: UnitView) => u.province, cmpStr],
  );
  const others = v.units.filter((u) => u.power !== me);
  const free = new Dict<string, UnitView>(mine.map((u) => [u.province, u] as const));
  const destinations = new HSet<string>();
  const treacherous = m.honesty < 0.3 && rng.chance(0.35);

  const leader = leaderOf(v);
  const friendly = (p: Power): boolean => peace.has(p) && G(m, p) < 3 && p !== leader;
  const willing = (owner: Power): boolean => (friendly(owner) ? treacherous : G(m, owner) >= 3 || m.aggression + 0.1 * G(m, owner) + (owner === leader ? 0.3 : 0) > 0.55);

  // Hold valuable land that is threatened.
  for (const u of mine) {
    if (v.owner.getOrDefault(u.province, null) !== me) continue;
    const threats = count(others, (o) => !friendly(o.power) && Map_.canMove(o.kind, o.province, u.province));
    const p = Map_.get(u.province);
    if (threats > 0 && (p.capital || p.yield >= 35 || threats >= 2)) {
      orders.push(hold(u.province));
      free.delete(u.province);
    }
  }

  // An army within foreign walls it means to take besieges them.
  for (const u of [...free.values()].filter((u) => u.kind === "Army" && v.walls.getOrDefault(u.province, 0) > 0 && v.owner.getOrDefault(u.province, null) !== me)) {
    const holder = v.owner.getOrDefault(u.province, null);
    if (holder !== null && !willing(holder)) continue;
    orders.push(besiege(u.province));
    free.delete(u.province);
  }

  // Pick targets and gather enough strength for each.
  const targets: [string, number, number][] = [];
  for (const t of distinct([...free.values()].flatMap((u) => Map_.movesFrom(u.kind, u.province))).filter((id) => !Map_.get(id).isSea)) {
    const owner = v.owner.getOrDefault(t, null);
    const occ = unitAt.tryGet(t) ?? null;
    if (occ?.power === me) continue;
    let need: number;
    // Empty land not ours: its people resist (item 10+a, adapted as the rule requires).
    const people = v.resistance.tryGet(t) ?? 0;
    if (owner === null) need = occ === null ? Math.max(v.walls.getOrDefault(t, 0) > 0 ? 2 : 1, people + 1) : willing(occ.power) ? 2 : 0;
    else if (owner === me) need = occ === null ? 0 : 2;
    else if (!willing(owner)) need = 0;
    else need = occ === null ? Math.max(v.walls.getOrDefault(t, 0) > 0 ? 2 : 1, people + 1) : 2 + (m.aggression < 0.5 ? 1 : 0);
    if (need === 0) continue;
    const prov = Map_.get(t);
    const value = prov.yield + (prov.capital ? 25 : 0) + (owner === null ? 5 : 0) + (prov.home === me ? 30 : 0) + (owner !== null ? G(m, owner) * 3 + (owner === leader ? 15 : 0) : 0);
    targets.push([t, need, value]);
  }
  for (const [target, need] of sortBy(targets, [(x: [string, number, number]) => x[2], desc(cmpNum)], [(x: [string, number, number]) => x[0], cmpStr])) {
    const able = sortBy(
      [...free.values()].filter((u) => Map_.canMove(u.kind, u.province, target)),
      [(u: UnitView) => (u.kind === "Army" ? 0 : 1), cmpNum],
      [(u: UnitView) => u.province, cmpStr],
    );
    if (able.length < need) continue;
    const attacker = able[0];
    orders.push(move(attacker.province, target));
    free.delete(attacker.province);
    for (const s of able.slice(1, need)) {
      orders.push(support(s.province, attacker.province, target));
      free.delete(s.province);
    }
    destinations.add(target);
  }

  // Everyone else walks toward the nearest land worth having, or supports a neighbour.
  for (const u of [...free.values()]) {
    const step = stepToward(u, v, me, peace, m, destinations, unitAt);
    if (step !== null) {
      orders.push(move(u.province, step));
      destinations.add(step);
      continue;
    }
    const assist = orders.find((o): o is Extract<Order, { type: "move" }> => o.type === "move" && Map_.canMove(u.kind, u.province, o.to) && o.unit !== u.province) ?? null;
    orders.push(assist !== null ? support(u.province, assist.unit, assist.to) : hold(u.province));
  }
  return destinations;
}

function stepToward(u: UnitView, v: SeatView, me: Power, peace: HSet<Power>, m: Memory, taken: HSet<string>, unitAt: Dict<string, UnitView>): string | null {
  const leader = leaderOf(v);
  const goal = (id: string): boolean => {
    const p = Map_.get(id);
    if (p.isSea) return false;
    const owner = v.owner.getOrDefault(id, null);
    if (owner === me) return false;
    if (owner !== null && peace.has(owner) && G(m, owner) < 3 && owner !== leader) return false;
    return owner === null || m.aggression > 0.5 || G(m, owner) >= 3 || owner === leader;
  };

  const prev = new Map<string, string>([[u.province, ""]]);
  const queue = [u.province];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur !== u.province && goal(cur)) {
      let step = cur;
      while (prev.get(step) !== u.province) step = prev.get(step)!;
      if (taken.has(step) || unitAt.has(step)) return null;
      if (v.walls.getOrDefault(step, 0) > 0) return null; // walls: wait for help rather than bounce
      if ((v.resistance.tryGet(step) ?? 0) > 0) return null; // its people would hold off a lone army (item 10+a)
      return step;
    }
    for (const n of sortBy(Map_.movesFrom(u.kind, cur), [(x: string) => x, cmpStr]))
      if (!prev.has(n)) {
        prev.set(n, cur);
        queue.push(n);
      }
  }
  return null;
}

function economy(v: SeatView, m: Memory, rng: Rng, orders: Order[], destinations: HSet<string>): void {
  const me = v.power;
  let gold = v.gold;
  const reserve = v.upkeep + v.wages + 80;
  let provinces = 0;
  for (const [, o] of v.owner) if (o === me) provinces++;
  const units = count(v.units, (u) => u.power === me);
  const maritime = me === "Alashiya" || me === "Arzawa";
  const weak = tier(me) === "Weak";
  let fleets = count(v.units, (u) => u.power === me && u.kind === "Fleet");

  const spots = sortBy(
    Map_.homeOf(me).filter((p) => v.owner.getOrDefault(p.id, null) === me && v.units.every((u) => u.province !== p.id) && !destinations.has(p.id)),
    [(p) => p.capital, desc(cmpBool)],
    [(p) => p.yield, desc(cmpNum)],
  );
  let raised = 0;
  // Grain, the plain way (item 9+a): sell it all each season; its sales and the mines are the season's income.
  let surplus = plainGrainOrders(v, orders) + sum(v.provinces, (x) => economyOf(Map_.get(x.province)).mine) - v.upkeep - v.wages;
  for (const spot of spots) {
    // Small kingdoms keep their gold for buying cities rather than for troops they cannot feed.
    if (units + raised >= provinces + (weak ? 0 : 1)) break;
    const fleet = spot.isCoastal && (maritime ? fleets < 2 : fleets === 0 && rng.chance(0.3));
    const cost = fleet ? v.prices.get("fleet") : v.prices.get("army");
    const upkeep = fleet ? v.prices.get("fleetUpkeep") : v.prices.get("armyUpkeep");
    if (gold - cost < reserve || surplus - upkeep < (weak ? 15 : -5)) break;
    // Only where the men of fighting age are (item 10+a, as the rule requires).
    if (!canLevy(v, spot.id, fleet ? "Fleet" : "Army")) continue;
    surplus -= upkeep;
    orders.push(raise(spot.id, fleet ? "Fleet" : "Army"));
    gold -= cost;
    raised++;
    if (fleet) fleets++;
    if (gold < reserve * 2) break;
  }

  const myUnits = v.units.filter((u) => u.power === me).map((u) => u.province);
  const neutral: string[] = [];
  for (const [k, o] of v.owner) if (o === null) neutral.push(k);
  const toBuy =
    sortBy(
      neutral.filter((g) => v.owner.getOrDefault(g, null) === null && !destinations.has(g) && Map_.withinReach(g, me, v.owner, myUnits)),
      [(g: string) => Map_.get(g).yield, desc(cmpNum)],
      [(g: string) => g, cmpStr],
    ).find((g) => gold - v.cityPrices.getOrDefault(g, 0) >= reserve + (weak ? 20 : 50)) ?? null;
  // Small kingdoms grow by gold rather than by conquest.
  if (toBuy !== null && rng.chance(weak ? 0.8 : 0.35 + m.greed * 0.25)) orders.push(buy(toBuy));
}

// ================================================================= letters

function diplomacy(v: SeatView, m: Memory, rng: Rng, orders: Order[]): void {
  const me = v.power;
  const ready = sortBy(
    v.court.filter((c) => c.ready),
    [(c) => c.id, cmpStr],
  );
  if (ready.length === 0) return;
  const peace = peaceOf(v);
  const alive = AllPowers.filter((p) => p !== me && !v.fallen.includes(p));
  const mineProv = new HSet<string>();
  for (const [k, o] of v.owner) if (o === me) mineProv.add(k);
  const borders = (p: Power, near: (n: string) => boolean): boolean => {
    for (const [k, o] of v.owner) if (o === p && Map_.neighbors(k).some(near)) return true;
    return false;
  };
  const neighbors = alive.filter((p) => borders(p, (n) => mineProv.has(n)));
  const reserve = v.upkeep + v.wages + 120;
  let sent = 0;
  let spent = 0;

  for (const envoy of ready) {
    if (sent >= 2 || !rng.chance(0.55)) continue;
    // Keep one envoy home for spying or later missions now and then.
    if (ready.length > 1 && sent === 0 && rng.chance(0.15)) continue;

    const enemy =
      sortBy(
        [...m.grudge].filter(([k, g]) => g >= 3 && alive.includes(k)),
        [(g: [Power, number]) => g[1], desc(cmpNum)],
        [(g: [Power, number]) => g[0], cmpPower],
      ).map(([k]) => k)[0] ?? null;
    const broken = enemy !== null ? (v.tablets.find((t) => t.sealedTurn !== null && t.seals.includes(enemy) && t.seals.includes(me) && !m.sentCopies.has(t.copyId)) ?? null) : null;
    const forged = v.tablets.find((t) => t.source.startsWith("made by") && !m.sentCopies.has(t.copyId)) ?? null;
    let order: DispatchOrder | null = null;

    if (forged !== null) {
      const audience = alive.filter((p) => !forged.seals.includes(p));
      if (audience.length > 0) {
        const to = audience[rng.next(audience.length)];
        order = dispatch(
          envoy.id,
          to,
          `My brother, see what ${forged.seals.join(" and ")} have sealed in secret. I send you the tablet itself. Judge for yourself who are your friends.`,
          { mandate: "Show the tablet. Promise nothing.", copies: [forged.copyId], clauses: [clause("wellWishes")] },
        );
        m.sentCopies.add(forged.copyId);
      }
    } else if (enemy !== null && broken !== null && alive.length > 2) {
      const foe = enemy;
      const third = firstBy(
        alive.filter((p) => p !== foe),
        (p) => neighbors.includes(p),
        desc(cmpBool),
        () => rng.next(100),
        cmpNum,
      );
      order = dispatch(
        envoy.id,
        third,
        `${foe} sealed this tablet with me before the gods, and then broke it. See for yourself what an oath of ${foe} is worth. Stand with me, and we will teach ${foe} the price of a broken oath.`,
        { mandate: "You may agree to act together against " + foe + ". Promise no land.", copies: [broken.copyId], clauses: [clause("against", { power: foe })] },
      );
      m.sentCopies.add(broken.copyId);
    } else if (enemy !== null) {
      const foe2 = enemy;
      const gold = v.unassayedGold.length === 0 && v.inbox.some((i) => i.kind === "Assay" && i.body.includes(foe2) && !i.body.includes("(100%)"));
      const letter = gold
        ? "The gold you sent me was not good. When it was put into the furnace it did not come out whole. Is this how a brother treats a brother?"
        : `Your troops have entered my land. Is this brotherhood? Withdraw them, and send me a fitting gift, or I will not forget it.`;
      order = dispatch(envoy.id, foe2, letter, {
        mandate: "Demand withdrawal and gifts. Agree to nothing less.",
        greeting: newGreetingOptions({ callBrother: false }),
        clauses: [clause("grievance"), clause("askGold", { amount: 50 })],
      });
    } else {
      const top = leaderOf(v);
      if (top !== null && alive.length > 2 && rng.chance(0.5)) {
        const partner = firstBy(
          alive.filter((p) => p !== top),
          (p) => borders(p, (n) => v.owner.getOrDefault(n, null) === top),
          desc(cmpBool),
          () => rng.next(100),
          cmpNum,
        );
        order = dispatch(
          envoy.id,
          partner,
          `${top} grows like the flood of the river and swallows the cities one by one. If we stand apart, it will swallow us too. Let us stand together and hold it back.`,
          {
            mandate: `You may agree to act together against ${top} and to seal an oath of alliance. Promise no land.`,
            proposal: newTabletProposal({
              text: `${Oath}: ${me} and ${partner} swear to stand together against ${top}. Neither shall make peace with ${top} alone. If one breaks this oath, may the gods destroy his name and his seed.`,
              allianceOath: true,
              clauses: [clause("against", { power: top })],
            }),
            clauses: [clause("against", { power: top })],
          },
        );
      } else {
        const strangers = sortBy(
          neighbors.filter((p) => !peace.has(p)),
          [() => rng.next(100), cmpNum],
        );
        const stranger = strangers[0] ?? null;
        const to = stranger ?? alive[rng.next(alive.length)];
        const gift = v.gold - spent > reserve + 150 ? rng.range(3, 8) * 10 : 0;
        const purity = gift > 0 && m.honesty < 0.35 ? rng.range(55, 80) : 100;
        spent += Math.trunc((gift * purity) / 100.0);
        if (stranger !== null) {
          const alliance = rng.chance(0.25);
          const text =
            `${Oath}: ${me} and ${to} are brothers. Neither king shall send troops into the lands of the other.` +
            (alliance ? " They shall stand together against any enemy, and share in the victory." : "") +
            " If one breaks this oath, may the gods destroy his name and his seed.";
          order = dispatch(
            envoy.id,
            to,
            "I wish to live in brotherhood with you, as our fathers did. Let neither of us send troops into the lands of the other." +
              (gift > 0 ? " I send you gold as a sign of my love." : "") +
              " Seal the tablet I send, before Shamash and the gods of your land.",
            {
              mandate: "You may agree to peace and an exchange of gifts. Promise no land.",
              gold: gift,
              purityPercent: purity,
              proposal: newTabletProposal({ text, allianceOath: alliance, clauses: alliance ? [clause("peace"), clause("alliance")] : [clause("peace")] }),
              clauses: [clause("peace"), ...(gift > 0 ? [clause("gift", { amount: gift })] : [])],
            },
          );
        } else {
          order = dispatch(
            envoy.id,
            to,
            "I have heard that all is well with you, and I rejoice. Send me your messenger quickly, and let gifts pass between us as is fitting between brothers." +
              (gift > 0 ? " Here is a gift for you." : ""),
            { mandate: "Speak of friendship. Promise nothing.", gold: gift, purityPercent: purity, clauses: [clause("wellWishes"), ...(gift > 0 ? [clause("gift", { amount: gift })] : [])] },
          );
        }
      }
    }
    if (order === null) continue;
    orders.push(order);
    sent++;
  }
}

// ================================================================= court

function court(v: SeatView, m: Memory, rng: Rng, orders: Order[]): void {
  const me = v.power;
  let gold = v.gold - sum(
    orders.filter((o) => o.type === "raise"),
    (r) => (r.type === "raise" && r.kind === "Army" ? v.prices.get("army") : v.prices.get("fleet")),
  );
  const staff = v.court.filter((c) => c.status === "employed");
  const busy = new HSet(orders.flatMap((o) => (o.type === "dispatch" ? [o.envoy] : [])));

  if (staff.length < 2 && v.turn - m.lastSeek >= 3 && gold > 150) {
    orders.push(seekCandidates());
    m.lastSeek = v.turn;
  }

  const candidates = sortBy(
    v.known
      .filter((c) => c.pitch !== null && c.askingPrice !== null && c.status === "free")
      .filter((c) => !c.knownFacts.some((f) => f.startsWith("Abandoned the service") || f.startsWith("Exposed as a forger"))),
    [(c) => c.askingPrice!, cmpNum],
    [(c) => c.id, cmpStr],
  );
  if (staff.length < 2 && candidates.length > 0) {
    const best = candidates[0];
    if (!m.checked.has(best.id) && gold > 250 && rng.chance(0.5)) {
      orders.push(check(best.id, 20));
      m.checked.add(best.id);
      gold -= 20;
    } else if (best.askingPrice! <= 40 && gold > best.askingPrice! * 4) orders.push(hire(best.id, best.askingPrice!, 6));
  }

  for (const lot of v.unassayedGold)
    if ((G(m, lot.from) > 0 || lot.weighed < lot.stated || rng.chance(0.35)) && gold > 30) {
      orders.push(assay(lot.id));
      gold -= v.prices.get("assay");
    }

  if (gold > 450 && rng.chance(0.5)) {
    orders.push(counterIntel(20));
    gold -= 20;
  }

  // Evidence shown by another court is worth checking before believing it.
  for (const t of v.tablets.filter((t) => t.source.startsWith("shown by") && t.authResult === null && !m.checked.has(t.copyId)).slice(0, 1))
    if (gold > 250 && rng.chance(0.5)) {
      orders.push(authenticate(t.copyId, 40));
      m.checked.add(t.copyId);
      gold -= 40;
    }

  const idle = staff.filter((c) => c.ready && !busy.has(c.id));
  if (gold > 450 && idle.length >= 2 && rng.chance(0.12)) {
    const mineProv = new HSet<string>();
    for (const [k, o] of v.owner) if (o === me) mineProv.add(k);
    const bordering = (p: Power): number => {
      let n = 0;
      for (const [k, o] of v.owner) if (o === p && Map_.neighbors(k).some((x) => mineProv.has(x))) n++;
      return n;
    };
    const target = sortBy(
      AllPowers.filter((p) => p !== me && !v.fallen.includes(p)),
      [(p: Power) => bordering(p), desc(cmpNum)],
      [(p: Power) => G(m, p), desc(cmpNum)],
    )[0];
    orders.push(placeSpy(idle[0].id, target));
    busy.add(idle[0].id);
    idle.shift();
  }

  if (m.honesty < 0.25 && gold > 300 && idle.length > 0 && rng.chance(0.04)) {
    const rivals = sortBy(
      AllPowers.filter((p) => p !== me && !v.fallen.includes(p)),
      [(p: Power) => G(m, p), desc(cmpNum)],
      [() => rng.next(100), cmpNum],
    ).slice(0, 2);
    if (rivals.length === 2) {
      const victim =
        sortBy(
          AllPowers.filter((p) => p !== me && !rivals.includes(p) && !v.fallen.includes(p)),
          [() => rng.next(100), cmpNum],
        )[0] ?? "Egypt"; // FirstOrDefault on a Power: Egypt when none is left
      orders.push({ ...forge(idle[0].id, `${rivals[0]} swears to ${rivals[1]}: when the harvest is in, we shall march together against ${victim} and divide its land.`, rivals), clauses: [clause("against", { power: victim })] });
    }
  }

  for (const c of v.known.filter((c) => c.status === "your captive")) {
    const roll = rng.nextDouble();
    orders.push(
      roll < 0.55
        ? captive(c.id, "Ransom", 80)
        : roll < 0.75
          ? captive(c.id, "Turn", 0, `The armies of ${me} are few and tired; they will not march this year.`)
          : roll < 0.9
            ? captive(c.id, "Release")
            : captive(c.id, "Execute"),
    );
  }

  for (const c of v.known.filter((c) => c.heldByYou && c.status === "employed")) {
    let since = m.heldSince.tryGet(c.id);
    if (since === undefined) m.heldSince.set(c.id, (since = v.turn));
    if (v.turn - since >= 2) {
      orders.push(release(c.id, "Go, and tell your lord to mind his manners with a Great King."));
      m.heldSince.delete(c.id);
    }
  }

  // The rumour's wording changed with the simulation-fixes round ("pay_ransom", the order's name in the schema); the rule did not.
  const pay = "order pay_ransom for ";
  for (const item of v.inbox.filter((i) => i.kind === "Rumor" && i.body.includes(pay))) {
    const id = trimEnd(item.body.slice(item.body.indexOf(pay) + pay.length), "). ");
    if (gold > 200) orders.push(payRansom(id));
  }
}
