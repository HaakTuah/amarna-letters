/** The non-military half of a script king, third part: letters, the tablets it proposes and greetings (its audiences: statecraft-audiences.ts). */
import { envoyFor } from "./tongues.ts";
import { AuditPlay, canMarchOn } from "./audit-play.ts";
import { bondClauses, bondLetters } from "./vassals.ts";
import { fugitiveRights } from "./borders.ts";
import {
  HSet,
  cmpBool,
  cmpNum,
  cmpPower,
  cmpStr,
  desc,
  dispatch,
  newGreetingOptions,
  newTabletProposal,
  clause,
  type Clause,
  roundEven,
  sortBy,
  sum,
  tier,
  toInt,
  trim,
  type CharacterView,
  type DispatchOrder,
  type GreetingOptions,
  type Order,
  type Power,
  type SeatView,
  type Rng,
} from "@amarna/engine";
import { byHouse } from "./claims.ts";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import { Names } from "./names.ts";
import { PeoplePlay, reliability } from "./statecraft-court.ts";
import { atHand, oursFirst } from "./errands.ts";
import { outweighs, rivals, touches } from "./statecraft-strategy.ts";
import { joints } from "./tactics.ts";
import { TextKit } from "./textkit.ts";
import { clausePlays } from "./statecraft-clauses.ts";
import { authorityFor, authorityOn, basingTablet, passageClause, stagingFor } from "./authority.ts";
import { wantsTradeRights } from "./trade.ts";
import { Letter, closing } from "./voices.ts";
import { bestGift } from "./investment.ts";

export const Oath = "By Shamash, Amun, Marduk and Teshub";

/** `against`: the king a coalition is sworn against, or who besieges the city a plea is for. `city`: the besieged city a plea is for. */
interface Mission {
  to: Power;
  kind: string;
  score: number;
  against: Power | null;
  city: string | null;
  /** The tribute a bond letter names (item 11+); 0 for every other. */
  amount: number;
}

const mission = (to: Power, kind: string, score: number, against: Power | null = null, city: string | null = null, amount = 0): Mission => ({ to, kind, score, against, city, amount });

const byReliability = (brain: Brain): [(c: CharacterView) => unknown, (a: never, b: never) => number][] => [
  [(c: CharacterView) => reliability(c), desc(cmpNum)],
  [(c: CharacterView) => brain.provenLoyal.has(c.id), desc(cmpBool)],
  [(c: CharacterView) => c.id, cmpStr],
];

/** A small power's position, by its starting tier: a weak Great King or a city-state (data, item 11+). */
const isSmall = (p: Power): boolean => tier(p) === "Weak" || tier(p) === "City";

export function letters(b: Board, brain: Brain, orders: Order[], busy: HSet<string>, rng: Rng): void {
  const p = brain.p;
  const v = b.v;
  const me = b.me;
  // From a besieged capital an envoy may be caught slipping out, and one whose courage failed him will fail again while the
  // siege is as tight: he is not asked for two seasons, and no gold goes out to be taken.
  const besieged = v.sieges.some((x) => x.holder === me && x.province === Board.Map.capital(me).id);
  // People at hand: servants at court and the free people there, each sent offered the errand's job (errands.ts).
  const ready = sortBy(
    atHand(b, brain).filter((c) => {
      if (busy.has(c.id)) return false;
      const t = brain.wouldNotLeave.tryGet(c.id);
      return !(besieged && t !== undefined && v.turn - t <= 2);
    }),
    [oursFirst, desc(cmpBool)],
    ...byReliability(brain),
  );
  if (ready.length === 0) return;

  const leader = b.leader();
  const neighbours = new HSet(b.neighbours());
  const missions: Mission[] = [];
  // A neighbour taking our land who is too strong for us alone: we ask the other kings on his borders to stand with us.
  const aggressor =
    sortBy(
      [...brain.rel].filter(([k, r]) => b.alive.has(k) && r.hostile && r.lastAttackedUs >= v.turn - 2 && !r.allied && b.strength(k) >= 0.8 * b.strength(me)),
      [([, r]) => r.grudge, desc(cmpNum)],
      [([k]) => k, cmpPower],
    ).map(([k]) => k)[0] ?? null;
  for (const x of [...b.alive].filter((x) => x !== me)) {
    const r = brain.rel.get(x);
    const fresh = v.turn - r.proposedTurn >= 4;
    // A coalition against the leader, if he outweighs us both, best with a king whose land touches his and can strike at it too.
    if (
      leader !== null &&
      leader !== me &&
      x !== leader &&
      x !== brain.warTarget &&
      r.against !== leader &&
      r.trust > -0.3 &&
      fresh &&
      !brain.rel.get(leader).allied &&
      !r.hostile &&
      outweighs(b, leader, me, x)
    )
      missions.push(mission(x, "coalition", p.diplomacy * (b.growth(leader) - 0.6) * (touches(b, x, leader) ? 1.4 : 1) * (neighbours.has(x) ? 1.2 : 1), leader));
    else if (aggressor !== null && x !== aggressor && x !== brain.warTarget && r.against !== aggressor && r.trust > -0.3 && fresh && !r.hostile && touches(b, x, aggressor))
      missions.push(mission(x, "coalition", p.diplomacy * 0.55 + 0.2 * (1 - p.pride), aggressor));
    if (x === brain.warTarget) {
      if (p.cunning * (1 - p.honesty) > 0.3 && fresh) missions.push(mission(x, "lull", p.cunning * (1 - p.honesty)));
      continue;
    }
    if (r.grudge >= 3 && fresh) missions.push(mission(x, "grievance", 0.3 + 0.5 * p.vengeance));
    if (!r.treaty && neighbours.has(x) && fresh && !r.hostile)
      missions.push(mission(x, "peace", (0.3 + p.caution) * brain.hostility(x, b) + 0.2 * p.diplomacy + (isSmall(me) ? 0.3 : 0)));
    // Alliance with a trusted partner; never with a rival for the crown, and with the leader only for a small kingdom.
    const small = b.strength(me) < 0.6 * b.strength(x);
    if (r.treaty && !r.allied && r.trust > 0.2 && fresh && (x !== leader || small) && !rivals(b, me, x))
      missions.push(mission(x, "alliance", 0.5 * p.diplomacy + 0.2 * r.trust + (small ? 0.15 : 0)));
    // Item 18 part E: a gift, or a small kingdom's tribute to a great one, wherever it buys more than it costs ("Gold is a
    // lifeline"; investment.ts): to a neighbour whose hostility it cools, not to a friend far away.
    if (!besieged && fresh && !r.hostile && bestGift(b, brain, x, brain.spareGold) > 0) missions.push(mission(x, isSmall(me) && !isSmall(x) ? "tribute" : "gift", 0.4));
    // Item 14 ("Finkel's version"): once in a game, a greedy king short of gold begs a stronger friend for it, in the words
    // Finkel gave such letters: an Easter egg, rare by design.
    if (!brain.begged && p.greed > 0.7 && brain.spareGold < 100 && brain.isFriend(x) && b.strength(x) > b.strength(me) && rng.chance(0.1))
      missions.push(mission(x, "beg", 0.3 + 0.3 * p.greed));
  }
  // The year's tribute to the overlord we serve, a demand of a vassal in arrears, and vassalage offered either way (item 11+).
  for (const l of bondLetters(b, brain)) missions.push(mission(l.to, `bond-${l.kind}`, l.score, null, null, l.amount));
  // A king whose gold our weighers found light (item 8): we tell him his messenger lied, once, while it is fresh.
  for (const [x, [, when, told]] of clausePlays(me) ? [...brain.lightFrom] : []) {
    if (told || !b.alive.has(x) || v.turn - when > 4) continue;
    missions.push(mission(x, "accuse", 0.5 + 0.2 * p.vengeance));
  }
  // A blow a sworn partner leads against our common foe, which our troops can support (see Tactics.joints): we promise our
  // support for the season after next, so that a partner who does not reckon as we do knows to make the move (item 8).
  for (const j of clausePlays(me) ? joints(b, brain) : []) {
    const mine = j.support.find((u) => u.power === me);
    if (j.lead.power === me || mine === undefined || v.turn - brain.supportOfferedTo.getOrDefault(j.lead.power, -99) < 4) continue;
    missions.push(mission(j.lead.power, "support", 0.45 + 0.2 * p.diplomacy, j.against, `${j.lead.province}>${j.target}`));
  }
  // Pleas for relief: while a city of ours is besieged by a king who is no friend of ours, every friend who could come (a
  // neighbour, or a full ally) is asked to send troops to drive the besiegers out, at most once in three seasons; the city
  // that matters most first.
  const plea =
    sortBy(
      v.sieges.filter((x) => x.holder === me && !brain.isFriend(x.besieger)),
      [(x) => b.value(x.province), desc(cmpNum)],
      [(x) => x.province, cmpStr],
    )[0] ?? null;
  if (plea !== null)
    for (const x of [...b.alive].filter((x) => x !== me && x !== plea.besieger && brain.isFriend(x) && brain.betraying !== x && (neighbours.has(x) || brain.rel.get(x).allied))) {
      const asked = brain.pleaSent.tryGet(x);
      if (asked === undefined || v.turn - asked >= 3) missions.push(mission(x, "plea", 0.9, plea.besieger, plea.province));
    }

  // Leave for our troops to stand in a friend's province on the way to our war, where none of our land touches the foe's
  // (item 9): asked on a tablet, by an envoy with our seal.
  const staging = stagingFor(b, brain);
  if (staging !== null) missions.push(mission(staging[0], "basing", 0.6 + 0.3 * p.aggression, staging[2], staging[1]));

  // Evidence of broken oaths for a third court.
  const broken =
    v.tablets.find(
      (t) =>
        t.sealedTurn !== null &&
        t.seals.includes(me) &&
        !brain.sentCopies.has(t.copyId) &&
        t.seals.some((s) => {
          if (s === me) return false;
          const r = brain.rel.tryGet(s);
          return r !== undefined && r.oathsBroken > 0;
        }),
    ) ?? null;
  const forged = v.tablets.find((t) => t.source.startsWith("made by") && !brain.sentCopies.has(t.copyId)) ?? null;

  let budget = Math.min(ready.length, Math.min(3, 1 + toInt(roundEven(p.diplomacy * 2))));
  const sentTo = new HSet<Power>();
  const queue = sortBy(missions, [(m: Mission) => m.score, desc(cmpNum)], [(m: Mission) => m.to, cmpPower]);

  const send = (d: DispatchOrder, copy: string | null = null): void => {
    // A person at court who says it is the envoy of the king written to (item 10): the envoy asks there whether it is.
    const claimant = PeoplePlay.on(me) ? v.known.find((c) => c.claimsToServe === d.to) : undefined;
    if (claimant !== undefined) d = { ...d, checkClaim: claimant.id };
    orders.push(d);
    busy.add(d.envoy);
    sentTo.add(d.to);
    for (let i = ready.length - 1; i >= 0; i--) if (ready[i].id === d.envoy) ready.splice(i, 1);
    if (copy !== null) brain.sentCopies.add(copy);
    brain.lastEnvoyTo.set(d.to, d.envoy);
    brain.sentTo.set(d.envoy, d.to);
    if (d.gold > 0) brain.goldTrips.set(d.envoy, brain.goldTrips.getOrDefault(d.envoy, 0) + 1);
    const rel = d.proposal !== null ? brain.rel.tryGet(d.to) : undefined;
    if (rel !== undefined) rel.proposedTurn = v.turn;
    budget--;
  };

  if (forged !== null && budget > 0 && ready.length > 0) {
    const shown =
      sortBy(
        [...b.alive].filter((x) => x !== me && !forged.seals.includes(x)),
        [(x: Power) => neighbours.has(x), desc(cmpBool)],
        [(x: Power) => x, cmpPower],
      )[0] ?? null;
    if (shown !== null)
      send(
        dispatch(
          ready[ready.length - 1].id,
          shown,
          Letter.forged({ key: `${v.turn}|${me}|${shown}`, names: forged.seals.join(" and ") }),
          // What it shows is the tablet; the clauses only greet him (item 8).
          { mandate: "Show the tablet. Promise nothing.", greeting: greet(brain, shown, false, b), copies: [forged.copyId], clauses: [clause("wellWishes")] },
        ),
        forged.copyId,
      );
  }
  if (broken !== null && budget > 0 && ready.length > 0) {
    const breaker = broken.seals.find((s) => {
      if (s === me) return false;
      const r = brain.rel.tryGet(s);
      return r !== undefined && r.oathsBroken > 0;
    })!;
    const told =
      sortBy(
        [...b.alive].filter((x) => x !== me && x !== breaker && !sentTo.has(x)),
        [(x: Power) => neighbours.has(x), desc(cmpBool)],
        [(x: Power) => x, cmpPower],
      )[0] ?? null;
    if (told !== null)
      send(
        dispatch(
          ready[0].id,
          told,
          Letter.broken({ key: `${v.turn}|${me}|${told}`, names: breaker }),
          {
            mandate: `You may agree to act together against ${breaker}. Promise no land.`,
            greeting: greet(brain, told, false, b),
            copies: [broken.copyId],
            clauses: [clause("against", { power: breaker })],
          },
        ),
        broken.copyId,
      );
  }

  for (const m of queue) {
    if (budget <= 0 || ready.length === 0) break;
    if (sentTo.has(m.to) || m.score <= 0.15) continue;
    // Tablets, and the gold of gifts and tribute, go with the most reliable envoy still at court; the rest with the least
    // reliable.
    const trusted = m.kind === "coalition" || m.kind === "alliance" || m.kind === "peace" || m.kind === "gift" || m.kind === "tribute" || m.kind === "plea" || m.kind === "basing" || m.kind.startsWith("bond-");
    // Item 12: of those, one who says he speaks a language the court understands.
    const envoy = envoyFor(ready, m.to, me, !trusted);
    const d = compose(b, brain, m, envoy.id, rng);
    if (d === null) continue;
    // Our seal with the envoys we trust with a tablet (item 9), so that a host may answer with a tablet of its own.
    const authority = authorityFor(b, brain, m.to, trusted && d.proposal != null);
    if (authority !== null) d.authority = authority;
    send(d);
    if (m.kind === "plea") brain.pleaSent.set(m.to, v.turn);
    if (m.kind === "bond-tribute") brain.tributePaid.set(m.to, v.turn);
    else if (m.kind.startsWith("bond-")) brain.bondAsked.set(m.to, v.turn);
    if (m.kind === "basing") brain.basingAsked.set(m.to, v.turn);
    if (m.kind === "beg") brain.begged = true;
    if (m.kind === "accuse") brain.lightFrom.get(m.to)[2] = true;
    if (m.kind === "support") {
      const [from, target] = m.city!.split(">");
      brain.supportOfferedTo.set(m.to, v.turn);
      brain.promised.push({ turn: v.turn + 2, by: me, of: m.to, from, to: target });
    }
  }
}

function compose(b: Board, brain: Brain, m: Mission, envoy: string, rng: Rng): DispatchOrder | null {
  const p = brain.p;
  const me = b.me;
  const to = m.to;
  const greeting = greet(brain, to, m.kind === "tribute" || m.kind === "bond-tribute" || m.kind === "bond-submit", b);
  const key = `${b.v.turn}|${me}|${to}`;
  const flavour = closing(me, `${key}|${m.kind}`);
  // Gifts are score given away: only what returns more than it costs (investment.ts), and one gift-bearing letter a season.
  const gift = (): number => {
    if (brain.giftTurn === b.v.turn) return 0;
    const g = bestGift(b, brain, to, brain.spareGold);
    if (g > 0) {
      brain.giftTurn = b.v.turn;
      brain.spareGold -= g;
    }
    return g;
  };
  // The faithless debase their gold, but only for a friend who trusts them, who has no cause to assay it.
  const purity = (): number => (p.honesty < 0.45 && brain.isFriend(to) && brain.rel.get(to).trust >= 0.3 ? rng.range(55, 85) : 100);

  switch (m.kind) {
    case "coalition": {
      const top = m.against!;
      const why = top === b.leader() ? Letter.coalitionLeader({ key, foe: top }) : Letter.coalitionInvaded({ key, foe: top });
      return dispatch(envoy, to, trim(`${why} ${flavour}`), {
        mandate: `You may swear alliance against ${top} and agree to support each other's troops. Promise no land.`,
        greeting,
        // A pact against one king, not an alliance: it does not make the two of them partners in victory.
        proposal: newTabletProposal({ text: coalitionTablet(me, to, top), allianceOath: false, clauses: [clause("against", { power: top })] }),
        clauses: [clause("against", { power: top }), ...news(b, top, to)],
      });
    }
    case "alliance":
      return dispatch(
        envoy,
        to,
        trim(`${Letter.alliance({ key })} ${flavour}`),
        {
          mandate: "You may swear a full alliance. Promise no land.",
          greeting,
          proposal: newTabletProposal({ text: allianceTablet(me, to), allianceOath: true, clauses: [clause("alliance"), ...tradeRights(b.v, to), ...fugitiveRights(b, to)] }),
          clauses: [clause("alliance")],
        },
      );
    case "peace": {
      // A gift goes with the offer where it pays (investment.ts).
      const g = gift();
      return dispatch(
        envoy,
        to,
        trim(`${Letter.peace({ key, gift: g > 0 })} ${flavour}`),
        {
          mandate: "You may agree to peace and an exchange of gifts. Promise no land.",
          greeting,
          gold: g,
          purityPercent: g > 0 ? purity() : 100,
          noInventory: g > 0 && bare(brain, to, envoy, b),
          proposal: newTabletProposal({ text: peaceTablet(me, to), clauses: [clause("peace"), ...tradeRights(b.v, to), ...fugitiveRights(b, to)] }),
          clauses: [clause("peace"), ...(g > 0 ? [clause("gift", { amount: g })] : [])],
        },
      );
    }
    case "lull":
      return dispatch(envoy, to, trim(`${Letter.lull({ key })} ${flavour}`), {
        mandate: "Speak only of friendship. Promise nothing.",
        greeting,
        clauses: [clause("wellWishes"), clause("noAttack"), clause("newsStrength", { power: me, amount: 0 })],
      });
    case "grievance": {
      const r = brain.rel.get(to);
      // A king strong enough to make it good, and warlike or vengeful enough to mean it, threatens war outright.
      const threat = b.strength(me) >= 0.9 * b.strength(to) && p.aggression + p.vengeance > 1 && (!AuditPlay.on(me) || canMarchOn(b, to));
      const text = r.oathsBroken > 0 ? Letter.grievanceOath({ key, threat }) : Letter.grievance({ key, threat });
      // Where his troops stand in our land, the clauses name it, and ask him to withdraw from it.
      const held = sortBy(
        b.v.units.filter((u) => u.power === to && b.isMine(u.province)),
        [(u) => b.value(u.province), desc(cmpNum)],
        [(u) => u.province, cmpStr],
      )[0]?.province ?? null;
      const clauses: Clause[] = [r.oathsBroken > 0 ? clause("brokenOath") : clause("grievance", { province: held })];
      if (held !== null) clauses.push(clause("askWithdraw", { province: held }));
      clauses.push(clause("askGold", { amount: 50 }));
      if (threat) clauses.push(clause("threat"));
      return dispatch(envoy, to, trim(`${text} ${flavour}`), { mandate: "Demand withdrawal and gifts. Agree to nothing less.", greeting, clauses });
    }
    case "plea": {
      const foe = m.against!;
      const city = Board.Map.get(m.city!).name;
      // The walls sally only from a height (sallyMinWalls): the letter promises it only where they can.
      const min = b.v.prices.getOrDefault("sallyMinWalls", 2);
      const sally = b.wallLevel(m.city!) >= min && min > 0;
      // A king not yet sworn with us against the besieger is asked to swear it too, as in a defence pact.
      const sworn = brain.rel.get(to).against === foe;
      // A sworn ally gets passage at once, by order, so his troops need not wait for a tablet (item 11a+).
      if (authorityOn(me) && sworn && brain.rel.get(to).allied) brain.leaveAsked.set(to, [clause("askPassage", { turn: b.v.turn + 6 })]);
      return dispatch(
        envoy,
        to,
        trim(`${Letter.plea({ key, foe, city, sally, unsworn: !sworn, servant: tier(me) === "City" })} ${flavour}`),
        {
          mandate: sworn
            ? `Ask for troops against ${foe} at ${city}. Promise no land.`
            : `Ask for troops against ${foe} at ${city}. You may swear alliance against ${foe} and agree to support each other's troops. Promise no land.`,
          greeting,
          // Our land opened to his troops on the way (item 9): passage, granted when he seals it.
          proposal: !authorityOn(me)
            ? sworn
              ? null
              : newTabletProposal({ text: coalitionTablet(me, to, foe), allianceOath: false, clauses: [clause("against", { power: foe })] })
            : newTabletProposal({ clauses: sworn ? [passageClause(b.v.turn)] : [clause("against", { power: foe }), passageClause(b.v.turn)] }),
          clauses: [clause("askHelp", { province: m.city!, power: foe }), ...(sworn ? [] : [clause("against", { power: foe })])],
        },
      );
    }
    case "basing": {
      const place = Board.Map.get(m.city!).name;
      return dispatch(envoy, to, trim(`${Letter.basing({ key, foe: m.against!, place })} ${flavour}`), {
        mandate: `Ask leave for my troops to stand in ${place}. Promise no land.`,
        greeting,
        proposal: basingTablet(m.city!, b.v.turn),
        clauses: [clause("wellWishes")],
      });
    }
    case "accuse": {
      const short = brain.lightFrom.get(to)[0];
      return dispatch(
        envoy,
        to,
        trim(`${Letter.accuse({ key, amount: short })} ${flavour}`),
        { mandate: "Speak of the gold. Promise nothing.", greeting, clauses: [clause("envoyLied"), clause("lightGift", { amount: short })] },
      );
    }
    case "support": {
      const [from, target] = m.city!.split(">");
      const foe = m.against!;
      return dispatch(
        envoy,
        to,
        trim(`${Letter.support({ key, foe, from: Board.Map.get(from).name, target: Board.Map.get(target).name })} ${flavour}`),
        { mandate: "Speak of the war against our common foe. Promise no land.", greeting, clauses: [clause("support", { province: from, to: target, turn: b.v.turn + 2 }), ...news(b, foe, to)] },
      );
    }
    case "bond-tribute":
      return dispatch(envoy, to, trim(`${Letter.tribute({ key, amount: m.amount })} ${flavour}`), {
        mandate: "Deliver the tribute. Promise nothing more.",
        greeting,
        gold: m.amount,
        clauses: [clause("tribute", { amount: m.amount }), clause("askProtect")],
      });
    case "bond-demand": {
      // The audit's find 3b: a king threatens only what he can make good, an army of his in or beside the vassal's land and
      // strength enough; otherwise he asks, and the vassal is left to weigh what his oath is worth.
      const can = AuditPlay.on(me) ? canMarchOn(b, to) : true;
      return dispatch(envoy, to, trim(`${Letter.demand({ key, amount: m.amount, threat: can })} ${flavour}`), {
        mandate: "Ask for the tribute owed. Promise nothing.",
        greeting,
        clauses: [clause("askTribute", { amount: m.amount }), ...(can ? [clause("threat")] : []), clause("brokenOath")],
      });
    }
    case "bond-offer":
      return dispatch(envoy, to, trim(`${Letter.offerBond({ key, amount: m.amount })} ${flavour}`), {
        mandate: "You may seal the tablet as it stands. Promise no land and no gold.",
        greeting,
        proposal: newTabletProposal({ text: vassalTablet(me, to, m.amount), vassal: to, clauses: bondClauses(true, m.amount) }),
        clauses: [clause("askTribute", { amount: m.amount }), clause("protect"), clause("askServe")],
      });
    case "bond-submit":
      return dispatch(envoy, to, trim(`${Letter.submit({ key, amount: m.amount })} ${flavour}`), {
        mandate: "You may seal the tablet as it stands. Promise no land.",
        greeting,
        proposal: newTabletProposal({ text: vassalTablet(to, me, m.amount), vassal: me, clauses: bondClauses(false, m.amount) }),
        clauses: [clause("tribute", { amount: m.amount }), clause("serve"), clause("askProtect")],
      });
    case "beg":
      return dispatch(envoy, to, FinkelLetter, { mandate: "Ask for gold. Promise nothing.", greeting, clauses: [clause("wellWishes"), clause("askGold", { amount: 100 })] });
    case "gift":
    case "tribute": {
      const g = gift();
      if (g === 0) return null;
      return dispatch(envoy, to, trim(`${Letter.gift({ key })} ${flavour}`), {
        mandate: "Speak of friendship. Promise nothing.",
        greeting,
        gold: g,
        purityPercent: purity(),
        noInventory: bare(brain, to, envoy, b),
        clauses: m.kind === "tribute" ? [clause("tribute", { amount: g }), clause("gift", { amount: g })] : [clause("wellWishes"), clause("gift", { amount: g })],
      });
    }
  }
  return null;
}

/**
 * The cities of the sender's that a letter says are besieged, each with the one living king the sentence names as besieging
 * it (neither the sender nor the host). Read as words, so a model king's plea counts as a script king's does.
 */
export function* pleasIn(text: string, b: Board, sender: Power, host: Power): Generator<[string, Power]> {
  for (const sentence of TextKit.sentences(text)) {
    if (!sentence.toUpperCase().includes("BESIEG")) continue;
    const kings = [...b.alive].filter((x) => x !== sender && x !== host && Names.mentions(sentence, x));
    if (kings.length !== 1) continue;
    const cities: string[] = [];
    for (const [k, o] of b.v.owner) if (o === sender && b.walls(k) && Names.mentionsPlace(sentence, Board.Map.get(k).name)) cities.push(k);
    for (const city of sortBy(cities, [(x: string) => x, cmpStr])) yield [city, kings[0]];
  }
}

// The tablets a script king proposes.
export const Curse = "If one breaks this oath, may the gods destroy his name and his seed.";

export const peaceTablet = (me: Power, to: Power): string => `${Oath}: ${me} and ${to} are brothers. Neither king shall send troops into the lands of the other. ${Curse}`;

export const allianceTablet = (me: Power, to: Power): string =>
  `${Oath}: ${me} and ${to} are allies. Each shall stand with the other against any enemy, and the friend of one shall be the friend of the other. ${Curse}`;

/** A vassal tablet in the template's words (item 11+): `vassal` serves `overlord` for tribute, and is guarded. */
export const vassalTablet = (overlord: Power, vassal: Power, amount: number): string =>
  `${Oath}: ${vassal} is the servant of ${overlord}. ${vassal} shall send ${overlord} ${amount} shekels of gold each year as tribute, and take up no arms against ${overlord} or his friends; ${overlord} shall guard the land of ${vassal}. ${Curse}`;

export const coalitionTablet = (me: Power, to: Power, against: Power): string =>
  `${Oath}: ${me} and ${to} swear to stand together against ${against}. Neither shall make peace with ${against} alone, and each shall support the other's troops against ${against}. ${Curse}`;

/** Free passage for each other's goods (item 9+b), written into a peace or an alliance where tolls stand between us. */
function tradeRights(v: SeatView, to: Power): Clause[] {
  return wantsTradeRights(v, to) ? [clause("tollFree"), clause("askTollFree")] : [];
}

/**
 * The greeting a king chooses, from his pride and his feelings for the recipient. `humble`: tribute. With the board, a
 * contested name is given by his stakes (item 17+).
 */
export function greet(brain: Brain, to: Power, humble = false, b: Board | null = null): GreetingOptions {
  const p = brain.p;
  const o = newGreetingOptions();
  if (b !== null && byHouse(b, brain, to)) o.byHouse = true;
  const r = brain.rel.get(to);
  if (r.hostile) {
    o.callBrother = false;
    o.senderFirst = p.pride > 0.7;
  }
  // A proud king writes no greeting at all to one who broke an oath to him.
  if (r.oathsBroken > 0 && r.hostile && p.pride > 0.8) o.omit = true;
  if (humble && p.pride < 0.5) o.claimGreatKing = false;
  if (p.pride > 0.85 && isSmall(to) && !brain.isFriend(to)) o.grantGreatKing = false;
  // A city's ruler writes as a ruler, not a Great King, and as a servant to the kings; the kings write so to him (item 11+).
  if (tier(brain.me) === "City") {
    o.claimGreatKing = false;
    if (tier(to) !== "City") o.callBrother = false;
  }
  if (tier(to) === "City") o.grantGreatKing = false;
  if (tier(to) === "City" && tier(brain.me) !== "City") o.callBrother = false;
  // A proud king withholds "brother" and "Great King" from a king whose claim to the rank is still new and whom he counts
  // his vassal, unless they are friends ("Recognition is earned"; at the start, Babylonia and Assyria).
  const claim = brain.claims.find((x) => x.power === to);
  if (claim !== undefined && claim.established === null && claim.overlord === brain.me && p.pride > 0.6 && !brain.isFriend(to)) {
    o.callBrother = false;
    o.grantGreatKing = false;
  }
  return o;
}

/**
 * Whether gold goes without an inventory (item 8), saving the scribe's fee: only with an envoy who has earned it, one who
 * told us he refused a host's post, or who has carried our gold twice with no word that it weighed light. Anyone else's
 * gold goes with an inventory, so that a host who finds it light can tell us so.
 */
function bare(brain: Brain, to: Power, envoy: string, b: Board): boolean {
  if (!InventoryPlay.on || !clausePlays(b.me)) return false;
  const c = b.v.court.find((x) => x.id === envoy);
  if (c === undefined || reliability(c) < 0) return false;
  return brain.provenLoyal.has(envoy) || (brain.goldTrips.getOrDefault(envoy, 0) >= 2 && !brain.thieves.has(envoy) && to !== brain.warTarget);
}

/** Script kings sending gold without an inventory where they trust the envoy (item 8); off for the comparison with kings that never do. */
export const InventoryPlay = { on: true };

/** News for a partner (item 8): the troops of the king we stand against seen nearest his land. */
function news(b: Board, foe: Power, to: Power): Clause[] {
  const near = sortBy(
    b.v.units.filter((u) => u.power === foe && Board.Map.provinces.some((x) => !x.isSea && b.ownerOf(x.id) === to && Board.Map.areAdjacent(u.province, x.id))),
    [(u) => u.province, cmpStr],
  )[0];
  return near === undefined ? [] : [clause("newsTroops", { power: foe, province: near.province })];
}

/** Finkel's parody of the Amarna letters, in full as the video's transcript gives it ("Finkel's version"). */
export const FinkelLetter =
  "You're my brother. I love you. I love you. Send gold. I love you my gold owning brother and the best gold in the world. And you gave gold to my father and I like gold and sends much gold as you got lots of it anyway.";
