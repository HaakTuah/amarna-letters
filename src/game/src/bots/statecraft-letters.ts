/** The non-military half of a script king, third part: letters, the tablets it proposes, greetings and audiences. */
import {
  AllPowers,
  HSet,
  clamp,
  cmpBool,
  cmpNum,
  cmpPower,
  cmpStr,
  count,
  desc,
  dispatch,
  formatMoney,
  idiv,
  newGreetingOptions,
  newHostReply,
  newTabletProposal,
  clause,
  ProposalKinds,
  type Clause,
  roundEven,
  sortBy,
  sum,
  tier,
  toInt,
  trim,
  trimEnd,
  type AudienceView,
  type CharacterView,
  type DispatchOrder,
  type GreetingOptions,
  type HostReply,
  type Order,
  type Power,
  type Province,
  type Rng,
  type TabletView,
} from "@amarna/engine";
import { Board, LeadFloor } from "./board.ts";
import type { Brain } from "./brain.ts";
import { Names } from "./names.ts";
import { reliability } from "./statecraft-court.ts";
import { outweighs, rivals, touches } from "./statecraft-strategy.ts";
import { joints, willing } from "./tactics.ts";
import { TextKit } from "./textkit.ts";
import { againstIn, answerLetter, clausePlays, givesAwayIn } from "./statecraft-clauses.ts";

const Oath = "By Shamash, Amun, Marduk and Teshub";

/** `against`: the king a coalition is sworn against, or who besieges the city a plea is for. `city`: the besieged city a plea is for. */
interface Mission {
  to: Power;
  kind: string;
  score: number;
  against: Power | null;
  city: string | null;
}

const mission = (to: Power, kind: string, score: number, against: Power | null = null, city: string | null = null): Mission => ({ to, kind, score, against, city });

const byReliability = (brain: Brain): [(c: CharacterView) => unknown, (a: never, b: never) => number][] => [
  [(c: CharacterView) => reliability(c), desc(cmpNum)],
  [(c: CharacterView) => brain.provenLoyal.has(c.id), desc(cmpBool)],
  [(c: CharacterView) => c.id, cmpStr],
];

export function letters(b: Board, brain: Brain, orders: Order[], busy: HSet<string>, rng: Rng): void {
  const p = brain.p;
  const v = b.v;
  const me = b.me;
  // From a besieged capital an envoy may be caught slipping out, and one whose courage failed him will fail again while the
  // siege is as tight: he is not asked for two seasons, and no gold goes out to be taken.
  const besieged = v.sieges.some((x) => x.holder === me && x.province === Board.Map.capital(me).id);
  const ready = sortBy(
    v.court.filter((c) => {
      if (!c.ready || busy.has(c.id)) return false;
      const t = brain.wouldNotLeave.tryGet(c.id);
      return !(besieged && t !== undefined && v.turn - t <= 2);
    }),
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
      missions.push(mission(x, "peace", (0.3 + p.caution) * brain.hostility(x, b) + 0.2 * p.diplomacy + (tier(me) === "Weak" ? 0.3 : 0)));
    // Alliance with a trusted partner; never with a rival for the crown, and with the leader only for a small kingdom.
    const small = b.strength(me) < 0.6 * b.strength(x);
    if (r.treaty && !r.allied && r.trust > 0.2 && fresh && (x !== leader || small) && !rivals(b, me, x))
      missions.push(mission(x, "alliance", 0.5 * p.diplomacy + 0.2 * r.trust + (small ? 0.15 : 0)));
    if (!besieged && brain.isFriend(x) && brain.spareGold > 150 && rng.chance(0.3)) missions.push(mission(x, "gift", 0.4 * p.generosity));
    // Tribute, to a great neighbour who looks ready to march.
    if (!besieged && tier(me) === "Weak" && tier(x) !== "Weak" && neighbours.has(x) && brain.spareGold > 100 && fresh && !r.hostile && brain.hostility(x, b) > 0.35)
      missions.push(mission(x, "tribute", 0.35 + 0.4 * p.caution));
  }
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
          `My brother, see what ${forged.seals.join(" and ")} have sealed in secret. I send you the tablet itself. Judge for yourself who are your friends.`,
          // What it shows is the tablet; the clauses only greet him (item 8).
          { mandate: "Show the tablet. Promise nothing.", greeting: greet(brain, shown), copies: [forged.copyId], clauses: [clause("wellWishes")] },
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
          `${breaker} sealed this tablet with me before the gods, and then broke it. See for yourself what an oath of ${breaker} is worth. Stand with me, and ${breaker} will learn the price of a broken oath.`,
          {
            mandate: `You may agree to act together against ${breaker}. Promise no land.`,
            greeting: greet(brain, told),
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
    const trusted = m.kind === "coalition" || m.kind === "alliance" || m.kind === "peace" || m.kind === "gift" || m.kind === "tribute" || m.kind === "plea";
    const envoy = trusted ? ready[0] : ready[ready.length - 1];
    const d = compose(b, brain, m, envoy.id, rng);
    if (d === null) continue;
    send(d);
    if (m.kind === "plea") brain.pleaSent.set(m.to, v.turn);
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
  const greeting = greet(brain, to, m.kind === "tribute");
  const flavour = flavourOf(me, to);
  const weaker =
    b.landGrowth(me) *
      sum(Board.Map.homeOf(me), (x) => x.yield) <
    b.landGrowth(to) * sum(Board.Map.homeOf(to), (x) => x.yield);
  // Gifts are score given away: kept small, and only one gift-bearing letter a season.
  const gift = (share: number): number => {
    if (brain.spareGold < 100 || brain.giftTurn === b.v.turn) return 0;
    brain.giftTurn = b.v.turn;
    // No more than a third of a season's income: a small kingdom's gifts are small.
    return idiv(Math.trunc(clamp(10 + brain.spareGold * share * 0.5, 20, Math.max(20, Math.min(60, idiv(b.v.income, 3))))), 10) * 10;
  };
  // The faithless debase their gold, but only for a friend who trusts them, who has no cause to assay it.
  const purity = (): number => (p.honesty < 0.45 && brain.isFriend(to) && brain.rel.get(to).trust >= 0.3 ? rng.range(55, 85) : 100);

  switch (m.kind) {
    case "coalition": {
      const top = m.against!;
      const why =
        top === b.leader()
          ? `${top} grows like the flood of the river and swallows the cities one by one. If we stand apart, it will swallow us both.`
          : `${top} has sent his troops into my land, and what he takes from me today he will take from you tomorrow.`;
      return dispatch(envoy, to, `${why} Let us stand together and hold him back: where your troops face ${top}, mine will support them. ${flavour}`, {
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
        `We have kept the peace between us, as brothers should. Let us go further and swear to stand together, so that the enemy of one is the enemy of both. ${flavour}`,
        {
          mandate: "You may swear a full alliance. Promise no land.",
          greeting,
          proposal: newTabletProposal({ text: allianceTablet(me, to), allianceOath: true, clauses: [clause("alliance")] }),
          clauses: [clause("alliance")],
        },
      );
    case "peace": {
      // The weak pay tribute; the generous send gifts anyway.
      const g = weaker || p.generosity > 0.6 ? gift(0.08 + 0.1 * p.generosity + (weaker ? 0.06 : 0)) : 0;
      return dispatch(
        envoy,
        to,
        `I wish to live in brotherhood with you, as our fathers did. Let neither of us send troops into the lands of the other.` +
          (g > 0 ? " I send you gold as a sign of my love." : "") +
          ` ${flavour} Seal the tablet I send, before Shamash and the gods of your land.`,
        {
          mandate: "You may agree to peace and an exchange of gifts. Promise no land.",
          greeting,
          gold: g,
          purityPercent: g > 0 ? purity() : 100,
          noInventory: g > 0 && bare(brain, to, envoy, b),
          proposal: newTabletProposal({ text: peaceTablet(me, to), clauses: [clause("peace")] }),
          clauses: [clause("peace"), ...(g > 0 ? [clause("gift", { amount: g })] : [])],
        },
      );
    }
    case "lull":
      return dispatch(envoy, to, `Why should there be anything but friendship between us? My troops are few and my thoughts are of the harvest. Let gifts pass between us. ${flavour}`, {
        mandate: "Speak only of friendship. Promise nothing.",
        greeting,
        clauses: [clause("wellWishes"), clause("noAttack"), clause("newsStrength", { power: me, amount: 0 })],
      });
    case "grievance": {
      const r = brain.rel.get(to);
      let text =
        r.oathsBroken > 0
          ? "You swore before the gods and then sent your troops into my land. Is this the oath of a king? Withdraw, and send me fitting gifts, or the gods and I will remember it."
          : "Your troops have entered my land. Is this brotherhood? Withdraw them, and send me a fitting gift, or I will not forget it.";
      // A king strong enough to make it good, and warlike or vengeful enough to mean it, threatens war outright.
      const threat = b.strength(me) >= 0.9 * b.strength(to) && p.aggression + p.vengeance > 1;
      if (threat) text += " If you do not withdraw, my troops will march into your land.";
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
      const sallyText = b.wallLevel(m.city!) >= min && min > 0 ? ", and my walls will sally to meet them" : "";
      // A king not yet sworn with us against the besieger is asked to swear it too, as in a defence pact.
      const sworn = brain.rel.get(to).against === foe;
      return dispatch(
        envoy,
        to,
        `My brother, the troops of ${foe} besiege my city of ${city}. Come to my aid: send your troops to drive them out${sallyText}.` +
          (sworn ? "" : ` What ${foe} takes from me today he will take from you tomorrow: let us stand together against him.`) +
          trimEnd(` I will not forget who stood with me. ${flavour}`),
        {
          mandate: sworn
            ? `Ask for troops against ${foe} at ${city}. Promise no land.`
            : `Ask for troops against ${foe} at ${city}. You may swear alliance against ${foe} and agree to support each other's troops. Promise no land.`,
          greeting,
          proposal: sworn ? null : newTabletProposal({ text: coalitionTablet(me, to, foe), allianceOath: false, clauses: [clause("against", { power: foe })] }),
          clauses: [clause("askHelp", { province: m.city!, power: foe }), ...(sworn ? [] : [clause("against", { power: foe })])],
        },
      );
    }
    case "accuse": {
      const short = brain.lightFrom.get(to)[0];
      return dispatch(
        envoy,
        to,
        `The gold your messenger brought me weighed ${short} shekels less than the inventory you sealed. Either you are mean, or your messenger lied to you and to me. ${flavour}`,
        { mandate: "Speak of the gold. Promise nothing.", greeting, clauses: [clause("envoyLied"), clause("lightGift", { amount: short })] },
      );
    }
    case "support": {
      const [from, target] = m.city!.split(">");
      const foe = m.against!;
      return dispatch(
        envoy,
        to,
        `We have sworn to stand together against ${foe}. When your troops go from ${Board.Map.get(from).name} into ${Board.Map.get(target).name}, mine will support them. ${flavour}`,
        { mandate: "Speak of the war against our common foe. Promise no land.", greeting, clauses: [clause("support", { province: from, to: target, turn: b.v.turn + 2 }), ...news(b, foe, to)] },
      );
    }
    case "gift":
    case "tribute": {
      const g = gift(0.06 + 0.08 * p.generosity);
      if (g === 0) return null;
      return dispatch(envoy, to, `I have heard that all is well with you, and I rejoice. Here is a gift for my brother; send me your messenger quickly. ${flavour}`, {
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
const Curse = "If one breaks this oath, may the gods destroy his name and his seed.";

export const peaceTablet = (me: Power, to: Power): string => `${Oath}: ${me} and ${to} are brothers. Neither king shall send troops into the lands of the other. ${Curse}`;

export const allianceTablet = (me: Power, to: Power): string =>
  `${Oath}: ${me} and ${to} are allies. Each shall stand with the other against any enemy, and the friend of one shall be the friend of the other. ${Curse}`;

export const coalitionTablet = (me: Power, to: Power, against: Power): string =>
  `${Oath}: ${me} and ${to} swear to stand together against ${against}. Neither shall make peace with ${against} alone, and each shall support the other's troops against ${against}. ${Curse}`;

/** Whether a tablet from this sender is in a script king's own words: one of the tablets above, or the frozen baseline's. */
function scriptWords(text: string, from: Power, to: Power): boolean {
  return (
    text === peaceTablet(from, to) ||
    text === allianceTablet(from, to) ||
    text === `${Oath}: ${from} and ${to} are brothers. Neither king shall send troops into the lands of the other. They shall stand together against any enemy, and share in the victory. ${Curse}` ||
    AllPowers.some((x) => text === coalitionTablet(from, to, x) || text === `${Oath}: ${from} and ${to} swear to stand together against ${x}. Neither shall make peace with ${x} alone. ${Curse}`)
  );
}

/**
 * Whether a tablet in words no script king wrote speaks of land, gold or tribute, or names a province of ours (held now, or
 * of our homeland). A capital of ours counts only in a sentence that hands something over.
 */
export function givesAway(proposal: TabletView, b: Board, from: Power): boolean {
  // A tablet set out in clauses is read by them alone (item 8), whatever its words say.
  if (proposal.clauses.length > 0) return givesAwayIn(proposal.clauses);
  const text = proposal.text;
  if (scriptWords(text, from, b.me)) return false;
  if (TextKit.speaksOfLandOrGold(text)) return true;
  const sentences = TextKit.sentences(text);
  const named = (s: string, x: Province): boolean => Names.mentionsPlace(s, x.name) || Names.mentionsPlace(s, x.id);
  return Board.Map.provinces
    .filter((x) => !x.isSea && (b.isMine(x.id) || x.home === b.me))
    .some((x) => (x.capital ? sentences.some((s) => named(s, x) && TextKit.handsOver(s)) : named(text, x)));
}

/** The greeting a king chooses, from his pride and his feelings for the recipient. `humble`: tribute. */
export function greet(brain: Brain, to: Power, humble = false): GreetingOptions {
  const p = brain.p;
  const o = newGreetingOptions();
  const r = brain.rel.get(to);
  if (r.hostile) {
    o.callBrother = false;
    o.senderFirst = p.pride > 0.7;
  }
  // A proud king writes no greeting at all to one who broke an oath to him.
  if (r.oathsBroken > 0 && r.hostile && p.pride > 0.8) o.omit = true;
  if (humble && p.pride < 0.5) o.claimGreatKing = false;
  if (p.pride > 0.85 && tier(to) === "Weak" && !brain.isFriend(to)) o.grantGreatKing = false;
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

function flavourOf(me: Power, _to: Power): string {
  switch (me) {
    case "Egypt":
      return "In my land gold is as plentiful as dust, and my friends do not go without.";
    case "Babylonia":
      return "Remember that the gifts of a Great King should be worthy of a Great King.";
    case "Mitanni":
      return "Let my brother protect me as his father protected mine, and I will be his faithful friend.";
    case "Assyria":
      return "I am a Great King, as you are, and I will be treated as one.";
    case "Hatti":
      return "The troops of Hatti are many, and they remember their friends.";
    case "Arzawa":
      return "The west is wide, and its friendship can be had.";
    case "Alashiya":
      return "I send you copper from my mountains; send me silver and gold.";
    default:
      return "";
  }
}

// ================================================================= audiences

export function host(view: AudienceView, b: Board, brain: Brain, rng: Rng): HostReply {
  const p = brain.p;
  const me = view.host;
  const sender = view.from;
  const r = brain.rel.get(sender);
  const leader = b.leader();
  const hostile = r.hostile || sender === brain.warTarget;
  const friend = brain.isFriend(sender) && brain.betraying !== sender;
  // The second exchange, held only when the host offered a gift: if the envoy refused it, the host offers half as much
  // again, once, with the same request; otherwise it lets the envoy go.
  if (view.round > 1) {
    const again = newHostReply({ end: true, speech: "Go in peace, and carry my words faithfully." });
    const offered = brain.bribeOffered.tryGet(view.audienceId);
    if (offered !== undefined) {
      brain.bribeOffered.delete(view.audienceId);
      if (view.giftAccepted === 0 && brain.spareGold > 150 + offered[0]) {
        again.bribe = toInt(roundEven((offered[0] * 1.5) / 10)) * 10;
        again.bribeAsk = offered[1];
        again.speech = "Do not refuse me so quickly. Take this, and think again of what I asked of you.";
      }
    }
    return again;
  }

  const reply = newHostReply({ end: true });
  const speech: string[] = [];

  if (view.greetingDeviations.includes("no greeting at all")) {
    speech.push("Your tablet does not even greet me. Is this how one writes to a Great King?");
    r.trust -= 0.1 * p.pride;
  } else if (view.greetingDeviations.includes('no "brother"')) {
    speech.push("You do not call me brother. Have I not been a brother to you?");
    r.trust -= 0.1 * p.pride;
  }
  if (view.greetingDeviations.includes("the recipient is not called Great King")) {
    speech.push("And you deny me the title of Great King. I will remember it.");
    r.grudge += p.pride;
  }
  if (view.greetingDeviations.includes("the sender's name first")) speech.push("You put your own name before mine.");
  // A king who does not name himself Great King before us: a proud host is flattered.
  if (view.greetingDeviations.includes("the sender does not claim to be a Great King")) {
    speech.push("Your lord writes modestly to a Great King. It is well.");
    r.trust += 0.05 + 0.1 * p.pride;
  }
  // An envoy secretly in our pay shows us what its lord really told it. Words of friendship it was told to speak and nothing
  // more, or threats against us it left unsaid, show a lord who means us harm.
  const secret = view.secretMandate;
  if (
    secret !== null &&
    (secret.toUpperCase().includes("ONLY OF FRIENDSHIP") || TextKit.sentences(view.secretLetter ?? "").some((x) => TextKit.isThreatTo(x, me, sender) && !view.spoken.includes(x)))
  ) {
    r.trust -= 0.3;
    r.grudge += 1.5;
  }

  if (view.goldStated > 0 && view.goldWeighed < view.goldStated) {
    speech.push(
      `The inventory lists ${formatMoney(view.goldStated)}, but my weighers found only ${formatMoney(view.goldWeighed)}. Either your lord is mean or your messenger's hands are heavy with my gold.`,
    );
    reply.clauses.push(clause("lightGift", { amount: view.goldStated - view.goldWeighed }));
    // Remembered, to tell his lord in a letter of our own that his messenger lied (see letters).
    brain.lightFrom.set(sender, [view.goldStated - view.goldWeighed, view.turn, false]);
    r.trust -= 0.15;
  } else if (view.goldWeighed > 0) {
    speech.push(p.greed > 0.65 && view.goldWeighed < 100 ? "I have received your gift. It is small, for a Great King." : "I have received your gift, and I thank my brother.");
    reply.clauses.push(clause("accept", { answers: "gift" }));
    r.trust += Math.min(0.25, view.goldWeighed / 400.0);
  }

  for (const copy of view.copiesShown) {
    for (const accused of copy.seals.filter((s) => s !== sender && s !== me && brain.rel.has(s))) brain.rel.get(accused).trust -= 0.15 * (1 - p.caution);
    speech.push("I have seen the tablet you show me. I will remember who breaks oaths, and who forges them.");
  }

  const proposal = view.proposal;
  if (proposal !== null) {
    // The king a coalition names, by any of his names (see Names).
    const named = againstIn(proposal, [me, sender]);
    let seal: boolean;
    if (named !== null) {
      // Worth swearing against the king who leads (or stands at the top as we reckon it) if he outweighs us both; or against
      // one on our own borders who is taking land and is too strong for the sender alone. Never against an ally.
      const ra = brain.rel.get(named);
      const ahead = b.growth(named) >= LeadFloor - 0.05 && [...b.alive].filter((x) => x !== named).every((x) => b.growth(named) >= b.growth(x));
      const race = (named === leader || ahead) && outweighs(b, named, me, sender);
      const defence =
        touches(b, me, named) &&
        b.strength(named) >= 0.8 * b.strength(sender) &&
        (brain.belligerence.getOrDefault(named, 0) >= 1 || ra.hostile || named === brain.warTarget || ra.trust < 0);
      // And never with a king who is taking our own land, whoever he names.
      seal = !ra.allied && !hostile && (race || defence);
    } else seal = !hostile && !(proposal.allianceOath && rivals(b, me, sender));
    if (sender === leader && !friend && p.caution < 0.6) seal = false;
    // A tablet in someone else's words is read for what it would give away (see givesAway).
    const gives = seal && givesAway(proposal, b, sender);
    if (gives) seal = false;
    reply.sealProposal = seal;
    const offered = proposal.clauses.find((x) => ProposalKinds.includes(x.kind))?.kind ?? (named !== null ? "against" : proposal.allianceOath ? "alliance" : "peace");
    reply.clauses.push(clause(seal ? "accept" : "refuse", { answers: offered }));
    speech.push(
      seal
        ? "I have sealed the tablet before the gods."
        : gives
          ? "I will not seal a tablet that speaks of land, gold or tribute, or names a province of mine."
          : "I will not seal this tablet now.",
    );
    // An oath to stand together asks for the envoy's word too, which it gives within its mandate, or beyond it.
    if (seal && (named !== null || proposal.allianceOath)) {
      speech.push("Swear to me that your lord's troops will stand with mine, as mine will stand with his.");
      reply.clauses.push(clause("askOath"));
    }
    if (seal) {
      r.trust += 0.1;
      // What we swore binds us from now, not from when we next read our tablets: this season's orders are still to come.
      r.treaty = true;
      if (proposal.allianceOath) r.allied = true;
      if (named !== null) r.against = named;
    }
  }

  // A plea for relief: a city of the sender's besieged by a third king, remembered so that our troops march to its relief
  // while it is fresh. A friend we would fight for hears that we will.
  // Every proposal and request the letter sets out in clauses is answered (item 8); a plea in words alone is read as words.
  answerLetter(view, b, brain, reply, (s) => speech.push(s));
  let answered = view.clauses.some((x) => x.kind === "askHelp");
  for (const [city, besieger] of answered ? [] : pleasIn(view.spoken, b, sender, me)) {
    brain.pleas.set(city, [sender, besieger, view.turn]);
    if (answered || !brain.isFriend(sender) || brain.betraying === sender || !(willing(b, brain, besieger, leader) || (r.allied && !brain.isFriend(besieger)))) continue;
    speech.push(`I have heard of the siege of ${Board.Map.get(city).name}. Where my troops can reach the troops of ${besieger}, they will drive them out.`);
    reply.clauses.push(clause("accept", { answers: "askHelp" }));
    answered = true;
  }

  speech.push(friend ? "Tell my brother that my love for him is great." : hostile ? "Tell your lord that I have not forgotten what he did." : "Tell your lord that I have heard his words.");
  if (friend) reply.clauses.push(clause("wellWishes"));
  else if (hostile) reply.clauses.push(clause("grievance"));
  speech.push(flavourOf(me, sender));

  // A gift to the messenger, to colour what he tells his lord.
  if (p.cunning > 0.6 && !friend && brain.spareGold > 150 && rng.chance(0.4 * p.cunning)) {
    reply.bribe = 30 + rng.range(0, 3) * 10;
    reply.bribeAsk = hostile ? "Tell your lord that my armies are few and my thoughts are of peace." : "Tell your lord that my armies are many and my friendship is worth keeping.";
    reply.bribeClauses = [clause("newsStrength", { power: me, amount: hostile ? 0 : 1 })];
    // The audience stays open for one more exchange, to offer more if the envoy refuses (see above).
    reply.end = false;
    brain.bribeOffered.set(view.audienceId, [reply.bribe, reply.bribeAsk]);
  }
  if (hostile && r.grudge > 3 && p.vengeance > 0.6 && rng.chance(0.5)) reply.detain = true;
  if (reliability(view.envoy) === 0 && count(b.v.court, (c) => c.status === "employed") < 3 && brain.spareGold > 200 && rng.chance(0.1 + 0.2 * p.cunning)) reply.jobOffer = 30;
  if (friend && view.goldWeighed >= 40 && brain.spareGold > 100 && p.generosity > 0.5) {
    reply.goldBack = idiv(idiv(view.goldWeighed, 4), 10) * 10;
    // Debased only for a friend we trust 0.3 or more, as for gifts (see compose).
    reply.goldBackPurity = p.honesty < 0.45 && r.trust >= 0.3 ? 75 : 100;
  }

  reply.speech = speech.filter((s) => s.length > 0).join(" ");
  return reply;
}
