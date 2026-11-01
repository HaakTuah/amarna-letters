/**
 * Orders for people and tablets: envoys, hires and spies, grants and seals, forgeries, captives, news and ransoms. Split from the order validator (validator.ts), which owns the season's checking state.
 */
import { newsOffered } from "./news.ts";
import { OrderValidator } from "./validator.ts";
import { roundEven, toInt } from "../core/num.ts";
import { isBlank } from "../core/text.ts";
import type { HireOrder, Order } from "../model/orders.ts";
import { coverOf, falseNameAt, hiddenAt } from "../model/people.ts";
import { AllPowers, claimedName, nameKnown } from "../model/power.ts";
import { grantLive } from "../model/authority.ts";
import { findCharacter } from "../model/state.ts";
import type { Checking } from "./validator-context.ts";

/** Why the order is refused, null if it stands, or undefined if it is not one of these. */
export function checkPeopleOrder(v: Checking, order: Order): string | null | undefined {
  const { S, Map, power, orders, assayed, roadsSet, busyCharacters, ransomed, renewed, hiredNow, dispatches, seekCount, counterIntel, heardFallen, nobody, covered, hireRefusal, errandRefusal, errandFits, spend, ownCharacter } = v;
  switch (order.type) {
    case "dispatch": {
      const d = order;
      const e = ownCharacter(d.envoy);
      if (e !== null) return e;
      if (d.to === power || heardFallen(d.to)) return `you cannot send an envoy to ${d.to}`;
      const fit = errandFits(d.envoy, "envoy", d.to);
      if (fit !== null) return fit;
      if (d.collect != null) {
        const debt = S.debts.find((x) => x.id === d.collect) ?? null;
        if (debt === null || debt.ended !== null || debt.holder !== power) return `you hold no tablet of a standing debt '${d.collect}' in your archive`;
      }
      // The advances of the offers it carries go with it.
      const carried = orders.filter((o): o is HireOrder => o.type === "hire" && o.via === d.envoy && hireRefusal(o)[0] === null).reduce((a, h) => a + Math.min(h.advance, h.fee), 0);
      if (dispatches >= S.config.maxDispatchesPerTurn) return `at most ${S.config.maxDispatchesPerTurn} envoys may leave in one season`;
      if (d.gold < 0) return "gold cannot be negative";
      if (d.purityPercent < 10 || d.purityPercent > 100) return "purity must be between 10 and 100 percent";
      if (d.copies && d.copies.length > 0)
        for (const id of d.copies) if (!S.copies.some((x) => x.id === id && x.holder === power)) return `you hold no tablet copy '${id}'`;
      // A claim to check (item 10): only that of a person at your court who says it is an envoy of the king written to.
      if (d.checkClaim != null) {
        const claimant = findCharacter(S, d.checkClaim);
        if (claimant === null || falseNameAt(claimant, power)?.employer !== d.to) return `nobody at your court says they are an envoy of ${d.to} by the id '${d.checkClaim}'`;
      }
      // The envoy's authority (item 9): provinces it names that the king no longer holds are left out by the engine.
      if (d.authority != null) {
        if (d.authority.maxGold < 0) return "the most gold an envoy may give cannot be negative";
        for (const id of [...d.authority.cede, ...d.authority.open]) if (!Map.exists(id)) return `there is no province called '${id}'`;
      }
      const fine = toInt(roundEven((d.gold * d.purityPercent) / 100.0));
      // The tablet's scribe, and the inventory's unless the gold goes without one (item 8), as the engine charges them.
      const fee = (d.proposal ? S.config.tabletFee : 0) + (d.gold > 0 && d.noInventory !== true ? S.config.inventoryFee : 0);
      return spend(fine + fee + carried);
    }

    case "release": {
      const c = findCharacter(S, order.character);
      if (c === null) return nobody(order.character);
      if (c.heldBy !== power) return `you are not holding ${c.name}`;
      if (busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
      return null;
    }

    case "seekCandidates":
      return seekCount > 0 ? "you had already asked for candidates that season" : null;

    case "hire": {
      const [e, c] = hireRefusal(order);
      if (e !== null) return e;
      if (hiredNow.has(c!.id)) return `${c!.name} was already offered a job by an earlier order`;
      // Item 11a: the advance is handed over when the job is agreed, so it is reserved now (carried abroad, with the envoy).
      return (order.via ?? null) !== null ? null : spend(Math.min(order.advance, order.fee));
    }

    case "dismiss":
      return ownCharacter(order.character, false);

    case "renew": {
      const rn = order;
      // Not a task: a servant may be renewed and sent on an errand in the same season.
      const c = findCharacter(S, rn.character);
      if (c === null) return nobody(rn.character);
      const cover = coverOf(c, power);
      if (cover === null && (c.employer !== power || !(c.status === "Employed" || c.status === "Captured"))) return `${c.name} is not in your service`;
      // A new job is offered at your court, where the man stands; a servant abroad whose fate this court has not heard
      // of counts as away.
      const home = cover === null && c.status === "Employed" && c.duty === "None" && c.at === power;
      if (!home) return `${c.name} is not at your court: a new job is offered where the man stands`;
      if (rn.fee <= 0 || rn.term <= 0) return "fee and term must be positive";
      if (rn.advance < 0 || rn.advance > rn.fee) return "the advance must be between nothing and the whole fee";
      const ee = errandRefusal(rn);
      if (ee !== null) return ee;
      if (renewed.has(c.id)) return `${c.name} was already renewed by an earlier order`;
      return spend(rn.advance);
    }

    case "check": {
      if (findCharacter(S, order.character) === null) return nobody(order.character);
      if (order.spend < 10) return "a background check costs at least 10 shekels";
      return spend(order.spend);
    }

    case "spy": {
      const ps = order;
      // In the rulebook's words: a spy must be one of your own people at your court, sent to watch a court or a province.
      const e = ownCharacter(ps.character);
      if (e !== null) return `a spy must be one of your own people at your court: ${e}`;
      const court = ps.court ?? null;
      const province = ps.province ?? null;
      if (court === null && province === null) return "a spy must be sent to watch a court or a province: you named neither";
      if (court !== null && province !== null) return "a spy must be sent to watch a court or a province: name only one";
      const sfit = errandFits(ps.character, "spy", court ?? province!);
      if (sfit !== null) return sfit;
      if (court !== null && (court === power || heardFallen(court))) return `you cannot spy on ${court}`;
      if (province !== null && (!Map.exists(province) || Map.get(province).isSea)) return `there is no province called '${province}'`;
      const stir = ps.stir ?? 0;
      if (stir < 0) return "the gold to stir a province cannot be negative";
      if (stir > 0 && province === null) return "a spy stirs the people of a province he watches: name a province, not a court";
      return stir > 0 ? spend(stir) : null;
    }

    case "recall": {
      const c = findCharacter(S, order.character);
      if (c === null || (c.employer !== power && !covered(c))) return `${order.character} is not in your service`;
      if ((coverOf(c, power)?.believed ?? c.duty) !== "SpyPosted") return `${c.name} is not on a mission`;
      if (busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
      return null;
    }

    case "counterIntel":
      if (counterIntel) return "you had already set your watch that season";
      return spend(order.spend);

    case "roads": {
      if (order.court === power || !AllPowers.includes(order.court) || heardFallen(order.court)) return `you cannot close or open your roads to '${order.court}'`;
      if (roadsSet.has(order.court)) return `you had already closed or opened your roads to ${order.court} that season`;
      const closed = (S.roadsClosed.tryGet(power) ?? []).includes(order.court);
      if (closed === order.close) return `your roads are already ${closed ? "closed" : "open"} to the people of ${order.court}`;
      return null;
    }

    case "claimName": {
      // Item 17+ ("A power's name is a claim"): any realm's name the map knows or a power claims.
      const known = nameKnown(order.name);
      if (known === null) return `there is no realm called '${order.name}' to claim the name of`;
      if (claimedName(power) === known) return `you already go by the name of ${known}`;
      return null;
    }

    case "revoke": {
      // Passage and basing granted on sealed tablets (item 9).
      if (!AllPowers.includes(order.grantee) || order.grantee === power) return `you granted nothing to '${order.grantee}'`;
      if (order.province !== null && !Map.exists(order.province)) return `there is no province called '${order.province}'`;
      // Only what it knows it granted: the tablet's copy is in its archive.
      const stands = S.grants.some(
        (g) =>
          g.grantor === power &&
          g.grantee === order.grantee &&
          grantLive(g, S.turn) &&
          (g.tabletId === "" || S.copies.some((k) => k.holder === power && k.tabletId === g.tabletId)) &&
          (order.province === null || g.province === order.province || (g.province === null && g.lands.includes(order.province))),
      );
      return stands ? null : `you have granted ${order.grantee} no passage or basing${order.province !== null ? ` in ${order.province}` : ""} that still stands`;
    }

    case "grant": {
      // Item 11a+: passage or basing granted by order.
      if (!AllPowers.includes(order.grantee) || order.grantee === power || heardFallen(order.grantee)) return `you cannot grant passage to '${order.grantee}'`;
      if (order.kind !== "passage" && order.kind !== "basing") return "grant passage or basing";
      if (order.province === null && order.kind === "basing") return "basing is granted in one city: name the province";
      if (order.province !== null && (!Map.exists(order.province) || Map.get(order.province).isSea || S.owner.getOrDefault(order.province, null) !== power)) return `you do not hold '${order.province}'`;
      if (order.seasons !== null && (!Number.isInteger(order.seasons) || order.seasons < 1)) return "say for how many seasons, or none for until revoked";
      return null;
    }

    case "repudiate": {
      const copy = S.copies.find((x) => x.id === order.copy && x.holder === power);
      const t = copy === undefined ? undefined : S.tablets.find((x) => x.id === copy.tabletId);
      if (t === undefined) return `you hold no tablet copy '${order.copy}'`;
      if (t.byHandOf !== power) return "only a tablet your own envoy sealed in your name can be repudiated as beyond his authority";
      if (t.repudiatedTurn !== null) return "you have already repudiated that tablet";
      return null;
    }

    case "assay":
      if (!S.treasuries.get(power).lots.some((l) => l.id === order.lot)) return `there is no unassayed gold '${order.lot}'`;
      if (assayed.has(order.lot)) return `gold lot ${order.lot} was already to be assayed by an earlier order`;
      return spend(S.config.assayFee);

    case "authenticate":
      if (!S.copies.some((x) => x.id === order.copy && x.holder === power)) return `you hold no tablet copy '${order.copy}'`;
      if (order.spend < 10) return "an examination costs at least 10 shekels";
      return spend(order.spend);

    case "steal": {
      // Item 10: a spy of yours posted at a court, which it watches, takes a tablet from its archive.
      // As for a recall: by what the court believes of its spy, so that a refusal never tells it what it has not heard.
      const c = findCharacter(S, order.character);
      if (c === null || (c.employer !== power && !covered(c))) return `${order.character} is not in your service`;
      if ((coverOf(c, power)?.believed ?? c.duty) !== "SpyPosted" || c.missionTarget === null) return `${c.name} is not watching a court for you`;
      if (busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
      return null;
    }

    case "gift": {
      // Item 10: a gift to a person at your court (a host's return gift, or a bribe).
      // Only someone the court sees standing there: a hidden spy is, to the court, nowhere.
      const c = findCharacter(S, order.character);
      if (c === null || c.status === "Dead" || c.at !== power || hiddenAt(c, power)) return `there is nobody at your court called '${order.character}'`;
      if (order.gold <= 0) return "name the gold to give";
      return spend(order.gold);
    }

    case "forge": {
      const e = ownCharacter(order.character);
      if (e !== null) return e;
      if (!order.seals || order.seals.length === 0) return "a forgery needs at least one seal";
      if (isBlank(order.text)) return "a tablet needs text";
      return spend(S.config.forgeFee);
    }

    case "captive": {
      const co = order;
      const c = findCharacter(S, co.character);
      if (c === null || c.status !== "Captured" || c.heldBy !== power) return `you hold no captive '${co.character}'`;
      // Item 10+b: a captive handed over travels under guard; it is nobody's to dispose of until it arrives.
      if (c.duty === "UnderGuard") return `${c.name} is on the road under guard and has not reached your court yet`;
      // Taking what it carries is no task: the captive's fate may be decided too (Haakon's answers to item 11a).
      if (co.fate === "TakePurse") return orders.some((o, i) => i < orders.indexOf(co) && o.type === "captive" && o.character === co.character && o.fate === "TakePurse") ? `you already take what ${c.name} carries` : c.purse + c.carriedFor > 0 || S.debts.some((d) => d.ended === null && d.holder === c.id && d.kept === "Person") ? null : `${c.name} carries nothing to take`;
      if (busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
      if (co.fate === "Ransom" && co.ransom <= 0) return "name a ransom";
      // Item 10: questioning costs what is spent on it; a captive is handed over to a living court other than one's own.
      if (co.fate === "Question") {
        if ((co.spend ?? 0) < 10) return "questioning costs at least 10 shekels";
        return spend(co.spend!);
      }
      if (co.fate === "HandOver") {
        const to = co.to ?? null;
        if (to === null || !AllPowers.includes(to) || to === power || heardFallen(to)) return `you cannot hand a captive over to '${to ?? ""}'`;
        return null;
      }
      return OrderValidator.captiveRefusal(S, c, co.fate);
    }

    case "buyNews": {
      // Item 11b: from a person at your court who offers news of another court.
      const c = findCharacter(S, order.character);
      if (c === null || c.status === "Dead" || c.at !== power || c.heldBy !== null || hiddenAt(c, power)) return `there is nobody at your court called '${order.character}'`;
      const n = newsOffered(S, c, power).find((x) => x.court === order.court) ?? null;
      if (n === null) return `${c.name} offers no news of ${order.court}`;
      return spend(n.price);
    }

    case "payRansom": {
      const c = findCharacter(S, order.character);
      if (c === null) return nobody(order.character);
      if (ransomed.has(c.id)) return `a ransom for ${c.name} is already on its way`;
      const [why, task] = OrderValidator.ransomRefusal(S, power, c);
      if (why !== null) return why;
      const error = spend(task!.spend);
      if (error === null) ransomed.add(c.id);
      return error;
    }
  }
  return undefined;
}
