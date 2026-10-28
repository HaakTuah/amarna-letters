/**
 * A model character's own season (build order item 11a, "A life of their own"): the request that tells it where it stands,
 * what its gold is worth to it and the ending's rule in words, and the reply it decides: where to go, service or its own
 * work, its hoard, what it offers to lend, one approach to someone here and its answers, quitting, an errand's gold and the
 * debts it repays. Every field is asked only in the words of what applies ("Requests are rules too").
 */
import { z } from "zod";
import { AllPowers, land, newApproachMade, newLifeChoice, type LifeChoice, type LifeView, type Power } from "@amarna/engine";
import { object, type JsonObject, type ReplySchema } from "./schemas.ts";
import { Sb } from "./text.ts";

/** The request's text: its situation, the people here, the courts it could go to, and what each choice means. */
export function lifeText(v: LifeView): string {
  const sb = new Sb();
  sb.appendLine(`It is season ${v.turn}. This season you decide for yourself, as nobody's servant in this: where to be, what to do with your gold, and whom to deal with.`);
  sb.appendLine(`The age: ${v.ending} Gold lent is repaid only if the borrower lives and chooses to; a debt dies with a fallen kingdom.`);
  sb.appendLine(
    v.at === null
      ? "You are on the road."
      : `You stand at the court of ${land(v.at)}${v.employer !== null ? `, serving its king${v.employer !== v.at ? ` of ${land(v.employer)}` : ""}` : v.free ? (v.seeking ? ", seeking service" : ", working for yourself") : ""}.`,
  );
  if (v.jobUntil !== null) sb.appendLine(`Your job runs through season ${v.jobUntil}; ${v.restDue} shekels of its fee fall due when it is done and you are back at your master's court.`);
  for (const f of v.owedFees) sb.appendLine(`The king of ${land(f.court)} let ${f.amount} shekels of your fee fall due and did not pay them.`);
  sb.appendLine(
    `Your purse holds ${v.purse} shekels${v.hoard !== null ? `; your hoard at ${land(v.hoard.at)} holds ${v.hoard.gold} (its temple or merchant house keeps it for a fee each season; it is safe from the road, but lost if that city falls)` : ""}. Living here costs you ${v.living} shekels a season${v.living === 0 ? " (you are your master's guest)" : ", paid at the market"}.`,
  );
  if (v.lendOffer !== null) sb.appendLine(`You offer to lend the king here up to ${v.lendOffer.amount}, asking ${v.lendOffer.perHundred} in a hundred more back after ${v.lendOffer.seasons} seasons.`);
  for (const d of v.held) sb.appendLine(`You hold the debt tablet ${d.id}: ${d.other} owes ${d.left}, to be repaid by season ${d.dueTurn}; it lies ${d.kept}. Whoever holds a tablet holds the claim.`);
  for (const d of v.owes) sb.appendLine(`You owe ${d.left} on tablet ${d.id}, held by ${d.other}, to be repaid by season ${d.dueTurn}.`);
  const e = v.errand;
  if (e !== null)
    sb.appendLine(
      `You are on an errand for ${e.employerName}: to collect debt ${e.debtId} at the court of ${e.borrower}, and bring what is paid back to them at the court of ${e.home}. You have collected ${e.collected}. Handing it over earns you the rest of your fee; keeping it is a job broken, which others will hear of.`,
    );
  for (const o of v.offers) sb.appendLine(`The court of ${o.court} offered you ${o.rate} a season last season.`);
  sb.appendLine(`The going rate of service is ${v.goingRate} in a hundred of what people would ask on their own.`);
  sb.appendLine("The courts as you know them (seasons of travel from here; when each last asked for candidates; how far its promises to pay are kept; grain at its market, 100 the usual price; what you would ask it a season):");
  for (const k of v.courts)
    sb.appendLine(
      `- ${k.court}: ${k.travel === 0 ? "here" : `${k.travel} seasons away`}; ${k.hiring === null ? "not hiring" : `asked for candidates in season ${k.hiring}`}; promises kept ${k.kept}, broken ${k.broken} (people count on ${k.trust} in a hundred); ${k.executions > 0 ? `${k.executions} executions said of it; ` : ""}grain ${k.grain}; growth ${k.growth} in a hundred${k.besieged ? "; its capital is besieged" : ""}; you would ask ${k.ask}.`,
    );
  if (v.here.length > 0) {
    sb.appendLine("Others here (id: name, standing, their record of paying what they promised):");
    for (const p of v.here) sb.appendLine(`- ${p.id}: ${p.name}, ${p.standing}, kept ${p.kept}, broken ${p.broken}`);
  }
  if (v.approaches.length > 0) {
    sb.appendLine("Offers made to you, waiting for your answer (accept by id; the rest you refuse):");
    for (const a of v.approaches) {
      const parts: string[] = [];
      if (a.collect !== null) parts.push(`to carry tablet ${a.collect} and collect what is paid on it, for ${a.fee} shekels, ${a.giveGold} of them now`);
      else {
        if (a.giveGold > 0) parts.push(`gives you ${a.giveGold}${a.repay > 0 ? ` as a loan, which you repay ${a.repay} within ${a.seasons} seasons` : ""}`);
        if (a.askGold > 0) parts.push(`asks ${a.askGold} of you${a.repay > 0 ? ` as a loan, to repay you ${a.repay} within ${a.seasons} seasons` : ""}`);
        if (a.giveDebts.length > 0) parts.push(`gives you tablets ${a.giveDebts.join(", ")}`);
        if (a.askDebts.length > 0) parts.push(`asks your tablets ${a.askDebts.join(", ")}`);
      }
      sb.appendLine(`- ${a.id} from ${a.fromName}: ${parts.join("; ") || "words only"}${a.words !== "" ? `. Says: "${a.words}"` : ""}`);
    }
  }
  sb.appendLine(
    "Choose for yourself. Everything you leave as it is stays as it is, except an offer to lend, which you name anew each time you decide. Gold you give away or lend leaves your purse; weigh what it buys you, and when, against what you may lose. Words bind nobody; gold and tablets move only when both sides agree, at once.",
  );
  return sb.toString();
}

const str = (d: string) => z.string().describe(d);
const int = (d: string) => z.int().describe(d);

/** The reply's schema: every field required, and only the fields that apply to it now ("Requests are rules too"). */
export function lifeSchema(v: LifeView): ReplySchema {
  const courts = AllPowers.filter((p) => v.courts.some((k) => k.court === p));
  const f: [string, z.ZodType][] = [];
  if (v.free || v.errand !== null) f.push(["go", z.enum(["", ...courts] as [string, ...string[]]).describe("A court to set out for, or empty to stay.")]);
  if ((v.free || v.errand !== null) && v.alias !== null && v.courts.some((k) => k.stranger))
    f.push(["go_as", z.enum(["", v.alias]).describe(`The name you give at the court you set out for, if it knows nothing of you: "${v.alias}", a name of your own making, or empty for your own.`)]);
  if (v.free) f.push(["seek_service", z.boolean().describe("True to seek service at courts; false to work for yourself (lending, dealing).")]);
  f.push(["hoard", int("Gold to put into a hoard here (above 0) or take out of your hoard here (below 0); 0 for neither. One city only.")]);
  f.push(["lend_amount", int("What you offer to lend the king where you stand, from your purse; 0 for no offer.")]);
  f.push(["lend_per_hundred", int("With an offer to lend: how much in a hundred more you ask back.")]);
  f.push(["lend_seasons", int("With an offer to lend: within how many seasons.")]);
  if (v.here.length > 0) {
    f.push(["approach_to", str("The id of someone here you make an offer to, or empty.")]);
    f.push(["approach_words", str("What you say to them.")]);
    f.push(["approach_give_gold", int("Gold you give them (as a loan if you name a sum to repay), or 0.")]);
    f.push(["approach_ask_gold", int("Gold you ask of them (as a loan to you if you name a sum to repay), or 0.")]);
    f.push(["approach_repay", int("For a loan: the sum to be repaid, sealed on a debt tablet; 0 for no loan.")]);
    f.push(["approach_seasons", int("For a loan: within how many seasons.")]);
    if (v.held.length > 0) {
      f.push(["approach_collect", str("A debt tablet of yours they are to carry to the borrower's court and collect on, for a fee (give them the advance as gold); or empty.")]);
      f.push(["approach_fee", int("With a collecting job: the whole fee, the rest due when they bring the gold back.")]);
    }
  }
  if (v.approaches.length > 0) f.push(["accept", z.array(z.string()).describe("The ids of the offers made to you that you accept.")]);
  if (!v.free && v.employer !== null) f.push(["quit", z.boolean().describe("True to leave your master's service now, before the job is done (it is recorded, and others hear of it).")]);
  if (v.errand !== null && v.at === v.errand.home) f.push(["hand_over", z.boolean().describe("Back with your employer: true to hand over what you collected; false to keep it.")]);
  if (v.owes.length > 0) f.push(["repay", z.array(z.string()).describe("Debts you owe that you repay in full now, by tablet id, to holders standing here.")]);
  return object(...f);
}

const S_ = (o: JsonObject, k: string): string => (typeof o[k] === "string" ? (o[k] as string) : "");
const I_ = (o: JsonObject, k: string): number => (typeof o[k] === "number" && Number.isFinite(o[k]) ? Math.trunc(o[k] as number) : 0);
const L_ = (o: JsonObject, k: string): string[] => (Array.isArray(o[k]) ? (o[k] as unknown[]).filter((x): x is string => typeof x === "string") : []);

/** The reply as choices; the engine checks each against what it can do. */
export function lifeOf(o: JsonObject, v: LifeView): LifeChoice {
  const go = S_(o, "go");
  const to = S_(o, "approach_to");
  const amount = I_(o, "lend_amount");
  return newLifeChoice({
    go: go !== "" && (AllPowers as readonly string[]).includes(go) ? (go as Power) : null,
    goAs: v.alias !== null && S_(o, "go_as") === v.alias ? v.alias : null,
    seek: typeof o.seek_service === "boolean" ? o.seek_service : v.seeking,
    hoard: I_(o, "hoard"),
    lend: amount > 0 ? { amount, perHundred: I_(o, "lend_per_hundred"), seasons: Math.max(1, I_(o, "lend_seasons")) } : null,
    approach:
      to !== ""
        ? newApproachMade({
            to,
            words: S_(o, "approach_words"),
            giveGold: I_(o, "approach_give_gold"),
            askGold: I_(o, "approach_ask_gold"),
            repay: I_(o, "approach_repay"),
            seasons: I_(o, "approach_seasons"),
            collect: S_(o, "approach_collect") === "" ? null : S_(o, "approach_collect"),
            fee: I_(o, "approach_fee"),
          })
        : null,
    accept: L_(o, "accept"),
    quit: o.quit === true,
    deliver: o.hand_over !== false,
    repay: L_(o, "repay"),
  });
}

/** A season's choices in one line, for the shadow log that compares a model's choice with the script's. */
export function lifeSummary(ch: LifeChoice | null): string {
  if (ch === null) return "nothing";
  const parts: string[] = [];
  if (ch.go !== null) parts.push(`go to ${ch.go}`);
  parts.push(ch.seek ? "seek service" : "work for itself");
  if (ch.hoard !== 0) parts.push(`hoard ${ch.hoard}`);
  if (ch.lend !== null) parts.push(`lend ${ch.lend.amount} at ${ch.lend.perHundred} in 100 over ${ch.lend.seasons}`);
  if (ch.approach !== null) parts.push(`approach ${ch.approach.to}${ch.approach.collect !== null ? " to collect" : ch.approach.repay > 0 ? " for a loan" : ""}`);
  if (ch.accept.length > 0) parts.push(`accept ${ch.accept.join(", ")}`);
  if (ch.repay.length > 0) parts.push(`repay ${ch.repay.join(", ")}`);
  if (ch.quit) parts.push("quit");
  if (!ch.deliver) parts.push("keep what it collected");
  return parts.join("; ");
}
