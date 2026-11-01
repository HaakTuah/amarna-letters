/**
 * Item 17++, "Whom a province obeys": persons do not obey a ledger but choose by their stakes. A man of standing whose
 * province's people would follow him against its master is asked whether he leads them, in the words of what each choice
 * means ("Requests are rules too"): only what he could see standing there, never the ledger's numbers.
 */
import { z } from "zod";
import { land, newRisingChoice, type RisingChoice, type RisingView } from "@amarna/engine";
import { object, type JsonObject, type ReplySchema } from "./schemas.ts";
import { Sb } from "./text.ts";

const Choices = { lead: "lead them", wait: "do not lead them" } as const;

/** The request: the province, its master, roughly how many would rise with him, and what each choice costs and wins. */
export function risingText(v: RisingView): string {
  const sb = new Sb();
  const service = v.governs ? `You govern it for ${land(v.holder)}.` : v.employer !== null ? `You serve ${land(v.employer)}.` : "You serve no king.";
  sb.appendLine(`It is season ${v.turn}. You stand in ${v.name}, which answers to ${land(v.holder)}. ${service}`);
  sb.appendLine(
    `Its people lean to you over their master: about ${v.followers} of its men would rise if you led them${v.band > 0 ? `, besides your band of ${v.band}` : ""}. ${v.troops > 0 ? `About ${v.troops} of ${land(v.holder)}'s men stand there, and would fight you as a battle goes.` : `None of ${land(v.holder)}'s troops stand there now.`}`,
  );
  sb.appendLine(
    `If you lead them and they still follow you next season, ${v.name} answers to you: you rule it in your own name, as a power of your own, and ${land(v.holder)} hears of it as news with its cause${v.employer !== null ? `; your service to ${land(v.employer)} ends` : ""}. If his troops there beat the rising, its men die or run and half as many follow you after. If you do not, nothing changes, and you may be asked again while they lean to you.`,
  );
  return sb.toString();
}

export function risingSchema(): ReplySchema {
  return object(["choice", z.enum([Choices.lead, Choices.wait]).describe("Whether you lead the people of the province against its master.")]);
}

export function risingOf(o: JsonObject, v: RisingView): RisingChoice {
  return newRisingChoice({ turn: v.turn, province: v.province, rise: o.choice === Choices.lead });
}

export function risingSummary(ch: RisingChoice | null): string {
  return ch === null ? "by its traits" : ch.rise ? Choices.lead : Choices.wait;
}
