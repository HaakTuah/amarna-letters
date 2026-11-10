/**
 * The narrator: writes each character's persona once, phrases background checks, and writes the chronicles. It only ever
 * receives facts the engine has already released.
 */
import { land, nameFrom, rulerOf, personaTemplate, StrategyWords, strategiesOf, year, type Character } from "@amarna/engine";
import { threadWords, type CheckContext, type ChronicleContext, type INarrator, type ThreadContext } from "@amarna/game";
import type { ModelClient } from "./client.ts";
import { ModelIds, OutputCaps } from "./models.ts";
import { Parse } from "./parse.ts";
import { Replies } from "./schemas.ts";
import { Sb, joinS } from "./text.ts";

const Shared =
  "You are the narrator of Amarna Letters, a strategy game set among the Great Kings of the Late Bronze Age (c. 1360-1330 BCE). You never decide what is true: the game's engine does. You only phrase what you are given, in the voice and vocabulary of the age: gold weighed in minas and shekels, tablets sealed and sent by messenger, and the gods of the lands concerned, never one list of gods for every land. Never add a fact you were not given. Reply with one JSON object matching the schema.";

export class LlmNarrator implements INarrator {
  private readonly client: ModelClient;
  private readonly model: string;

  constructor(client: ModelClient, model: string = ModelIds.Sonnet) {
    this.client = client;
    this.model = model;
  }

  get label(): string {
    return `${ModelIds.display(this.model)} narrator`;
  }

  async persona(c: Character, signal?: AbortSignal): Promise<string> {
    const t = c.traits;
    const user = `Write the persona of a character, as a second-person system prompt for the small language model that will play them for a whole game. 120 to 200 words. Give them a voice, a temperament, motivations and habits that follow from these hidden traits (0-100), their calling and their homeland. Their goal is wealth, and the persona tells how this particular man means to get rich: the strategy below, reconciled with the traits, on the road below. Describe how experienced they are, never their age. Do not mention numbers or game mechanics; turn them into personality. The facts are given to the character beside the persona in every request, so draw on them without listing them; facts marked Hidden or Deep are secrets the character keeps. Invent no other facts. Say how they speak, in words that fit this man and no other.

Name: ${c.name}. From: ${c.origin}. Former calling: ${c.calling}.
Traits: loyalty ${t.loyalty}, greed ${t.greed}, competence ${t.competence}, ambition ${t.ambition}, courage ${t.courage}${t.sympathy !== null ? `, a sympathy for ${land(t.sympathy)} (${t.sympathyStrength})` : ""}.
Strategy: ${strategiesOf(t).map((x) => StrategyWords[x]).join("; or else ")}. Road: ${c.bold ? "bold" : "careful"}.
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
        schema: Replies.text("persona", "The persona prompt, in the second person."),
        effort: "low",
        maxTokens: OutputCaps.persona,
      },
      signal,
    );
    const persona = Parse.field(json, "persona");
    return persona.length > 40 ? persona : personaTemplate(c);
  }

  async checkReport(ctx: CheckContext, signal?: AbortSignal): Promise<string> {
    const user = `The court of ${land(ctx.court)} paid for inquiries into ${nameFrom(ctx.subject)}. Phrase the result as a short report from the court's inquirers, two to five plain sentences, as a court's record would set it down. Use only these findings, and do not hint at anything more: ${ctx.facts.length === 0 ? "(nothing of note was found)" : joinS(" ", ctx.facts)}`;
    const json = await this.client.askJson(
      {
        key: `t${ctx.turn}/check/${ctx.subject.id}/${ctx.court}`,
        turn: ctx.turn,
        role: "narrator:check",
        model: this.model,
        sharedSystem: Shared,
        user,
        schema: Replies.text("report", "The inquirers' report."),
        effort: "low",
        maxTokens: OutputCaps.checkReport,
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
    const user = `Write the royal annals of ${rulerOf(p)}, for this age: glorious and self-serving, in the manner of Late Bronze Age royal inscriptions. Take the tone of the accounts of the Battle of Kadesh, which Egypt and the Hatti each recorded as their own victory, but never name that battle: it was fought two generations after this age. Spin every event in the king's favour and never admit defeat; explain away each setback only by what the events below give. Use only the events below (this is what ${land(p)}'s court knew). 250 to 400 words, divided by year.

Outcome: ${ctx.winners.includes(p) ? "this king won the age" : `the age was won by ${joinS(" and ", ctx.winners)}`}; at the end ${land(p)} held ${last?.provinces ?? 0} provinces.
Events known to this court:
${events.toString()}${
      ctx.earlier.length === 0
        ? ""
        : `
The court has asked for these annals to be written anew. They were written before as follows; write them afresh, in words of your own, not these:
${ctx.earlier.map((t) => `---\n${t}`).join("\n")}`
    }`;
    const json = await this.client.askJson(
      {
        key: ctx.earlier.length === 0 ? `end/chronicle/${p}` : `end/chronicle/${p}/anew${ctx.earlier.length}`,
        turn: ctx.lastTurn,
        role: "narrator:chronicle",
        model: this.model,
        sharedSystem: Shared,
        user,
        schema: Replies.text("chronicle", "The annals."),
        effort: "low",
        maxTokens: OutputCaps.chronicle,
      },
      signal,
    );
    return Parse.field(json, "chronicle");
  }

  /**
   * The threads to watch (item 17+++): worded by the template for now, so no season calls a model for them; a model's
   * wording comes with the model narrator's next work, through this same call, kept in the record like the template's.
   */
  threads(ctx: ThreadContext): Promise<string[]> {
    return Promise.resolve(ctx.threads.map((t) => threadWords(t, ctx.names)));
  }
}
