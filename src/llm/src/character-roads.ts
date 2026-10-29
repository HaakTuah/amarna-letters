/**
 * Haakon's answers to item 11b: a model chief decides raids, ships, the way back and whether to kill in a request of his
 * own, and a posted spy whose reports wait for a carrier decides whether to wait, pay or carry them home itself. Every
 * field is asked only where it applies, in the words of what it means ("Requests are rules too").
 */
import { z } from "zod";
import { land, newChiefChoice, newReportsChoice, type ChiefChoice, type ChiefView, type Kill, type LandSeen, type ReportsChoice, type ReportsView } from "@amarna/engine";
import { object, type JsonObject, type ReplySchema } from "./schemas.ts";
import { Sb } from "./text.ts";

/** Whom his men kill, in his words, and back. */
const KillWords: Record<Kill, string> = { none: "nobody", servants: "kings' servants", all: "everyone" };
const killOf = (s: unknown): Kill | null => (Object.entries(KillWords).find(([, w]) => w === s)?.[0] as Kill | undefined) ?? null;

function landLine(l: LandSeen, here: boolean): string {
  const parts = [l.holder === null ? "no king's land" : `land of ${land(l.holder)}`, `its people's purse about ${l.purse} shekels, its stores about ${l.stores} measures of grain`];
  if (l.holder !== null) parts.push(l.army ? "its king's troops stand there" : "none of its king's troops stand there");
  if (l.bands > 0) parts.push(`other bands of ${l.bands} men work there`);
  if (l.coast) parts.push("it has a coast");
  if (l.hunted) parts.push("talk has reached you that its king ordered his armies to fall on any band there");
  return `- ${l.name}${here ? " (where you are)" : ""}: ${parts.join("; ")}.`;
}

/** The chief's request: his band, the land he could work, and what each choice means. */
export function chiefText(v: ChiefView): string {
  const sb = new Sb();
  sb.appendLine(`It is season ${v.turn}. You lead a band of ${v.men} men in ${v.here.name}${v.ship ? ", with a ship: you also fall on travellers and ships at sea off its coast" : ""}. You decide what your band does next season.`);
  sb.appendLine(`The age: ${v.ending} Idrimi of Alalakh is a legend already: a king's son who fled, lived seven years among the Habiru, and came back to take a city.`);
  sb.appendLine(
    `Your purse holds ${v.purse} shekels; what your band robs of gold is yours, and you pay your men from it. Your men cost about ${v.cost} shekels' worth a season in pay and food.${v.short > 0 ? ` For ${v.short} season${v.short === 1 ? "" : "s"} in a row you could not pay them all: men leave a band that does not pay, and a large band long unpaid turns on its chief.` : ""}`,
  );
  sb.appendLine("The land where you work and the land next door, as you hear of it:");
  sb.appendLine(landLine(v.here, true));
  for (const l of v.next) sb.appendLine(landLine(l, false));
  sb.appendLine(
    "A band takes more where the people and the stores are rich and fewer others rob, and half as much where the king's troops stand; his army standing where you work falls on your band if he orders it, and men are lost.",
  );
  if (v.shipCost !== null)
    sb.appendLine(
      v.purse >= v.shipCost
        ? `A ship costs ${v.shipCost} shekels in this port. With one, your band also falls on travellers and ships at sea off the coast where it works; a band that moves to land without a coast leaves its ship behind, so none is bought if you move inland.`
        : `A ship costs ${v.shipCost} shekels in this port; you have not the gold for one.`,
    );
  else if (!v.ship && v.here.coast) sb.appendLine(`A ship needs at least ${v.shipMen} men to man it.`);
  if (v.ship) sb.appendLine("A band that moves to land without a coast leaves its ship behind.");
  sb.appendLine(
    `When your men rob a traveller, you choose whom they kill${v.kill !== null ? ` (now: ${KillWords[v.kill]})` : ""}. Any traveller let go names you: word that you rode with the Habiru reaches the land's king and the traveller's master, and follows you if you ever seek service; one killed names nobody, but a death on the road is heard of, and a king whose land it is may hunt you for it.`,
  );
  sb.appendLine("You may give up the road: your men go back to the loose men, and you seek service like anyone, carrying the hidden fact that you rode with the Habiru.");
  sb.appendLine("Choose for yourself. Your band stays where it is unless you move it, or a king's army falls on it and drives it off: then it flees to the land you named to go to, if no army stands there, and otherwise where it can.");
  return sb.toString();
}

/** The chief's reply: only the fields that apply to him now. */
export function chiefSchema(v: ChiefView): ReplySchema {
  const f: [string, z.ZodType][] = [];
  if (v.next.length > 0) f.push(["go", z.enum(["", ...v.next.map((l) => l.name)] as [string, ...string[]]).describe("Land next door to move your band to, or empty to stay.")]);
  if (v.shipCost !== null && v.purse >= v.shipCost) f.push(["buy_ship", z.boolean().describe("True to buy a ship here from your purse.")]);
  f.push(["kill", z.enum([KillWords.none, KillWords.servants, KillWords.all]).describe("Whom your men kill of the travellers they rob, until you say otherwise.")]);
  f.push(["give_up_the_road", z.boolean().describe("True to give up the road now.")]);
  return object(...f);
}

/** The reply as choices; the engine checks each against what can be done. `turn` is set by the engine. */
export function chiefOf(o: JsonObject, v: ChiefView): ChiefChoice {
  const go = v.next.find((l) => l.name === o.go) ?? null;
  return newChiefChoice({ turn: v.turn, go: go?.province ?? null, ship: o.buy_ship === true, giveUp: o.give_up_the_road === true, kill: killOf(o.kill) ?? v.kill ?? "none" });
}

export function chiefSummary(ch: ChiefChoice | null): string {
  if (ch === null) return "by its traits";
  if (ch.giveUp) return "give up the road";
  return [ch.go !== null ? `move to ${ch.go}` : "stay", ...(ch.ship ? ["buy a ship"] : []), `kill ${KillWords[ch.kill]}`].join("; ");
}

/** The spy's request: its reports waiting at its post, who could carry them, and at what price. */
export function reportsText(v: ReportsView): string {
  const sb = new Sb();
  const n = v.reports === 1 ? "A report of yours waits" : `${v.reports} reports of yours wait`;
  sb.appendLine(
    `It is season ${v.turn}. You watch ${v.post} for the king of ${land(v.master)}. ${n} there for someone to carry ${v.reports === 1 ? "it" : "them"} to his court, ${v.home} season${v.home === 1 ? "" : "s"} away; the oldest has waited ${v.waited} season${v.waited === 1 ? "" : "s"}. Your purse holds ${v.purse} shekels.`,
  );
  sb.appendLine("Who may carry them next season:");
  sb.appendLine(`- One of your master's own people setting out for his court takes them for nothing.`);
  sb.appendLine(
    v.paysOnDelivery
      ? `- A traveller going that way takes them for about ${v.passing} shekels, which your master pays on delivery by his standing order, if the traveller trusts his record of paying; else only if you pay it now.`
      : `- A traveller going that way takes them for about ${v.passing} shekels, paid by you now from your purse; your master has no standing order to pay carriers.`,
  );
  if (v.hired !== null)
    sb.appendLine(
      v.paysOnDelivery
        ? `- A free person at the court here would ask about ${v.hired} shekels to be hired for the journey: half now from your purse and the rest from your master on delivery; one who trusts your master's record of paying takes what you give now, even nothing.`
        : `- A free person at the court here would ask about ${v.hired} shekels to be hired for the journey, all now from your purse.`,
    );
  sb.appendLine(
    v.border !== null
      ? `- Or you walk them yourself to ${v.border}, in your master's land next door, where his couriers take them, and come back to your post: you leave your post meanwhile and meet the road's dangers there and back. A report shares its carrier's road: lost if he is robbed or killed, read by whoever catches him.`
      : "- Or you carry them home yourself, leaving your post until you return; your master goes on believing you at your post until you stand at his court again. A report shares its carrier's road: lost if he is robbed or killed, read by whoever catches him.",
  );
  sb.appendLine("Choose for yourself. Gold you pay leaves your purse; nobody pays you back for it.");
  return sb.toString();
}

export function reportsSchema(v: ReportsView): ReplySchema {
  return object(
    ["pay_up_to", z.int().describe(`The most you pay now from your purse for a carrier next season (you hold ${v.purse}); 0 to pay nothing.`)],
    ["carry_home", z.boolean().describe("True to carry them home yourself next season if nobody takes them; false to wait at your post.")],
  );
}

export function reportsOf(o: JsonObject, v: ReportsView): ReportsChoice {
  const pay = typeof o.pay_up_to === "number" && Number.isFinite(o.pay_up_to) ? Math.max(0, Math.trunc(o.pay_up_to)) : 0;
  return newReportsChoice({ turn: v.turn, payUpTo: Math.min(pay, v.purse), carry: o.carry_home === true });
}

export function reportsSummary(ch: ReportsChoice | null): string {
  if (ch === null) return "by its traits";
  return `${ch.payUpTo > 0 ? `pay up to ${ch.payUpTo}` : "pay nothing"}; ${ch.carry ? "carry them home" : "wait"}`;
}
