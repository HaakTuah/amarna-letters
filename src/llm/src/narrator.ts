/**
 * The narrator: writes each character's persona once, phrases background checks, and writes the chronicles. It only ever
 * receives facts the engine has already released.
 */
import { king, land, personaTemplate, year, type Character } from "@amarna/engine";
import type { CheckContext, ChronicleContext, INarrator } from "@amarna/game";
import type { ClaudeClient } from "./client.ts";
import { ModelIds } from "./models.ts";
import { Parse } from "./parse.ts";
import { Schemas } from "./schemas.ts";
import { Sb, joinS } from "./text.ts";

const Shared =
  "You are the narrator of Amarna Letters, a strategy game set among the Great Kings of the Late Bronze Age (c. 1360-1330 BCE). You never decide what is true: the game's engine does. You only phrase what you are given, with the voice and vocabulary of the age (minas and shekels, clay tablets in envelopes, cylinder seals, messengers, the gods Shamash, Amun, Marduk, Teshub and Nergal). Never add a fact you were not given. Reply with one JSON object matching the schema.";

export class LlmNarrator implements INarrator {
  private readonly client: ClaudeClient;
  private readonly model: string;

  constructor(client: ClaudeClient, model: string = ModelIds.Sonnet) {
    this.client = client;
    this.model = model;
  }

  get label(): string {
    return `${ModelIds.display(this.model)} narrator`;
  }

  async persona(c: Character, signal?: AbortSignal): Promise<string> {
    const t = c.traits;
    const user = `Write the persona of a character, as a second-person system prompt for the small language model that will play them for a whole game. 120 to 200 words. Give them a name and voice, a temperament, motivations and habits that follow from these hidden traits (0-100) and facts. Do not mention numbers or game mechanics; turn them into personality. Include every fact, so the character knows its own life. End with one sentence on how they speak.

Name: ${c.name}. From: ${c.origin}. Former calling: ${c.calling}.
Traits: loyalty ${t.loyalty}, greed ${t.greed}, competence ${t.competence}, ambition ${t.ambition}, courage ${t.courage}${t.sympathy !== null ? `, a sympathy for ${land(t.sympathy)} (${t.sympathyStrength})` : ""}.
Facts: ${joinS(
      " ",
      c.facts.map((f) => `[${f.secrecy}] ${f.text}`),
    )}`;
    const json = await this.client.askJson(
      {
        key: `setup/persona/${c.id}`,
        turn: 0,
        role: "narrator:persona",
        model: this.model,
        sharedSystem: Shared,
        user,
        schema: Schemas.text("persona", "The persona prompt, in the second person."),
        effort: "low",
        maxTokens: 4000,
      },
      signal,
    );
    const persona = Parse.field(json, "persona");
    return persona.length > 40 ? persona : personaTemplate(c);
  }

  async checkReport(ctx: CheckContext, signal?: AbortSignal): Promise<string> {
    const user = `The court of ${land(ctx.court)} paid for inquiries into ${ctx.subject.name} of ${ctx.subject.origin}. Phrase the result as a short report from the court's inquirers, two to five sentences, like "Former merchant in Ugarit. Left debts behind." Use only these findings, and do not hint at anything more: ${ctx.facts.length === 0 ? "(nothing of note was found)" : joinS(" ", ctx.facts)}`;
    const json = await this.client.askJson(
      {
        key: `t${ctx.turn}/check/${ctx.subject.id}/${ctx.court}`,
        turn: ctx.turn,
        role: "narrator:check",
        model: this.model,
        sharedSystem: Shared,
        user,
        schema: Schemas.text("report", "The inquirers' report."),
        effort: "low",
        maxTokens: 2000,
      },
      signal,
    );
    return Parse.field(json, "report");
  }

  async chronicle(ctx: ChronicleContext, signal?: AbortSignal): Promise<string> {
    const p = ctx.power;
    const events = new Sb();
    const known = ctx.known.filter((e) => e.kind !== "start" && e.kind !== "support");
    for (const e of known.slice(Math.max(0, known.length - 120))) events.appendLine(`- year ${year(e.turn)}, turn ${e.turn}: ${e.text}`);
    const last = ctx.scores.length > 0 ? ctx.scores[ctx.scores.length - 1] : null;
    const user = `Write the royal annals of ${king(p)}, Great King of ${land(p)}, for this age: glorious and self-serving, in the manner of Late Bronze Age royal inscriptions. The model is the Battle of Kadesh, which Egypt and the Hatti each recorded as their own victory. Spin every event in the king's favour, blame setbacks on treacherous enemies, faithless messengers or the testing of the gods, and never admit defeat. Use only the events below (this is what ${land(p)}'s court knew). 250 to 400 words, divided by year.

Outcome: ${ctx.winners.includes(p) ? "this king won the age" : `the age was won by ${joinS(" and ", ctx.winners)}`}; at the end ${land(p)} held ${last?.provinces ?? 0} provinces.
Events known to this court:
${events.toString()}`;
    const json = await this.client.askJson(
      {
        key: `end/chronicle/${p}`,
        turn: ctx.lastTurn,
        role: "narrator:chronicle",
        model: this.model,
        sharedSystem: Shared,
        user,
        schema: Schemas.text("chronicle", "The annals."),
        effort: "low",
        maxTokens: 6000,
      },
      signal,
    );
    return Parse.field(json, "chronicle");
  }
}
