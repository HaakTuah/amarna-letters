/**
 * Item 17++, "Governors": a king may make a governor, or any character, a vassal king over provinces of his by a grant
 * under oath. The man offered it is asked whether he takes it, in the words of what each choice means ("Requests are rules
 * too"): who offers it, the land, the tribute and the price, his purse and roughly what the land yields, nothing more.
 */
import { z } from "zod";
import { land, newCrownChoice, type CrownChoice, type CrownView } from "@amarna/engine";
import { object, type JsonObject, type ReplySchema } from "./schemas.ts";
import { Sb } from "./text.ts";

const Choices = { take: "take the kingship", refuse: "refuse it" } as const;

/** The request: the grant's terms, and what taking or refusing it does. */
export function crownText(v: CrownView): string {
  const sb = new Sb();
  sb.appendLine(
    `It is season ${v.turn}. The king of ${land(v.from)} offers to make you king of ${v.lands.join(", ")} under oath, as his vassal, ruling from ${v.seat}${v.governs ? ", where you govern for him now" : ""}.`,
  );
  sb.appendLine(
    `His terms: ${v.tribute} shekels of tribute a year${v.price > 0 ? `, and a price of ${v.price} shekels you pay now from your purse of ${v.purse}` : ""}. The land yields roughly ${v.yearly} shekels a year as you see it.`,
  );
  sb.appendLine(
    `If you take it, the land is yours, a realm of your own with your purse as its treasury, bound to ${land(v.from)} by a sealed vassal tablet: tribute, your service, his protection. Sending the tribute is then yours to order, and others hear if you do not; its people's standing with you is what you have earned there. If you refuse, nothing changes${v.governs ? ": you govern as before" : ": you go back to his court"}.`,
  );
  return sb.toString();
}

export function crownSchema(): ReplySchema {
  return object(
    ["choice", z.enum([Choices.take, Choices.refuse]).describe("Whether you take the kingship on these terms.")],
    ["terms", z.string().describe("If you refuse: the terms you would take it on, in your own words, which go back to the king with your answer. Else empty.")],
  );
}

export function crownOf(o: JsonObject, v: CrownView): CrownChoice {
  return newCrownChoice({ crownId: v.crownId, accept: o.choice === Choices.take, terms: typeof o.terms === "string" ? o.terms : "" });
}

export function crownSummary(ch: CrownChoice | null): string {
  return ch === null ? "by its traits" : ch.accept ? Choices.take : Choices.refuse;
}
