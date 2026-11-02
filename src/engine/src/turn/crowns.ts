/**
 * A vassal king by grant (build order item 17++, "Governors": "A king may also make a governor, or any character, a vassal
 * king over the provinces he holds, by a grant under oath"). The king names the man, the provinces, the tribute and the
 * price; the word reaches the man at his seat; he takes it or not by his stakes (a script by his traits, a model for
 * himself, the "Crown" request); if he takes it, the land becomes his, a power of his own bound to the king by a vassal
 * tablet like any other (item 11+), and the price he pays travels to the king with his answer. Whether a grant pays is the
 * king's own sum: no rule of its own.
 */
import { idiv } from "../core/num.ts";
import { clause } from "../model/clauses.ts";
import { newCrown, newCrownView, seatOf, type Crown } from "../model/command.ts";
import { toFigures } from "../model/counts.ts";
import { newMindRequest } from "../model/exchanges.ts";
import type { CrownOrder } from "../model/orders.ts";
import { remember, spend, type Character } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import { newTablet, newTabletCopy } from "../model/records.ts";
import { findCharacter, isAlive, logEvent, newId, notify } from "../model/state.ts";
import { renderClauses } from "../rules/clauses.ts";
import { wordFromKing } from "../rules/court.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** A king's grant of kingship sets out to the man at his seat. */
    grantCrown(p: Power, o: CrownOrder): void;
    /** As a season begins: grants reach their men, answers are taken, and prices reach their kings. */
    crownsSeason(): void;
  }
}

const P = TurnEngine.prototype;

P.grantCrown = function (p, o) {
  const S = this.s;
  const c = findCharacter(S, o.character);
  if (c === null) return;
  const held = S.governors.find((g) => g.character === c.id && g.power === p && g.relieved === null && o.provinces.includes(seatOf(g)));
  const seat = held !== undefined ? seatOf(held) : o.provinces[0];
  const seasons = wordFromKing(S, this.map, p, seat);
  const arrives = S.turn + Math.max(1, Number.isFinite(seasons) ? seasons : 1);
  S.crowns.push(newCrown({ id: newId(S, "kg"), power: p, character: c.id, provinces: [...o.provinces], seat, tribute: o.tribute, price: o.price, arrives }));
  // One at court sets out with the word to the land he is offered.
  if (held === undefined) {
    c.duty = "Governing";
    c.at = null;
    c.grantedBy = p;
    c.watchProvince = seat;
  }
  const lands = o.provinces.map((x) => this.map.get(x).name).join(", ");
  notify(S, p, "Resolution", "A kingship offered", `Word that you would make ${c.name} king of ${lands} under oath, as your vassal, for ${o.tribute} shekels of tribute a year${o.price > 0 ? ` and a price of ${o.price} shekels` : ""}, reaches him at ${this.map.get(seat).name} in turn ${arrives}; his answer comes back by the same road.`, c.id);
  logEvent(S, "crown", `${p} offered ${c.name} the kingship of ${lands}.`, [p], "crown");
};

/**
 * Whether a script man takes a kingship (by his traits, "Skills set the odds; the character decides"): only if he can pay
 * the price and the land yields the tribute; an ambitious man takes any such crown, any other one that leaves him half the
 * land's yield. First guesses, for item 18.
 */
function wantsCrown(c: Character, k: Crown, yearly: number): boolean {
  if (c.purse < k.price || k.tribute + idiv(k.price, 4) > yearly) return false;
  return c.traits.ambition >= 30 || k.tribute * 2 <= yearly;
}

/** The terms a script man would take a kingship on, by the same sums as `wantsCrown`, in his words (empty: none would do). */
function crownTerms(c: Character, k: Crown, yearly: number): string {
  if (c.purse < k.price) return k.price > 0 ? `I cannot pay a price of ${k.price} shekels; ask ${Math.floor(c.purse / 5) * 5} or less.` : "";
  const most = Math.floor(Math.min(yearly - idiv(k.price, 4), c.traits.ambition >= 30 ? yearly : idiv(yearly, 2)) / 5) * 5;
  return most > 0 ? `I would take it for ${most} shekels of tribute a year.` : "";
}

/** Whether a grant can still be carried out: the man alive and the king's, every province still the king's. */
function stands(e: TurnEngine, k: Crown, c: Character | null): boolean {
  const S = e.s;
  if (c === null || c.status === "Dead" || c.status === "Captured" || !isAlive(S, k.power)) return false;
  if (c.grantedBy !== k.power && c.employer !== k.power) return false;
  return k.provinces.every((x) => S.owner.getOrDefault(x, null) === k.power);
}

P.crownsSeason = function () {
  const S = this.s;
  for (const k of [...S.crowns]) {
    const c = findCharacter(S, k.character);
    const lands = k.provinces.map((x) => this.map.get(x).name).join(", ");
    // His price, carried with his answer, reaches the king.
    if (k.paidArrives !== null && S.turn >= k.paidArrives) {
      if (k.price > 0 && isAlive(S, k.power)) {
        S.treasuries.get(k.power).gold += k.price;
        notify(S, k.power, "Notice", "A kingship's price", `The ${k.price} shekels ${c?.name ?? "your new vassal"} paid for the kingship of ${lands} reached your treasury.`);
      }
      k.paidArrives = null;
    }
    // Settled: kept, as its king knows it, until word of how it ended reaches his court; taken, his copy of the oath with it.
    if (k.heard !== null && S.turn >= k.heard && k.tablet !== "") {
      if (isAlive(S, k.power)) S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: k.tablet, holder: k.power, acquiredTurn: S.turn, source: "sealed at the grant of a kingship" }));
      k.tablet = "";
    }
    if (k.heard !== null) {
      if (S.turn >= k.heard && k.paidArrives === null) S.crowns = S.crowns.filter((x) => x !== k);
      continue;
    }
    if (S.turn < k.arrives) continue;
    if (c === null || !stands(this, k, c)) {
      k.heard = this.heardAt(k.power, k.seat);
      if (c !== null && c.duty === "Governing" && !S.governors.some((g) => g.character === c.id)) this.leaveCommand(c, k.seat);
      if (isAlive(S, k.power)) this.tell(k.power, k.seat, "Rejected", "A kingship not given", `The kingship of ${lands} you offered ${c?.name ?? "your man"} could not be given: ${c === null || c.status === "Dead" || c.status === "Captured" ? "he is gone" : "the land, or the man, is no longer yours to give"}.`);
      continue;
    }
    if (k.answered === null) {
      // The word reaches him: his traits answer now; a model gives its own answer before the next season.
      // What the land yields as he can know it (hidden information): a governor of all of it what passed through his hands;
      // anyone else what the king's stewards report of it, to two figures.
      const raw = 4 * k.provinces.reduce((a, x) => a + this.effectiveYield(x), 0);
      const governsAll = k.provinces.every((x) => S.governors.some((g) => g.character === c.id && g.power === k.power && g.province === x));
      const yearly = governsAll ? raw : toFigures(raw, 2);
      k.answered = S.turn;
      k.accept = wantsCrown(c, k, yearly);
      // Refusing, a script man names the terms he would take (a model gives its own words before the next season).
      k.terms = k.accept ? "" : crownTerms(c, k, yearly);
      logEvent(S, "crown", `${c.name} was offered the kingship of ${lands} by ${k.power}.`, [], k.accept ? "crown-would" : "crown-asked");
      this.mindRequests.push(
        newMindRequest({
          id: newId(S, "r"),
          task: "Crown",
          characterId: c.id,
          court: null,
          crown: newCrownView({
            crownId: k.id,
            turn: S.turn,
            from: k.power,
            lands: k.provinces.map((x) => this.map.get(x).name),
            seat: this.map.get(k.seat).name,
            governs: S.governors.some((g) => g.character === c.id && g.power === k.power),
            tribute: k.tribute,
            price: k.price,
            purse: c.purse,
            yearly,
          }),
        }),
      );
      continue;
    }
    if (S.turn <= k.answered) continue;
    if (!k.accept || c.purse < k.price) {
      k.heard = this.heardAt(k.power, k.seat);
      remember(c, S.turn, `The king of ${k.power} offered me the kingship of ${lands} under oath; I would not take it.`);
      this.tell(k.power, k.seat, "Rejected", "A kingship refused", `${c.name} would not take the kingship of ${lands} on your terms.${k.terms !== "" ? ` His answer: "${k.terms}"` : ""}`);
      // Its king learns of it from the notice the road brings (hidden information); the event is the god view's.
      logEvent(S, "crown", `${c.name} refused the kingship of ${lands} offered by ${k.power}.`, [], "crown-refused");
      if (!S.governors.some((g) => g.character === c.id)) this.leaveCommand(c, k.seat);
      continue;
    }
    this.crowned(k, c, lands);
  }
};

/** He takes it: the land is his, a power bound by its vassal tablet, and his price sets out to the king. */
TurnEngine.prototype.crowned = function (k: Crown, c: Character, lands: string) {
  const S = this.s;
  const price = spend(c, k.price);
  const own = this.ruleOwn(k.seat, c, {
    how: "granted",
    from: k.power,
    followers: [],
    gold: 0,
    rising: false,
    story: `The king of ${k.power} made you king of ${lands} under oath, as his vassal, and you took it${price > 0 ? `, paying ${price} shekels` : ""}.`,
    memory: `The king of ${k.power} made me king of ${lands} under oath, and I took it${price > 0 ? ` for ${price} shekels` : ""}.`,
    line: `${c.name} became king of ${lands} by a grant of ${k.power}, as its vassal`,
    bound: `You are ${k.power}'s vassal by your oath, sealed on a tablet: ${k.tribute} shekels of tribute a year, your service, and his protection. Sending the tribute is yours to order, as keeping any promise is; others will hear if you do not.`,
  });
  for (const x of k.provinces.filter((y) => y !== k.seat)) this.joinRealm(x, c, own);
  // His realm starts with all of it: growth is reckoned from there.
  S.startStrength.set(own, this.strength(own));
  // The oath, a vassal tablet like any other, sealed by both, a copy in each archive.
  const clauses = [clause("tribute", { amount: k.tribute }), clause("serve"), clause("askProtect")];
  const t = newTablet({ id: newId(S, "t"), text: renderClauses(clauses, own, k.power), proposedBy: own, partner: k.power, seals: [own, k.power], createdTurn: S.turn, sealedTurn: S.turn, vassal: own, clauses });
  S.tablets.push(t);
  // His copy is in his archive at once; the king's rides home with the answer (hidden information).
  S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: t.id, holder: own, acquiredTurn: S.turn, source: "sealed at the grant of a kingship" }));
  k.tablet = t.id;
  k.price = price;
  k.heard = this.heardAt(k.power, k.seat);
  // His price rides home with his answer: it reaches the treasury as word of it does.
  k.paidArrives = k.heard;
  this.tell(k.power, k.seat, "Resolution", "A kingship taken", `${c.name} took the kingship of ${lands} under oath: ${own} is your vassal now, its tablet sealed for ${k.tribute} shekels of tribute a year${price > 0 ? `; the ${price} shekels he paid are on the road to you` : ""}.`);
  // The new king's own; the granting king learns of it from the notice the road brings (hidden information).
  logEvent(S, "crown", `${c.name} took the kingship of ${lands} from ${k.power}.`, [own], "crown-taken");
};

declare module "./core.ts" {
  interface TurnEngine {
    crowned(k: Crown, c: Character, lands: string): void;
  }
}
