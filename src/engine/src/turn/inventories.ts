/**
 * Inventory tablets: gold an envoy carries comes with an inventory sealed by the court that sent it, which the receiving
 * court keeps in its archive. An envoy that kept some of the gold may swap the inventory for one it forges, stating only
 * what is left, under the forgery rules: it needs the forger's skill, and is found out only when the tablet is examined.
 */
import { clamp } from "../core/num.ts";
import { newFact, remember, type Character } from "../model/people.ts";
import { AllPowers, land, type Power } from "../model/power.ts";
import { newTablet, newTabletCopy, type PendingAudience, type Tablet, type TabletCopy } from "../model/records.ts";
import { alive, char, logEvent, newId } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    canForge(c: Character): boolean;
    swaps(c: Character, kept: number, carried: number, swap: boolean): boolean;
    inventoryStated(a: PendingAudience, skim: number, swap: boolean): number;
    inventory(envoy: Character, sealer: Power, receiver: Power, stated: number, sealedTurn: number, forged: boolean, source: string): TabletCopy;
    swapInventory(c: Character, sealer: Power, receiver: Power, kept: number, left: number, swap: boolean): string | null;
    inventoryExposed(examiner: Power, tablet: Tablet, forger: Character): string;
  }
}

const P = TurnEngine.prototype;

/**
 * Whether a character believes its hand can fake a seal (item 10, "Seeing oneself"): it tries only then. How well the
 * forgery passes is its true forging skill.
 */
P.canForge = function (c) {
  return c.belief.forge >= this.s.config.forgeMinCompetence;
};

/**
 * Whether an envoy that chose to swap the inventory really does: it kept some of the gold but not all of it (a forgery
 * stating nothing would hide nothing), and it has the skill.
 */
P.swaps = function (c, kept, carried, swap) {
  return swap && kept > 0 && kept < carried && this.canForge(c);
};

/** What the inventory a host is shown states: what was sent, or, if the envoy swapped it, what its forgery states. */
P.inventoryStated = function (a, skim, swap) {
  // Gold sent without an inventory (item 8): there is nothing to weigh it against, so what is found is all anyone knows.
  if (!a.dispatch.inventory) return this.weighed(a, skim);
  return this.swaps(char(this.s, a.envoyId), clamp(skim, 0, a.dispatch.gold), a.dispatch.gold, swap) ? this.weighed(a, skim) : a.dispatch.gold;
};

/**
 * The inventory of the gold an envoy brings, put in the receiving court's archive: sealed by the court that sent the gold,
 * dated when it was sealed, or the envoy's forgery stating less.
 */
P.inventory = function (envoy, sealer, receiver, stated, sealedTurn, forged, source) {
  const S = this.s;
  const tablet = newTablet({
    id: newId(S, "t"),
    text: `The inventory of the gold ${sealer} sends to ${receiver}: ${formatMoney(stated)}.`,
    proposedBy: sealer,
    seals: [sealer],
    createdTurn: sealedTurn,
    sealedTurn,
    inventory: true,
    forged,
    forgerId: forged ? envoy.id : null,
    forgerEmployer: forged ? envoy.employer : null,
    forgerSkill: forged ? envoy.skills.forge : 0,
  });
  S.tablets.push(tablet);
  const copy = newTabletCopy({ id: newId(S, "k"), tabletId: tablet.id, holder: receiver, acquiredTurn: S.turn, source });
  S.copies.push(copy);
  return copy;
};

/**
 * What an envoy that kept some of the gold and chose to swap the inventory remembers: the swap, with the secret it leaves
 * (a deep one, as for a forgery), or that it handed over the true inventory, having kept it all or lacking the hand.
 * `left`: what is left of the gold after what it kept: what its forgery states. Returns the outcome for the record of the
 * mission, or null if it did not swap.
 */
P.swapInventory = function (c, sealer, receiver, kept, left, swap) {
  const S = this.s;
  if (!swap || kept <= 0) return null;
  if (left <= 0) {
    remember(c, S.turn, `I kept all the gold ${land(sealer)} sent; with nothing left to weigh, a forged inventory could hide nothing, so the true one was handed over.`);
    return null;
  }
  if (!this.canForge(c)) {
    remember(c, S.turn, `I meant to put a forged inventory in place of the one ${land(sealer)} sealed, but my hand could not fake the seal; I handed over the true one.`);
    return null;
  }
  remember(c, S.turn, `I put an inventory I forged myself, stating ${formatMoney(left)}, in place of the one ${land(sealer)} sealed, so that nobody would miss the gold I kept.`);
  c.facts.push(newFact({ id: newId(S, "f"), text: `Forged the inventory of the gold ${land(sealer)} sent to ${land(receiver)}, to hide what was kept.`, secrecy: "Deep", tag: "inventory-forgery" }));
  logEvent(S, "inventory-swapped", `${c.name} swapped the inventory of the gold ${sealer} sent to ${receiver} for a forgery stating ${formatMoney(left)}.`, [], "inventory-swapped");
  return `replaced the inventory with a forgery stating ${left} shekels`;
};

/**
 * A forged inventory found out and traced, as a forgery is: to the hand of the envoy who brought it. Every court hears it,
 * and the envoy is known for it.
 */
P.inventoryExposed = function (examiner, tablet, forger) {
  const S = this.s;
  const bearer = `${forger.name}${tablet.forgerEmployer !== null ? `, envoy of ${tablet.forgerEmployer},` : ""}`;
  for (const p of AllPowers) forger.reputation.set(p, forger.reputation.getOrDefault(p, 0) - 30);
  forger.facts.push(
    newFact({
      id: newId(S, "f"),
      text: `Exposed as the forger of an inventory of gold bearing the seal of ${tablet.seals.map((x) => land(x)).join(" and ")}.`,
      secrecy: "Public",
      tag: "forger",
    }),
  );
  for (const p of alive(S).filter((p) => p !== examiner))
    this.rumor(p, examiner, `The scribes of ${examiner} declare that the inventory of gold bearing the seal of ${tablet.seals.join(" and ")}, brought by ${bearer} was forged by ${forger.name}.`);
  logEvent(S, "forgery-exposed", `${examiner} publicly traced a forged inventory to ${forger.name}.`, null, "forgery-exposed");
  return ` The scribes trace it to the hand of ${forger.name}, who brought it.`;
};
