/** What an order says: its words as a refusal or a log shows them, the unit and the character it names, and its equality. */
import { isBlank } from "../core/text.ts";
import { workLevelText, workName } from "./works.ts";
import { mandateText } from "./command.ts";
import type { HireOrder, RenewOrder, Order } from "./orders.ts";
import { WorldMap } from "./map.ts";
import { AllPowers, powerName, whose } from "./power.ts";

/** A name the order left blank, as a refusal shows it. */
function named(s: string | null | undefined): string {
  return isBlank(s) ? "?" : s;
}

/** The order in a line, as reports and refusals show it (Order.Describe). */
export function describe(o: Order): string {
  switch (o.type) {
    case "command":
      return `grant ${o.character} the command of ${o.unit}`;
    case "relieve":
      return `take back the command of ${o.unit}`;
    case "supply":
      return `${o.unit} ${o.buy ? "buys" : "takes"} its food where it stands by leave${o.gold > 0 ? `, sent ${o.gold} shekels for it` : ""}`;
    case "mandate":
      return o.mandate === null ? `clear the mandate of ${o.unit}` : `give ${o.unit} the mandate: ${mandateText(o.mandate)}`;
    case "govern":
      return `grant ${o.character} the governorship of ${named(o.province)}${o.levies > 0 ? `, to raise up to ${o.levies} levies there if foreign troops threaten it` : ""}`;
    case "unseat":
      return `take back the governorship of ${named(o.province)}`;
    case "crown":
      return `grant ${o.character} the kingship of ${o.provinces.map(named).join(", ")} under oath as your vassal, for ${o.tribute} shekels of tribute a year${o.price > 0 ? ` and a price of ${o.price} shekels` : ""}`;
    case "court":
      return `set out with the court for ${named(o.to)}`;
    case "enlist":
      return `offer the chief of the band in ${named(o.province)} ${o.fee} shekels for his band to serve as your army for ${o.term} seasons`;
    case "payOff":
      return `offer the chief of the band in ${named(o.province)} ${o.fee} shekels to leave your land and keep out of it for ${o.term} seasons`;
    case "hold":
      return `${o.unit} holds`;
    case "move":
      return `${o.unit} -> ${named(o.to)}${o.forced === true ? " (forced march)" : ""}`;
    case "support":
      return o.to === null || o.to === undefined ? `${o.unit} supports ${named(o.supported)} holding` : `${o.unit} supports ${named(o.supported)} -> ${o.to}`;
    case "convoy":
      return `${o.unit} convoys ${named(o.army)} -> ${named(o.to)}`;
    case "besiege":
      return `${o.unit} besieges the city`;
    case "unreadable":
      return o.text;
    case "build":
      return `keep the ${workName(o.kind)} of ${named(o.province)} at ${workLevelText(o.kind, o.level)}, ${o.labour ? (o.share != null ? `by a corvée of ${o.share}% of the men at home` : "by corvée") : "paid in gold"}`;
    case "raze":
      return `${o.unit} razes a level of the ${workName(o.kind)} where it stands`;
    case "sally":
      return `the walls of ${named(o.city)} sally in support of the attack from ${named(o.from)}`;
    case "sell":
      return `sell ${o.amount} measures of grain from the stores of ${named(o.province)}`;
    case "purchase":
      return `buy ${o.amount} measures of grain at the market of ${named(o.province)}`;
    case "feed":
      return `hand ${o.amount} measures of grain to the town of ${named(o.province)}${o.own === true ? ", in your own name" : ""}`;
    case "send":
      return `send ${o.gold} shekels with your couriers to the coffer of ${named(o.province)}`;
    case "caravan":
      return `send a caravan with ${o.amount} measures of grain from ${named(o.from)} to ${named(o.to)}`;
    case "trade":
      return `send a caravan${o.sneak ? ", smuggling," : ""} with ${o.grain} measures of grain and ${o.gold} shekels from ${named(o.from)} to trade at ${named(o.to)}`;
    case "ship":
      return `load the fleet in ${o.fleet} with ${o.grain} measures of grain and ${o.gold} shekels at ${named(o.from)} and sail to ${o.trade ? "trade at" : "deliver to"} ${named(o.to)}`;
    case "toll":
      return `set a toll of ${o.percent}% on ${o.partner === null ? "everyone's" : whose(o.partner)} goods entering ${o.province === null ? "your land" : named(o.province)}`;
    case "welcome":
      return `settle the loose men in ${named(o.province)}`;
    case "deport":
      return `deport ${o.number} people from ${named(o.province)} to ${named(o.to)}${o.purse ? " with their share of the purse" : ""}`;
    case "expel":
      return `put ${o.percent}% of the mouths of ${named(o.province)} out of the city`;
    case "returnRunaways":
      return `send ${whose(o.to)} runaways in ${named(o.province)} back to ${powerName(o.to)}`;
    case "raise":
      return `raise ${o.kind === "Army" ? "army" : "fleet"} in ${o.province}${o.share != null ? ` of ${o.share}% of its men of fighting age` : o.men != null ? ` of ${o.men} men` : ""}`;
    case "disband":
      return o.settle === true ? `disband ${o.unit} and settle its men there as colonists` : `disband ${o.unit}`;
    case "fold":
      return `fold the troops in ${o.unit} into those in ${o.into}`;
    case "demand":
      return `ask ${o.how === "share" ? `${o.n}% of the harvest` : `${o.n} measures of grain a season`} of ${o.province === null ? "all your land" : named(o.province)}`;
    case "census":
      return `send scribes to count ${named(o.province)}`;
    case "answer":
      return o.take ? `take up ${named(o.province)}, which looks to you` : `refuse ${named(o.province)}, which looks to you`;
    case "cede":
      return `cede ${o.province} to ${powerName(o.to)}`;
    case "giftUnit":
      return `give the troops in ${o.unit} to ${WorldMap.default.find(o.unit)?.name === powerName(o.to) ? "the king of " : ""}${powerName(o.to)}`;
    case "dispatch":
      return `send ${o.envoy} to ${powerName(o.to)}` + (o.gold > 0 ? ` with ${o.gold} shekels` : "") + (o.proposal ? " bearing a tablet to seal" : "") + (o.collect != null ? ` carrying debt tablet ${o.collect}` : "");
    case "release":
      return `release ${o.character}`;
    case "seekCandidates":
      return "ask for candidates";
    case "hire":
      return `offer ${o.character} a job${jobText(o)} within ${o.term} seasons for ${o.fee} shekels, ${o.advance} of them now${o.via != null ? `, the offer carried by ${o.via}` : ""}`;
    case "renew":
      return `offer ${o.character} a new job${jobText(o)} within ${o.term} seasons for ${o.fee} shekels, ${o.advance} of them now`;
    case "seize":
      return `seize the hoard ${o.character} keeps in your capital`;
    case "sellDebt":
      return `sell debt tablet ${o.debt} to ${o.character} for ${o.price} shekels`;
    case "payCarriers":
      return o.pay ? "pay the carriers of your people's letters on delivery" : "stop paying the carriers of your people's letters on delivery";
    case "upkeep": {
      const half = (v: boolean | null | undefined, yes: string, no: string): string | null => (v === null || v === undefined ? null : v ? yes : no);
      const what = [half(o.pay, "pay", "hold back the pay of"), half(o.feed, "feed", "hold back the food of")].filter((x) => x !== null).join(" and ") || "leave the pay and food of";
      return o.province !== undefined ? `${what} your troops in ${named(o.province)}` : `${what} your troops, by standing order`;
    }
    case "hunt":
      return `your armies in ${named(o.province)} fall on the bands there`;
    case "huntBands":
      return o.on
        ? `your armies fall on any band where they stand ${(o.provinces ?? []).length > 0 ? `in ${(o.provinces ?? []).map(named).join(", ")}` : "in your land"}, until you say otherwise`
        : "your armies leave the bands alone unless you order a hunt";
    case "payFee":
      return o.pay ? `pay ${o.character} the rest of the fee owed` : `withhold the rest of ${o.character}'s fee`;
    case "borrow":
      return `borrow ${o.amount} shekels from ${o.character}, to repay ${o.repay} in ${o.seasons} seasons`;
    case "repay":
      return `repay ${o.amount} shekels on debt ${o.debt}`;
    case "buyNews":
      return `buy ${o.character}'s news of ${powerName(o.court)}`;
    case "dismiss":
      return `dismiss ${o.character}`;
    case "check":
      return `check the background of ${o.character} (${o.spend} shekels)`;
    case "spy":
      return `send ${o.character} to spy on ${o.court ?? o.province ?? ""}${(o.stir ?? 0) > 0 ? `, with ${o.stir} shekels to stir its people` : ""}`;
    case "recall":
      return `recall ${o.character}`;
    case "counterIntel":
      return `spend ${o.spend} on watching for spies`;
    case "roads":
      return `${o.close ? "close" : "open"} your roads to the people of ${powerName(o.court)}`;
    case "claimName":
      return `claim the name of ${o.name}`;
    case "grant":
      return `grant ${powerName(o.grantee)} ${o.kind === "passage" ? "passage through" : "basing in"} ${o.province !== null ? named(o.province) : "all your land"}${o.seasons !== null ? ` for ${o.seasons} seasons` : " until revoked"}`;
    case "revoke":
      return `revoke the passage and basing you granted ${powerName(o.grantee)}${o.province !== null ? ` in ${o.province}` : ""}`;
    case "repudiate":
      return `repudiate the tablet ${o.copy}, sealed by your envoy, as beyond his authority`;
    case "assay":
      return `assay gold lot ${o.lot}`;
    case "authenticate":
      return `authenticate tablet ${o.copy} (${o.spend} shekels)`;
    case "forge":
      return `have ${o.character} forge a tablet sealed by ${o.seals.join(", ")}`;
    case "captive":
      return o.fate === "Question"
        ? `question the captive ${o.character} (${o.spend ?? 0} shekels)`
        : o.fate === "HandOver"
          ? `hand the captive ${o.character} over to ${o.to !== undefined && o.to !== null ? powerName(o.to) : "?"}`
          : o.fate === "TakePurse"
            ? `take the purse of the captive ${o.character}`
            : `${o.fate.toLowerCase()} the captive ${o.character}`;
    case "steal":
      return `have ${o.character} steal a tablet from the archive they watch`;
    case "gift":
      return `give ${o.character} a gift of ${o.gold} shekels`;
    case "payRansom":
      return `pay the ransom for ${o.character}`;
    case "letter":
      return o.fate === "Send" ? `send the offer of ${o.province}'s people to ${powerName(o.to)}` : `ask ${powerName(o.to)} ${o.price} shekels for the offer of ${o.province}'s people`;
    case "buyLetter":
      return `buy the offer of ${o.province}'s people`;
  }
}

/**
 * The order as a notice tells it to its king: troops by where they stand and every place by the map's name, a move in
 * words ("the troops in Carchemish march to Harran"), not the order's own shorthand. People keep their ids, which the
 * orders that answer a notice need.
 */
export function told(o: Order): string {
  const map = WorldMap.default;
  const at = (id: string | null | undefined): string => (isBlank(id) ? "?" : map.exists(id!) ? map.get(id!).name : placesNamed(id!));
  // A unit named by where it stands, or as an order to come names it ("the army to be raised in Sippar in turn 3").
  const troops = (id: string, plural: string, one: string): string => (map.exists(id) ? `the troops in ${at(id)} ${plural}` : `${at(id)} ${one}`);
  switch (o.type) {
    case "hold":
      return troops(o.unit, "hold", "holds");
    case "move":
      return `${troops(o.unit, "march", "marches")} to ${at(o.to)}${o.forced === true ? " by forced march" : ""}`;
    case "support":
      return `${troops(o.unit, "support", "supports")} ${o.to === null || o.to === undefined ? `the hold at ${at(o.supported)}` : `the move from ${at(o.supported)} to ${at(o.to)}`}`;
    case "convoy":
      return `the fleet in ${at(o.unit)} carries the army from ${at(o.army)} to ${at(o.to)}`;
    case "besiege":
      return `${troops(o.unit, "besiege", "besieges")} the city`;

    default:
      return placesNamed(describe(o));
  }
}

/** Engine words with each province's key ("durkurigalzu") given the map's name (Dur-Kurigalzu), as a king reads it. */
export function placesNamed(text: string): string {
  const map = WorldMap.default;
  return text.replace(/\b[a-z]+\b/g, (w) => (map.exists(w) ? map.get(w).name : w));
}

/** A job's errand and standing orders in words, for an order's line. */
function jobText(o: HireOrder | RenewOrder): string {
  // A court by its power's name, a province by its own.
  const where = o.where === null || o.where === undefined ? "?" : AllPowers.includes(o.where) ? powerName(o.where) : named(o.where);
  const errand = o.what === "envoy" ? ` as envoy to ${where}` : o.what === "spy" ? ` to watch ${where}` : o.what === "stay" ? " to stay at court" : o.what === "ride" ? ` to ride to ${where} and bring its report home` : "";
  return errand + (o.payOnDone === true ? ", the rest paid when it is done" : "") + (o.offerAgain === true ? ", offered again when done" : "");
}

/** Which unit an order acts on (one order each per season). */
export function unitOf(o: Order): string | null {
  switch (o.type) {
    case "hold":
    case "move":
    case "support":
    case "convoy":
    case "besiege":
    case "disband":
    case "fold":
    case "giftUnit":
    case "raze":
      return o.unit;
    default:
      return null;
  }
}

/**
 * The person an order gives a task to. A job offered (hire, renew) is not a task (the owner's answers to item 11a: the man may
 * be sent on its errand in the same season), so it is not counted here.
 */
export function characterOf(o: Order): string | null {
  switch (o.type) {
    case "dispatch":
      return o.envoy;
    case "command":
    case "govern":
    case "crown":
      return o.character;
    case "release":
    case "dismiss":
    case "spy":
    case "recall":
    case "forge":
    case "steal":
      return o.character;
    // Taking what a captive carries is no task (the owner's answers to item 11a): its fate may be decided the same season.
    case "captive":
      return o.fate === "TakePurse" ? null : o.character;
    default:
      return null;
  }
}

/**
 * C# record equality of two orders: the same kind and equal fields, where a list or an object field (greeting, proposal,
 * copies, seals) is equal only when it is the same object, as a record compares its reference-type members.
 */
export function orderEquals(a: Order, b: Order): boolean {
  if (a === b) return true;
  if (a.type !== b.type) return false;
  const ra = a as unknown as Record<string, unknown>;
  const rb = b as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
  for (const k of keys) {
    const x = ra[k] ?? null;
    const y = rb[k] ?? null;
    if (x !== y) return false;
  }
  return true;
}
