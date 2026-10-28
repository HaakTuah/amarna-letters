/** The non-military half of a script king, second part: its people (court, spies, captives, evidence). */
import {
  clause,
  HSet,
  assay,
  authenticate,
  captive,
  check,
  cmpBool,
  cmpNum,
  cmpPower,
  cmpStr,
  count,
  counterIntel,
  desc,
  dismiss,
  forge,
  giftTo,
  handOver,
  hire,
  question,
  steal,
  parsePower,
  payRansom,
  placeSpy,
  recall,
  release,
  renew,
  roundEven,
  seekCandidates,
  sortBy,
  toInt,
  trimEnd,
  type CaptiveOrder,
  type Cmp,
  type CharacterView,
  type Order,
  type Power,
  type Rng,
  type TabletView,
} from "@amarna/engine";
import type { Board } from "./board.ts";
import { shekels, type Brain } from "./brain.ts";
import type { Personality } from "./personality.ts";

const Blemishes = ["Owes", "dismissed", "Took", "Abandoned", "forger", "fled", "Kept part", "secretly", "in the pay", "Was caught", "Turned back", "Posed as"];
/** What a court saw a person do well (item 10, "A name made of outcomes"). */
const Successes = ["Carried a mission", "Watched ", "Slipped out"];
/** What a court saw of a person's hand at slipping past guards. */
const Stealthy = ["Watched ", "Slipped out", "slipping in"];

/**
 * The script kings that leave item 10's people alone (`--no-people-play`, `--people-play-half`): they hire by price alone,
 * pick spies as before, never question, hand over or steal, and do nothing about false envoys. None by default.
 */
export const PeoplePlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The successes a court knows of a person: how a king who hires by name judges it. */
export function successes(c: CharacterView): number {
  return count(c.knownFacts, (f) => Successes.some((x) => f.startsWith(x)));
}

/** string.Contains(x, OrdinalIgnoreCase). */
function containsIgnoreCase(s: string, x: string): boolean {
  return s.toUpperCase().includes(x.toUpperCase());
}

/** How far a court trusts one of its people, from what it knows of them. */
export function reliability(c: CharacterView): number {
  return -count(c.knownFacts, (f) => Blemishes.some((x) => containsIgnoreCase(f, x)));
}

/** An inventory tablet that came with gold, brought by a foreign envoy or by our own from abroad. */
export function isInventory(t: TabletView): boolean {
  return t.source.startsWith("the inventory ");
}

/** The known facts that show a servant kept gold it carried: a theft found by inquiries, or a forged inventory exposed. */
const Thefts = ["Kept part of the gold", "Forged the inventory", "Exposed as the forger of an inventory"];

/** One of our people found keeping gold it carried (Brain.thieves), or whose known facts show it. */
function thief(brain: Brain, c: CharacterView): boolean {
  return brain.thieves.has(c.id) || c.knownFacts.some((f) => Thefts.some((x) => f.startsWith(x)));
}

/** The hiring test, for a new servant or one kept on: a wage the king's greed allows, with three seasons of it to spare. */
function wouldPay(p: Personality, wage: number, spare: number): boolean {
  return wage <= 15 + 25 * (1 - p.greed) && spare > wage * 3;
}

const byReliability = (brain: Brain): [(c: CharacterView) => unknown, Cmp<never>][] => [
  [(c: CharacterView) => reliability(c), desc(cmpNum)],
  [(c: CharacterView) => brain.provenLoyal.has(c.id), desc(cmpBool)],
  [(c: CharacterView) => c.id, cmpStr],
];

export function court(b: Board, brain: Brain, orders: Order[], busy: HSet<string>, rng: Rng): void {
  const p = brain.p;
  const v = b.v;
  let spare = brain.spareGold;
  let staff = v.court.filter((c) => c.status === "employed");
  const flow = v.income - v.upkeep - v.wages;
  // More people only while the treasury can carry their wages: a third or fourth servant only for a king with letters (or
  // plots) to fill it, and a surplus to match the size of his kingdom.
  const wanted = flow < 25 + 0.25 * v.income ? 2 : 2 + (p.diplomacy > 0.8 ? 1 : 0) + (p.cunning > 0.7 && flow > 50 + 0.25 * v.income ? 1 : 0);

  // A servant given up for lost: its line has read "has not returned" for three seasons and still does. It is dismissed, and
  // the court counts itself one short, so it may hire.
  for (const c of v.court.filter((c) => {
    const since = brain.missingSince.tryGet(c.id);
    return since !== undefined && v.turn - since >= 3;
  })) {
    orders.push(dismiss(c.id));
    busy.add(c.id);
    staff = staff.filter((x) => x.id !== c.id);
  }

  // A servant found keeping gold it carried is let go once it is back at court with nothing on its hands. Away, it is never
  // renewed.
  for (const c of v.court.filter((c) => c.ready && !busy.has(c.id) && thief(brain, c))) {
    orders.push(dismiss(c.id));
    busy.add(c.id);
    staff = staff.filter((x) => x.id !== c.id);
    brain.thieves.delete(c.id);
  }
  staff = staff.filter((c) => !(c.noticePrice !== null && thief(brain, c)));

  // A servant who has given notice is kept on at its price while the court still wants it and the price passes the hiring
  // test; the most reliable first. Otherwise it is let go. Never early.
  const leaving = sortBy(
    staff.filter((c) => c.noticePrice !== null),
    ...byReliability(brain),
  );
  let keeping = staff.length - leaving.length;
  for (const c of leaving) {
    if (keeping >= wanted || !wouldPay(p, c.noticePrice!, spare)) continue;
    orders.push(renew(c.id, c.noticePrice!, 6));
    keeping++;
  }

  if (staff.length < wanted && v.turn - brain.lastSeek >= 2 && spare > 40) {
    orders.push(seekCandidates());
    brain.lastSeek = v.turn;
  }

  // Item 10: a name made of outcomes is worth paying for, a dearer one by a shekel a season for each success known; a
  // credulous king also takes a person at its word, a careful one only at what it was seen to do.
  const careful = (p.caution + p.cunning) / 2 > 0.5;
  const people = PeoplePlay.on(b.me);
  const worth = (c: CharacterView): number =>
    !people ? c.askingPrice! : c.askingPrice! - 3 * successes(c) - (careful ? 0 : count(c.claims, (x) => /see what|miss nothing|slip past/.test(x)));
  const candidates = sortBy(
    v.known.filter((c) => c.status === "free" && c.pitch !== null && c.askingPrice !== null && c.claimsToServe === null && reliability(c) === 0 && !brain.heldElsewhere.has(c.id)),
    [(c: CharacterView) => worth(c), cmpNum],
    [(c: CharacterView) => c.id, cmpStr],
  );
  if (staff.length < wanted && candidates.length > 0) {
    const best = candidates[0];
    if (careful && !brain.checked.has(best.id) && spare > 30 + v.income / 2) {
      orders.push(check(best.id, 25));
      brain.checked.add(best.id);
      spare -= 25;
    } else if (wouldPay(p, best.askingPrice!, spare)) orders.push(hire(best.id, best.askingPrice!, 6));
  }

  // Assay gold from those we do not trust, or that weighed light.
  for (const lot of v.unassayedGold) {
    const r = brain.rel.tryGet(lot.from);
    const doubtful = r === undefined || r.trust < 0.3 || lot.weighed < lot.stated || p.greed > 0.6;
    if (doubtful && spare > 15) {
      orders.push(assay(lot.id));
      spare -= v.prices.get("assay");
    }
  }

  // Watchmen when spies have been caught lately, or for the careful and rich while spies are likely to come: to a leader, or
  // to a court attacked in the last three seasons.
  const spiedOn = b.leader() === b.me || [...brain.rel.values()].some((r) => r.lastAttackedUs >= v.turn - 3);
  if ((v.turn - brain.lastSpyCaught <= 3 || (p.caution > 0.7 && spare > 500 && spiedOn)) && spare > 40) {
    const spend = Math.trunc(20 + 30 * p.caution);
    orders.push(counterIntel(spend));
    spare -= spend;
  }

  // Examine evidence that would change what we believe of a friend.
  let examined = false;
  const examineSpend = Math.trunc(30 + 50 * p.caution);
  const examineFloor = 60 + 60 * (1 - p.caution);
  for (const t of v.tablets.filter((t) => t.source.startsWith("shown by") && t.authResult === null && !brain.authenticating.has(t.copyId))) {
    const touchesFriend = t.seals.some((s) => s !== b.me && brain.rel.has(s) && brain.isFriend(s));
    // Worth paying for only when it could turn us against a friend (gold spent here is score lost).
    if (touchesFriend && spare > examineFloor) {
      orders.push(authenticate(t.copyId, examineSpend));
      brain.authenticating.add(t.copyId);
      spare -= examineSpend;
      examined = true;
      break;
    }
    // Until examined, half-believe it.
    for (const accused of t.seals.filter((s) => s !== b.me && brain.rel.has(s))) brain.rel.get(accused).trust -= 0.1 * (1 - p.caution);
    brain.authenticating.add(t.copyId);
  }

  // The inventories that came with gold, by the same caution rule, at most one examination a season in all (see the C# notes
  // in the design notes: light lots half the time with 40 shekels more, doubted courts a tenth more often, others now and then).
  if (!examined) {
    for (const t of sortBy(
      v.tablets.filter((t) => isInventory(t) && t.authResult === null && !brain.authenticating.has(t.copyId)),
      [(t: TabletView) => t.sealedTurn, desc(cmpNum)],
      [(t: TabletView) => t.copyId, cmpStr],
    )) {
      if (spare <= examineFloor + 2 * examineSpend) break;
      brain.authenticating.add(t.copyId);
      const light = shekels(t.text.slice(t.text.lastIndexOf(":") + 1)) % 10 !== 0;
      const doubted = t.seals.some((s) => {
        if (s === b.me) return false;
        const rs = brain.rel.tryGet(s);
        return rs !== undefined && rs.trust < 0.3;
      });
      if (!rng.chance(0.02 + 0.05 * p.caution + (light ? 0.5 : 0) + (doubted ? 0.1 : 0))) continue;
      const spend = examineSpend + (light ? 40 : 0);
      orders.push(authenticate(t.copyId, spend));
      spare -= spend;
      break;
    }
  }

  const ready = sortBy(
    v.court.filter((c) => c.ready && !busy.has(c.id)),
    ...byReliability(brain),
  );
  const leader = b.leader();

  // Spies come home from a court that has fallen, or, when nobody is left at court to send, from a court watched for eight
  // seasons that is no longer the war, the leader or hostile.
  for (const [id, [post, since]] of sortBy([...brain.posted], [(x: [string, [string, number]]) => x[0], cmpStr])) {
    const watched = parsePower(post);
    if (busy.has(id) || brain.recalled.has(id) || watched === null) continue;
    const wr = brain.rel.tryGet(watched);
    const stale = ready.length === 0 && v.turn - since >= 8 && watched !== brain.warTarget && watched !== leader && !(wr !== undefined && wr.hostile);
    if (!v.fallen.includes(watched) && !stale) continue;
    orders.push(recall(id));
    busy.add(id);
    brain.recalled.add(id);
  }

  // A spy at the court that matters most, if we have someone to spare.
  if (p.cunning > 0.55 && ready.length >= 2 && spare > 120 && rng.chance(p.cunning * 0.35)) {
    const target: Power | null =
      brain.warTarget ??
      (leader !== b.me ? leader : null) ??
      sortBy([...b.neighbours()], [(x: Power) => brain.hostility(x, b), desc(cmpNum)])[0] ??
      null;
    if (target !== null) {
      // The one the court has seen slip past guards, else the least trusted (item 10: a name made of outcomes).
      const stealth = (c: CharacterView): number => count(c.knownFacts, (f) => Stealthy.some((x) => f.includes(x)));
      const best = sortBy([...ready], [(c: CharacterView) => stealth(c), desc(cmpNum)])[0];
      const agent = people && stealth(best) > 0 ? best : ready[ready.length - 1];
      ready.splice(ready.indexOf(agent), 1);
      ready.push(agent);
      orders.push(placeSpy(agent.id, target));
      busy.add(agent.id);
      ready.pop();
    }
  }

  // A forged tablet to turn the leader's friends against him.
  if (p.cunning > 0.7 && p.honesty < 0.4 && leader !== null && leader !== b.me && ready.length >= 2 && spare > 100 && rng.chance(0.15)) {
    const top = leader;
    const friendOfTop = sortBy(
      [...b.alive].filter((x) => x !== b.me && x !== top),
      [(x: Power) => brain.rel.get(x).trust, cmpNum],
    )[0];
    const nb = [...b.neighbours()];
    const victim =
      sortBy(
        [...b.alive].filter((x) => x !== b.me && x !== top && x !== friendOfTop),
        [(x: Power) => nb.includes(x), desc(cmpBool)],
        [(x: Power) => x, cmpPower],
      )[0] ?? null;
    // The most reliable servant whose hand has not already botched a forgery (see Brain.noHand).
    const forger = ready.find((c) => !brain.noHand.has(c.id));
    if (victim !== null && forger !== undefined) {
      orders.push({ ...forge(forger.id, `${top} swears to ${friendOfTop}: when the harvest is in, we shall march together against ${victim} and divide its land.`, [top, friendOfTop]), clauses: [clause("against", { power: victim })] });
      busy.add(forger.id);
    }
  }

  // Captives: the honest ransom, the cunning turn, the vengeful execute.
  const captives = v.known.filter((c) => c.status === "your captive");
  for (const gone of [...brain.ransomAsked.keys()].filter((id) => captives.every((c) => c.id !== id))) brain.ransomAsked.delete(gone);
  for (const c of captives) {
    // Nobody left to pay or to deceive, or a ransom twice lapsed unpaid: the captive is worth nothing kept, so it goes free,
    // unless the king is vengeful. A spy of a sworn ally goes free too: the alliance is worth more than a ransom.
    const lordFallen = c.employer !== null && v.fallen.includes(c.employer);
    const worthless = brain.unclaimed.has(c.id) || brain.ransomLapsed.getOrDefault(c.id, 0) >= 2 || lordFallen;
    const mr = c.employer !== null ? brain.rel.tryGet(c.employer) : undefined;
    const ally = mr !== undefined && mr.allied && mr.oathsBroken === 0;
    // First, what it knows (item 10, "What servants know"): a captive still worth something is questioned once, if the
    // treasury can spare it.
    // Gold spent is score lost: worth it only against a king the court is at odds with, whose secrets matter to it.
    const atOdds = mr !== undefined && (mr.hostile || c.employer === brain.warTarget);
    if (people && atOdds && !worthless && !ally && !brain.questioned.has(c.id) && spare > 150) {
      const spend = Math.trunc(30 + 40 * p.cunning);
      orders.push(question(c.id, spend));
      brain.questioned.add(c.id);
      spare -= spend;
      continue;
    }
    if (worthless || ally) {
      // A captive nobody will pay for is a gift to a sworn ally whose foe its lord is (item 10: captives change hands like
      // any good), else it goes free, unless the king is vengeful.
      const foe = c.employer !== null && !lordFallen && !ally ? brain.rel.tryGet(c.employer) : undefined;
      const friend = foe !== undefined && foe.hostile ? sortBy([...b.alive].filter((x) => x !== b.me && x !== c.employer && brain.rel.tryGet(x)?.allied === true), [(x: Power) => x, cmpPower])[0] : undefined;
      if (people && friend !== undefined && !brain.handedOver.has(c.id)) {
        orders.push(handOver(c.id, friend));
        brain.handedOver.add(c.id);
        continue;
      }
      orders.push(captive(c.id, worthless && p.vengeance > 0.75 ? "Execute" : "Release"));
      continue;
    }
    // An envoy our besiegers caught was no spy at a post: it cannot be turned, so the cunning ransom it instead.
    const fate: CaptiveOrder =
      p.cunning > 0.65 && !c.intercepted
        ? captive(c.id, "Turn", 0, `The armies of ${b.me} are scattered and tired; they will not march this year.`)
        : p.cunning > 0.65
          ? captive(c.id, "Ransom", Math.trunc(60 + 60 * p.greed))
          : p.vengeance > 0.75
            ? captive(c.id, "Execute")
            : p.honesty > 0.5 || p.greed > 0.5
              ? captive(c.id, "Ransom", Math.trunc(60 + 60 * p.greed))
              : captive(c.id, "Release");
    if (fate.fate === "Ransom") {
      // A demand stands until it is paid or lapses: asking again would only replace it. In case the word that it lapsed
      // never comes, it asks again after six seasons.
      const lapsed = v.inbox.some((i) => i.kind === "Notice" && i.subject === c.id && i.title === "No ransom came");
      const asked = brain.ransomAsked.tryGet(c.id);
      if (asked !== undefined && !lapsed && v.turn - asked < 6) continue;
      brain.ransomAsked.set(c.id, v.turn);
    }
    orders.push(fate);
  }

  // A person at court who says it is the envoy of a king, with no letter (item 10, false envoys): a careful king has it
  // looked into before giving anything; a trusting one gives a host's gift to the envoy of a friend.
  for (const c of v.known.filter((c) => people && c.claimsToServe !== null && !brain.hosted.has(c.id))) {
    brain.hosted.add(c.id);
    const r = brain.rel.tryGet(c.claimsToServe!);
    if (careful) {
      if (spare > 40) {
        orders.push(check(c.id, 30));
        spare -= 30;
      }
    } else if (r !== undefined && !r.hostile && spare > 100) {
      const gift = Math.trunc(10 + 20 * (1 - p.greed));
      orders.push(giftTo(c.id, gift));
      spare -= gift;
    }
  }

  // A spy at the court of the war or the leader takes a tablet from its archive now and then (item 10: tablets are taken,
  // not only copied), for the cunning: it leaves that court without the tablet as proof of what it agreed.
  if (people && p.cunning > 0.6)
    for (const [id, [post]] of sortBy([...brain.posted], [(x: [string, [string, number]]) => x[0], cmpStr])) {
      const watched = parsePower(post);
      if (busy.has(id) || brain.recalled.has(id) || watched === null || v.fallen.includes(watched)) continue;
      // Only at the court of the war: a spy caught there is a spy lost where it matters most, so it steals only there.
      if (watched !== brain.warTarget) continue;
      if (v.turn - brain.lastSteal.getOrDefault(id, -99) < 4 || !rng.chance(0.4 * p.cunning)) continue;
      orders.push(steal(id));
      busy.add(id);
      brain.lastSteal.set(id, v.turn);
    }

  // Envoys we hold go home once the point is made: one whose king has fallen, or dismissed it, too.
  for (const c of v.known.filter((c) => c.heldByYou && c.status !== "your captive")) {
    let since = brain.heldSince.tryGet(c.id);
    if (since === undefined) brain.heldSince.set(c.id, (since = v.turn));
    if (v.turn - since >= toInt(roundEven(1 + 3 * p.vengeance))) {
      orders.push(release(c.id, "Go, and tell your lord to mind his manners with a Great King."));
      brain.heldSince.delete(c.id);
    }
  }

  // Our own people held abroad.
  const pay = "order pay_ransom for ";
  for (const item of v.inbox.filter((i) => i.kind === "Rumor" && i.body.includes(pay))) {
    const id = trimEnd(item.body.slice(item.body.indexOf(pay) + pay.length), "). ");
    if (p.honesty >= 0.3 && spare > 150) orders.push(payRansom(id));
  }
  brain.spareGold = spare;
}
