/**
 * Envoys, spies and candidates played by a model. Each character's model receives only its own persona, its own memory and
 * the facts it knows about itself, plus what is in front of it. It holds no secrets it should not tell: a full confession
 * reveals only what it knows. The asker is the Anthropic API, or one file exchange per character for file characters, which
 * then see exactly the same text. A character with no asker is played by the script. With `shadow` set, each decision a
 * model makes is logged beside what the script mind with the same traits decides in the same situation; the script draws
 * no dice of the game's own, so the game is the same with or without it.
 */
import {
  beliefWords,
  AllPowers,
  CharacterSchema,
  MessageTrailSchema,
  Views,
  WorldMap,
  cap,
  clamp,
  clone,
  commitment,
  currentPersona,
  formatMoney,
  isBlank,
  king,
  land,
  newHomeCargo,
  newMindReply,
  newSpyReport,
  requestFor,
  seqEqual,
  type Character,
  type EnvoyReaction,
  type HostReply,
  type MessageTrail,
  type MindReply,
  type Power,
  type SpyReport,
  authorityText,
  clause,
  clauseTag,
  type Clause,
  renderClauses,
  strategyText,
} from "@amarna/engine";
import {
  CharacterChecks,
  ScriptMind,
  newCharacterChoice,
  newMindContext,
  newShadowDecision,
  type CharacterChoice,
  type EnvoyContext,
  type ICharacterMind,
  type MindContext,
  type PresentResult,
  type ShadowDecision,
} from "@amarna/game";
import type { CallSpec, JsonAsker } from "./client.ts";
import { fieldsDiffer, type Ladder } from "./ladder.ts";
import { ModelIds, OutputCaps } from "./models.ts";
import { Parse } from "./parse.ts";
import { lifeOf, lifeSchema, lifeSummary, lifeText } from "./character-life.ts";
import { chiefOf, chiefSchema, chiefSummary, chiefText, reportsOf, reportsSchema, reportsSummary, reportsText } from "./character-roads.ts";
import { bridgeOf, bridgeSchema, bridgeText, unheardOf, unheardSchema, unheardSummary, unheardText } from "./character-tongues.ts";
import { Replies, Schemas, type JsonObject, type ReplySchema } from "./schemas.ts";
import type { Stakes } from "./spending.ts";
import { Sb, joinS } from "./text.ts";
import { CharacterSystem, canForge, courtOf, keepLine, kingOf, landName, offerLine, selfText, traitLine } from "./character-self.ts";
import { asGiven, recitedBy, reportedBy } from "./character-recital.ts";

/** The characters' ladder ("Minds follow what is at stake"): the small rung is their own model; above it, what they pass up. */
export interface CharacterRungs {
  ladder: Ladder;
  /** The large rung, or null: the small rung decides everything it decides today. */
  up: string | null;
}

/** One decision as the ladder weighs it: its stakes, its log keys, and how two replies to it are compared in an audit. */
interface Weighed {
  stakes: Stakes;
  keys: string[];
  fields: readonly string[];
}

/** The budget could not pay for a character's call: the script decides, and the small rung words what others will read. */
class ScriptRung extends Error {}

/** What a character has to lose, in its own terms: the gold it carries or is offered against its purse. */
const share = (c: Character, gold: number): number => Math.max(0, gold) / (Math.max(0, c.purse) + 50);

/** What the script itself chose at one audience the model played: the gold it kept, its forged inventory, the gift it took. */
interface ScriptAudience {
  kept: number;
  swapped: boolean;
  gift: number;
  ask: string | null;
}

/** The text between two markers, or null. */
function between(text: string, start: string, end: string): string | null {
  if (!text.startsWith(start)) return null;
  const stop = text.indexOf(end, start.length);
  return stop < 0 ? null : text.slice(start.length, stop);
}

/** The key of a written request's call, or null for a task no character writes. */
function writeKey(ctx: MindContext): string | null {
  switch (ctx.request.task) {
    case "EnvoyReport":
      return `t${ctx.turn}/report/${ctx.self.id}`;
    case "Pitch":
      return `t${ctx.turn}/pitch/${ctx.self.id}/${requestFor(ctx.request)}`;
    case "SpyReport":
      return `t${ctx.turn}/spy/${ctx.self.id}`;
    case "SummarizeMemory":
      return `t${ctx.turn}/memory/${ctx.self.id}`;
    case "Questioned":
      return `t${ctx.turn}/questioned/${ctx.self.id}`;
    default:
      return null;
  }
}

/** A written decision as the shadow log keeps it, with what the checks find in it against its situation. */
function choiceOf(ctx: MindContext, r: MindReply): CharacterChoice {
  const choice = newCharacterChoice({ text: r.text });
  switch (ctx.request.task) {
    case "EnvoyReport":
      choice.kept = clamp(r.number, 0, ctx.request.cargo?.gold ?? 0);
      choice.swap = r.swapInventory && choice.kept > 0;
      choice.flags = CharacterChecks.report(ctx, r.text);
      break;
    case "Pitch":
      choice.price = r.number;
      break;
    case "SpyReport":
      [choice.flags, choice.dropped] = CharacterChecks.spy(ctx, r.text);
      break;
  }
  return choice;
}

export class LlmCharacterMind implements ICharacterMind {
  private readonly askerFor: (c: Character) => JsonAsker | null;
  private readonly model: string;
  private readonly labelText: string | null;
  /** The script mind that plays a character with no asker and makes the shadow's decisions. */
  script: ICharacterMind = new ScriptMind();
  /** Where each model decision goes, beside the script's for the same situation; null logs none. */
  shadow: ((s: ShadowDecision) => void) | null = null;
  /** The script's own choices at each audience the model played, by character, host and season (only with shadow set). */
  private readonly scriptAudiences = new Map<string, ScriptAudience>();
  /** Their ladder; null for file characters, whose own mind decides everything. */
  private readonly rungs: CharacterRungs | null;

  constructor(askerFor: JsonAsker | ((c: Character) => JsonAsker | null), model: string = ModelIds.Haiku, label: string | null = null, rungs: CharacterRungs | null = null) {
    this.askerFor = typeof askerFor === "function" ? askerFor : () => askerFor;
    this.model = model;
    this.labelText = label;
    this.rungs = rungs;
  }

  /** The same model characters, with `script` as their script mind. */
  withScript(script: ICharacterMind): LlmCharacterMind {
    const m = new LlmCharacterMind(this.askerFor, this.model, this.labelText, this.rungs);
    m.shadow = this.shadow;
    m.script = script;
    return m;
  }

  get label(): string {
    return this.labelText ?? `${ModelIds.display(this.model)} characters`;
  }

  authorFor(c: Character): string {
    return this.askerFor(c) === null ? this.script.label : this.label;
  }

  private async ask(
    key: string,
    turn: number,
    role: string,
    c: Character,
    user: string,
    schema: ReplySchema,
    signal?: AbortSignal,
    asOf: number | null = null,
    then: SpyReport | null = null,
    weighed: Weighed | null = null,
  ): Promise<JsonObject> {
    const asker = this.askerFor(c);
    if (asker === null) throw new Error(`No mind for ${c.id}.`);
    const spec: CallSpec = { key, turn, role, model: this.model, sharedSystem: CharacterSystem, seatSystem: selfText(c, turn, asOf, then), user, schema, effort: "low", maxTokens: OutputCaps.character };
    const r = this.rungs;
    if (r === null || weighed === null) return await asker.askJson(spec, signal);
    // The ladder: the character's own (small) model first; it may pass a matter up, or ask counsel, to the rung above.
    const climbed = await r.ladder.climb(
      {
        spec,
        small: this.model,
        large: r.up ?? this.model,
        start: "small",
        scriptMay: r.ladder.spending.active,
        stakes: weighed.stakes,
        keys: weighed.keys,
        differ: (a, b) => fieldsDiffer(a, b, weighed.fields),
      },
      signal,
    );
    if (climbed.json === null) throw new ScriptRung();
    return climbed.json;
  }

  /**
   * The script rung: when the budget cannot pay for a character's call, the script decides, and where others will read what
   * it decided, the small model words it in a phrasing call from the decision and the character's persona, without its
   * memory (in full press words are always a model's). A failed phrasing call leaves the script's own words.
   */
  private async orScript<T>(model: () => Promise<T>, script: () => Promise<T>, words: ((r: T) => [string, (s: string) => void]) | null, c: Character, turn: number, key: string, signal?: AbortSignal): Promise<T> {
    try {
      return await model();
    } catch (ex) {
      if (!(ex instanceof ScriptRung)) throw ex;
    }
    const r = await script();
    if (words === null) return r;
    const [text, set] = words(r);
    if (text.trim().length === 0) return r;
    try {
      const json = await this.rungs!.ladder.client.askJson(
        {
          key: `${key}/phrase`,
          turn,
          role: `phrase:${c.id}`,
          model: this.model,
          sharedSystem: "You put a decision already made into the words of one of the people of the Amarna age, in their own voice. Say nothing that is not in it, and promise nothing more. Reply with the reply tool.",
          seatSystem: `You speak as ${c.name}. ${currentPersona(c)}`,
          user: `Put this into your own words, as you would say or write it: "${text}"`,
          schema: Replies.text("speech", "The words, in one to four sentences."),
          effort: "low",
          maxTokens: OutputCaps.phrase,
        },
        signal,
      );
      const said = String(json.speech ?? "").trim();
      if (said.length > 0) set(said);
    } catch (ex) {
      if (ex instanceof Error && ex.name === "AbortError") throw ex;
    }
    return r;
  }

  private scriptAt(character: string, host: Power, turn: number): ScriptAudience {
    const key = `${character}/${host}/${turn}`;
    let a = this.scriptAudiences.get(key);
    if (a === undefined) this.scriptAudiences.set(key, (a = { kept: 0, swapped: false, gift: 0, ask: null }));
    return a;
  }

  /**
   * Asks the model, and with shadow set logs its decision beside the script's for the same situation (or, if the model's
   * reply failed, the script's alone with the error, before the runner's fallback plays it).
   */
  private async shadowed<T>(
    key: string,
    kind: string,
    c: Character,
    turn: number,
    ask: () => Promise<T>,
    script: () => Promise<T>,
    choice: (r: T) => CharacterChoice,
    situation: ((s: ShadowDecision) => void) | null = null,
    scriptChoice: ((r: T) => CharacterChoice) | null = null,
  ): Promise<T> {
    const log = this.shadow;
    if (log === null) return await ask();
    const shadow = newShadowDecision({ key, turn, kind, character: c.id, name: c.name, traits: traitLine(c), script: (scriptChoice ?? choice)(await script()) });
    situation?.(shadow);
    try {
      const r = await ask();
      shadow.model = choice(r);
      log(shadow);
      return r;
    } catch (ex) {
      if (ex instanceof Error && ex.name === "AbortError") throw ex;
      shadow.error = ex instanceof Error ? ex.message : String(ex);
      log(shadow);
      throw ex;
    }
  }

  present(ctx: EnvoyContext, signal?: AbortSignal): Promise<PresentResult> {
    if (this.askerFor(ctx.self) === null) return this.script.present(ctx, signal);
    return this.shadowed(
      `t${ctx.turn}/aud/present/${ctx.self.id}`,
      "present",
      ctx.self,
      ctx.turn,
      () =>
        this.orScript(
          () => this.modelPresent(ctx, signal),
          () => this.script.present(ctx, signal),
          (r) => [r.speech, (x) => (r.speech = x)],
          ctx.self,
          ctx.turn,
          `t${ctx.turn}/aud/present/${ctx.self.id}`,
          signal,
        ),
      async () => {
        const r = await this.script.present(ctx, signal);
        // What the script would have kept, and whether its forgery would have hidden it, as the engine would judge.
        const kept = clamp(r.skim, 0, ctx.dispatch.gold);
        const mine = this.scriptAt(ctx.self.id, ctx.host, ctx.turn);
        mine.kept = kept;
        mine.swapped = r.swapInventory && kept > 0 && kept < ctx.dispatch.gold && ctx.self.belief.forge >= ctx.forgeMinCompetence;
        return r;
      },
      (r) =>
        newCharacterChoice({ text: r.speech, kept: clamp(r.skim, 0, ctx.dispatch.gold), swap: r.swapInventory, flags: CharacterChecks.present(ctx, r.speech) }),
      (s) => {
        s.goldCarried = ctx.dispatch.gold;
      },
    );
  }

  react(ctx: EnvoyContext, host: HostReply, signal?: AbortSignal): Promise<EnvoyReaction> {
    if (this.askerFor(ctx.self) === null) return this.script.react(ctx, host, signal);
    return this.shadowed(
      `t${ctx.turn}/aud/react/${ctx.self.id}/${ctx.round}`,
      "react",
      ctx.self,
      ctx.turn,
      () =>
        this.orScript(
          () => this.modelReact(ctx, host, signal),
          () => this.script.react(ctx, host, signal),
          (r) => [r.speech, (x) => (r.speech = x)],
          ctx.self,
          ctx.turn,
          `t${ctx.turn}/aud/react/${ctx.self.id}/${ctx.round}`,
          signal,
        ),
      async () => {
        const r = await this.script.react(ctx, host, signal);
        // The gift the script would have taken: the first it accepts at the audience, as the engine counts one.
        const mine = this.scriptAt(ctx.self.id, ctx.host, ctx.turn);
        if (host.bribe > 0 && r.acceptBribe && mine.gift === 0) {
          mine.gift = host.bribe;
          mine.ask = host.bribeAsk;
        }
        return r;
      },
      (r) =>
        newCharacterChoice({
          text: r.speech,
          acceptGift: r.acceptBribe && host.bribe > 0,
          acceptService: r.acceptJob && host.jobOffer > 0,
          commitments: r.commitments,
        }),
      (s) => {
        s.giftOffered = host.bribe;
        s.serviceOffered = host.jobOffer;
      },
    );
  }

  write(ctx: MindContext, signal?: AbortSignal): Promise<MindReply> {
    if (this.askerFor(ctx.self) === null) return this.script.write(ctx, signal);
    if (ctx.request.task === "Life") return this.live(ctx, signal);
    if (ctx.request.task === "Chief" || ctx.request.task === "Reports" || ctx.request.task === "Unheard") return this.onTheRoad(ctx, signal);
    if (ctx.request.task === "Bridge") return this.bridging(ctx, signal);
    const key = writeKey(ctx);
    if (key === null) return Promise.resolve(newMindReply());
    const kind = ctx.request.task === "EnvoyReport" ? "report" : ctx.request.task === "Pitch" ? "pitch" : ctx.request.task === "SpyReport" ? "spy" : "memory";
    // The script writes, and is checked, in its own situation: what it did itself at the audience, not what the model did.
    const mine = this.shadow === null ? ctx : this.scriptSituation(ctx);
    return this.shadowed(
      key,
      kind,
      ctx.self,
      ctx.turn,
      () =>
        this.orScript(
          () => this.modelWrite(ctx, key, signal),
          () => this.script.write(ctx, signal),
          // A summary of its own memory is read by nobody else: it needs no words of a model's.
          ctx.request.task === "SummarizeMemory" ? null : (r) => [r.text, (x) => (r.text = x)],
          ctx.self,
          ctx.turn,
          key,
          signal,
        ),
      () => this.script.write(mine, signal),
      (r) => choiceOf(ctx, r),
      (s) => {
        s.goldCarried = ctx.request.task === "EnvoyReport" ? (ctx.request.cargo?.gold ?? 0) : 0;
        s.known = CharacterChecks.known(ctx);
      },
      (r) => choiceOf(mine, r),
    );
  }

  /**
   * Its own season (item 11a): one call, decided by the model (the script decides where the budget's ladder says so), and
   * shadowed by the script's choice like any other written decision.
   */
  private live(ctx: MindContext, signal?: AbortSignal): Promise<MindReply> {
    const v = ctx.request.life;
    if (v === null) return Promise.resolve(newMindReply());
    const c = ctx.self;
    const key = `t${ctx.turn}/life/${c.id}`;
    const model = async (): Promise<MindReply> => {
      const json = await this.ask(key, ctx.turn, `life:${c.id}`, c, lifeText(v), lifeSchema(v), signal, null, null, {
        stakes: { kind: "life", moved: 0.3 },
        keys: [`t${ctx.turn}/mind/${ctx.request.id}`],
        fields: [],
      });
      return newMindReply({ life: lifeOf(json, v) });
    };
    const choice = (r: MindReply): CharacterChoice => newCharacterChoice({ text: lifeSummary(r.life) });
    return this.shadowed(
      key,
      "life",
      c,
      ctx.turn,
      () => this.orScript(model, () => this.script.write(ctx, signal), null, c, ctx.turn, key, signal),
      () => this.script.write(ctx, signal),
      choice,
    );
  }

  /** Item 12: a go-between in someone else's pay passes an envoy's words on as he chooses; one call, shadowed by the script. */
  private bridging(ctx: MindContext, signal?: AbortSignal): Promise<MindReply> {
    const c = ctx.self;
    const v = ctx.request.bridge;
    if (v === null) return Promise.resolve(newMindReply());
    const key = `t${ctx.turn}/bridge/${c.id}/${ctx.request.id}`;
    const model = async (): Promise<MindReply> => {
      const lines = v.clauses.map((x) => renderClauses([x], v.from, v.host));
      const json = await this.ask(key, ctx.turn, `bridge:${c.id}`, c, bridgeText(v, lines), bridgeSchema(), signal, null, null, {
        stakes: { kind: "bridge", moved: 0.3 },
        keys: [`t${ctx.turn}/mind/${ctx.request.id}`],
        fields: [],
      });
      const out = bridgeOf(json, v);
      return newMindReply({ text: out.text, clauses: out.clauses });
    };
    const choice = (r: MindReply): CharacterChoice => newCharacterChoice({ text: r.text === v.speech && r.clauses.length === v.clauses.length ? "as spoken" : "changed" });
    return this.shadowed(
      key,
      "bridge",
      c,
      ctx.turn,
      () => this.orScript(model, () => this.script.write(ctx, signal), null, c, ctx.turn, key, signal),
      () => this.script.write(ctx, signal),
      choice,
    );
  }

  /**
   * A chief's season for his band, or a spy's choice for its waiting reports (Haakon's answers to item 11b): one call each,
   * on the ladder like its own season, shadowed by the script, which leaves both to the traits.
   */
  private onTheRoad(ctx: MindContext, signal?: AbortSignal): Promise<MindReply> {
    const c = ctx.self;
    const chief = ctx.request.task === "Chief" ? ctx.request.chief : null;
    const reports = ctx.request.task === "Reports" ? ctx.request.reports : null;
    // Item 12: an envoy nobody understands, choosing to stay, go home, or say his message was delivered.
    const unheard = ctx.request.task === "Unheard" ? ctx.request.unheard : null;
    if (chief === null && reports === null && unheard === null) return Promise.resolve(newMindReply());
    const kind = chief !== null ? "chief" : reports !== null ? "carry" : "unheard";
    const key = `t${ctx.turn}/${kind}/${c.id}`;
    const model = async (): Promise<MindReply> => {
      const user = chief !== null ? chiefText(chief) : reports !== null ? reportsText(reports) : unheardText(unheard!);
      const schema = chief !== null ? chiefSchema(chief) : reports !== null ? reportsSchema(reports) : unheardSchema(unheard!);
      // A chief stakes his men, his purse and his neck; a spy its post and a little of its purse; an unheard envoy his errand.
      const json = await this.ask(key, ctx.turn, `${kind}:${c.id}`, c, user, schema, signal, null, null, {
        stakes: { kind, moved: chief !== null ? 0.5 : 0.2 },
        keys: [`t${ctx.turn}/mind/${ctx.request.id}`],
        fields: [],
      });
      return chief !== null ? newMindReply({ chief: chiefOf(json, chief) }) : reports !== null ? newMindReply({ reports: reportsOf(json, reports) }) : newMindReply({ unheard: unheardOf(json, unheard!) });
    };
    const choice = (r: MindReply): CharacterChoice => newCharacterChoice({ text: chief !== null ? chiefSummary(r.chief) : reports !== null ? reportsSummary(r.reports) : unheardSummary(r.unheard) });
    return this.shadowed(
      key,
      kind,
      c,
      ctx.turn,
      () => this.orScript(model, () => this.script.write(ctx, signal), null, c, ctx.turn, key, signal),
      () => this.script.write(ctx, signal),
      choice,
    );
  }

  /**
   * The situation a report's shadow is written in: the model's, except for what the script chose otherwise at that
   * audience (the gold it kept and the forgery that hid it, and the gift it took or refused).
   */
  private scriptSituation(ctx: MindContext): MindContext {
    const trail = ctx.trail;
    if (ctx.request.task !== "EnvoyReport" || trail === null || trail.audienceTurn === null) return ctx;
    const mine = this.scriptAudiences.get(`${ctx.self.id}/${trail.to}/${trail.audienceTurn}`);
    if (mine === undefined) return ctx;
    const host = trail.to;
    const outcomes = trail.outcomes.filter((o) => !o.startsWith("kept ") && !o.startsWith("replaced the inventory with a forgery"));
    if (mine.kept > 0) {
      outcomes.splice(0, 0, `kept ${mine.kept} shekels of the gold`);
      if (mine.swapped) outcomes.splice(1, 0, `replaced the inventory with a forgery stating ${trail.goldStated - mine.kept} shekels`);
    }

    let self = ctx.self;
    const took = outcomes.findIndex((o) => o.startsWith("accepted "));
    const amount = took >= 0 ? between(outcomes[took], "accepted ", " from ") : null;
    if (took >= 0 && mine.gift === 0 && amount !== null) {
      outcomes[took] = `refused a gift of ${amount} from ${host}`;
      self = clone(CharacterSchema, self);
      const facts = self.facts;
      for (let i = facts.length - 1; i >= 0; i--)
        if (facts[i].tag === "bribe" && facts[i].text === `Took ${amount} from the king of ${land(host)}.`) {
          facts.splice(i, 1);
          break;
        }
    } else if (took < 0 && mine.gift > 0) {
      const gift = formatMoney(mine.gift);
      const refused = outcomes.findIndex((o) => o === `refused a gift of ${gift} from ${host}`);
      if (refused >= 0) {
        outcomes[refused] = `accepted ${gift} from ${host}` + (isBlank(mine.ask) ? "" : ` (asked: ${mine.ask})`);
        self = clone(CharacterSchema, self);
        self.facts.push({ id: "shadow", text: `Took ${gift} from the king of ${land(host)}.`, secrecy: "Hidden", tag: "bribe", knownBy: [host], alias: null });
      }
    }
    if (seqEqual(outcomes, trail.outcomes)) return ctx;

    const situation = clone(MessageTrailSchema, trail);
    situation.outcomes = outcomes;
    return newMindContext({
      request: ctx.request,
      self,
      turn: ctx.turn,
      seed: ctx.seed,
      trail: situation,
      basePrice: ctx.basePrice,
      demand: ctx.demand,
      forgeMinCompetence: ctx.forgeMinCompetence,
    });
  }

  private async modelPresent(ctx: EnvoyContext, signal?: AbortSignal): Promise<PresentResult> {
    const d = ctx.dispatch;
    const user = new Sb();
    // A false envoy (item 10+b): nobody sent it; it has only its own words.
    if (d.pretended) {
      user.appendLine(
        `You stand before the king at ${courtOf(ctx.host)}, saying you are the envoy of ${kingOf(ctx.sender)}, whom you do not serve. You bring no letter, no sealed greeting and no seal; you came for the gifts a host gives an envoy, and whatever he gives you, or sends with you for that king, is yours to keep.`,
      );
      user.appendLine("Speak to the king now.");
      const json = await this.ask(`t${ctx.turn}/aud/present/${ctx.self.id}`, ctx.turn, `envoy:${ctx.self.id}`, ctx.self, user.toString(), Replies.text("speech", "What you say to the king, in a few sentences."), signal, null, null, {
        stakes: { kind: "present", moved: 0.1 },
        keys: ctx.audienceKey.length > 0 ? [`${ctx.audienceKey}/present`] : [],
        fields: [],
      });
      return Parse.present(json);
    }
    user.appendLine(`You have arrived at ${courtOf(ctx.host)}, as the envoy of ${kingOf(ctx.sender)}.`);
    user.appendLine(d.greetingText.length > 0 ? `The sealed greeting will be read out exactly as written: "${d.greetingText}"` : "The tablet carries no greeting at all; the king will notice.");
    user.appendLine(`Your lord's message, which you must now deliver, word for word or in your own words: "${d.letter}"`);
    user.appendLine(d.mandate.length > 0 ? `Your mandate (what you may agree to): "${d.mandate}"` : "You were given no mandate to agree to anything.");
    const forger = canForge(ctx.self, ctx.forgeMinCompetence);
    if (d.gold > 0)
      user.appendLine(
        `You carry gold in sealed bags, with an inventory tablet sealed by your lord that says ${d.gold} shekels; the king's weighers will weigh the gold against it. ` + keepLine(forger),
      );
    if (d.proposal !== null) user.appendLine(`You carry a tablet for the king to seal: "${d.proposal.text}"`);
    // Item 11a+: the clauses it recites, which it may change as any envoy may (leave_out, add_courtesy, gift_stated).
    const gift = d.clauses.find((x) => x.kind === "gift" && x.amount !== null) ?? null;
    if (d.clauses.length > 0)
      user.appendLine(
        `The letter's clauses, which the king's scribes hear as you recite them and his answer follows: ${d.clauses.map((x, i) => `${i + 1}. ${clauseTag(x)}`).join("; ")}. You may leave some out, add good wishes your lord did not write${gift !== null ? ", or state the gift as less than it is" : ""}; your lord learns only what you report.`,
      );
    user.appendLine("Speak to the king now.");
    // The gold questions only when it carries gold, and the swap only when its hand could fake the seal.
    const weighed: Weighed = {
      stakes: { kind: "present", moved: 0.1 + share(ctx.self, d.gold) + (d.proposal !== null ? 0.3 : 0) },
      keys: ctx.audienceKey.length > 0 ? [`${ctx.audienceKey}/present`] : [],
      fields: ["keep_gold", "swap_inventory", "as_written", "leave_out", "add_courtesy", "gift_stated"],
    };
    const json = await this.ask(
      `t${ctx.turn}/aud/present/${ctx.self.id}`,
      ctx.turn,
      `envoy:${ctx.self.id}`,
      ctx.self,
      user.toString(),
      Replies.present(d.gold > 0, forger, d.clauses.length, gift !== null),
      signal,
      null,
      null,
      weighed,
    );
    const r = Parse.present(json);
    // Passed on as written: the lord's own words, read out; the envoy wrote nothing but that choice.
    if (json.as_written === true) r.speech = `Thus says ${kingOf(ctx.sender)}: "${d.letter}"`;
    r.skim = clamp(r.skim, 0, d.gold);
    // The clauses it recites (item 11a+): as written, unless it chose to change them as any envoy may.
    // Passed on as written, the clauses go as written too.
    r.clauses = json.as_written === true ? d.clauses.map((x) => ({ ...x })) : recitedBy(d.clauses, json);
    // Nothing kept, nothing to hide: the engine ignores a swap then anyway. A swap it was not asked about is not made.
    if (r.skim === 0 || !forger) r.swapInventory = false;
    return r;
  }

  private async modelReact(ctx: EnvoyContext, host: HostReply, signal?: AbortSignal): Promise<EnvoyReaction> {
    const user = new Sb();
    user.appendLine(
      ctx.dispatch.pretended
        ? `You stand before ${kingOf(ctx.host)}, saying you are the envoy of ${land(ctx.sender)}, whom you do not serve. You said: "${ctx.delivered}"`
        : `You stand before ${kingOf(ctx.host)} as envoy of ${land(ctx.sender)}. You said: "${ctx.delivered}"`,
    );
    for (const x of ctx.soFar) user.appendLine(`The king said: "${x.host}" You answered: "${x.envoy}"`);
    user.appendLine(`The king now says: "${host.speech}"`);
    // An envoy takes one gift per audience: a gift offered after it took one is not given, so it is not asked about it.
    const giftOpen = host.bribe > 0 && !ctx.giftTaken;
    if (giftOpen) user.appendLine(`He offers you a personal gift of ${host.bribe} shekels` + (host.bribeAsk.length > 0 ? `, asking in return: "${host.bribeAsk}"` : "."));
    else if (host.bribe > 0)
      user.appendLine(`He offers you another gift of ${host.bribe} shekels, but an envoy takes one gift at an audience and you have taken his already, so it will not be given.`);
    if (host.jobOffer > 0) user.appendLine(offerLine(ctx, host.jobOffer));
    if (host.detain) user.appendLine("He orders that you may not leave his court.");
    if (host.sealProposal) user.appendLine("He has sealed the tablet you brought.");
    // A tablet of the host's own, asked about only of an envoy that carries its lord's seal (item 9).
    const a = ctx.dispatch.authority;
    const tabletOffered = host.counter !== null && (a?.seal ?? false);
    if (tabletOffered) {
      const words = host.counter!.text.length > 0 ? host.counter!.text : renderClauses(host.counter!.clauses, ctx.host, ctx.sender);
      user.appendLine(`He offers you a tablet of his own to seal in your lord's name: "${words}"`);
      // What the engine grants and checks the limits by: its clauses, whatever its words say.
      if (host.counter!.clauses.length > 0) user.appendLine(`Its clauses, which are what binds your lord: ${host.counter!.clauses.map(clauseTag).join("; ")}.`);
      user.appendLine(authorityText(a!, (x) => WorldMap.default.get(x).name));
    } else if (host.counter !== null) user.appendLine("He offers you a tablet of his own to seal, but you do not carry your lord's seal: you cannot.");
    // Gold for its lord is handed over when the audience ends, and only if the envoy goes home with it and the host can pay.
    if (host.goldBack > 0 && !host.detain)
      user.appendLine(
        `He names ${host.goldBack} shekels of gold to send home with you for your lord: it is handed to you when the audience ends, if his treasury can pay it` +
          (host.jobOffer > 0 ? " and you go home to your lord" : "") +
          ".",
      );
    user.appendLine(ctx.dispatch.mandate.length > 0 ? `Your mandate: "${ctx.dispatch.mandate}"` : "You have no mandate to agree to anything.");
    user.appendLine("Answer the king, and make your decisions.");
    const json = await this.ask(
      `t${ctx.turn}/aud/react/${ctx.self.id}/${ctx.round}`,
      ctx.turn,
      `envoy:${ctx.self.id}`,
      ctx.self,
      user.toString(),
      Replies.react(giftOpen, host.jobOffer > 0, tabletOffered),
      signal,
      null,
      null,
      {
        stakes: { kind: "react", moved: 0.1 + share(ctx.self, (giftOpen ? host.bribe : 0) + host.jobOffer * 4) + (host.detain ? 0.5 : 0) },
        keys: ctx.audienceKey.length > 0 ? [`${ctx.audienceKey}/envoy/${ctx.round}`] : [],
        fields: ["accept_gift", "accept_service"],
      },
    );
    const r = Parse.react(json);
    if (!tabletOffered) r.sealCounter = false;
    if (!giftOpen) r.acceptBribe = false;
    if (host.jobOffer <= 0) r.acceptJob = false;
    return r;
  }

  private async modelWrite(ctx: MindContext, key: string, signal?: AbortSignal): Promise<MindReply> {
    const c = ctx.self;
    const req = ctx.request;
    switch (req.task) {
      case "EnvoyReport": {
        const t = ctx.trail;
        const cargo = req.cargo ?? newHomeCargo();
        const lord = requestFor(req);
        // One dismissed while away still reports to the king who sent it, who is no longer its lord.
        const still = c.employer === lord;
        const him = still ? "your lord" : king(lord);
        const user = new Sb();
        user.appendLine(
          still
            ? `You are home at the court of your lord, ${kingOf(lord)}.`
            : `You are back at the court of ${kingOf(lord)}, who sent you on this mission. He dismissed you while you were away, so he is no longer your lord, but you report to him on the mission he gave you.`,
        );
        // An envoy that was never received is not asked about an audience it never had.
        if (t !== null && t.audienceTurn === null && t.exchanges.length === 0)
          user.appendLine(`You went to the court of ${land(t.to)}, but you were never received there: you came back without an audience.`);
        else if (t !== null) {
          user.appendLine(`You went to the court of ${land(t.to)}. You told its king: "${t.delivered}"`);
          for (const x of t.exchanges) user.appendLine(`The king said: "${x.host}"` + (x.envoy.length > 0 ? ` You answered: "${x.envoy}"` : ""));
          // What the audience brought about, as the engine records it; what the envoy itself promised is its own line.
          const happened = t.outcomes.filter((o) => commitment(o) === null);
          if (happened.length > 0) user.appendLine("What happened: " + joinS("; ", happened) + ".");
          const promised = t.outcomes.map(commitment).filter((x): x is string => x !== null);
          if (promised.length > 0)
            user.appendLine(
              `What you yourself promised on ${still ? "your lord's" : "his"} behalf, in your own words at the audience (your promise, not anything the king did or sealed): ` +
                joinS(
                  " ",
                  promised.map((x) => `"${x}"`),
                ),
            );
        }
        if (cargo.wasDetained) user.appendLine("You were held there against your will before being let go.");
        if (cargo.observations.length > 0) user.appendLine("What you noticed at that court: " + joinS(" ", cargo.observations));
        const forger = canForge(c, ctx.forgeMinCompetence);
        if (cargo.gold > 0) user.appendLine(`You carry back gold the king sent ${him}, with an inventory tablet sealed by that king that says ${cargo.goldStated} shekels. ` + keepLine(forger));
        user.appendLine(`Write your report to ${still ? "your lord" : "him"} now.`);
        const received = t !== null && t.exchanges.length > 0;
        // Item 11a+: the king's answer in clauses, which it may report as any envoy may.
        const answers = t !== null ? t.exchanges.flatMap((x) => x.clauses.map((y) => ({ ...y }))) : [];
        if (answers.length > 0) user.appendLine(`The king's answer in clauses, which your lord reads as you report them: ${answers.map((x, i) => `${i + 1}. ${clauseTag(x)}`).join("; ")}. You may leave some out, or report a refusal as acceptance.`);
        const json = await this.ask(key, ctx.turn, `envoy:${c.id}`, c, user.toString(), Replies.report(cargo.gold > 0, forger, still, received, answers.length), signal, null, null, {
          stakes: { kind: "report", moved: 0.15 + share(c, cargo.gold) },
          keys: [`t${ctx.turn}/mind/${req.id}`],
          fields: ["keep_gold", "swap_inventory", "as_given", "answers_left_out", "refusals_as_accepted"],
        });
        const r = Parse.report(json);
        // Reported as given: the king's answer word for word, and what happened, as the engine has them.
        if (received && json.as_given === true) r.text = asGiven(t!);
        r.number = clamp(r.number, 0, cargo.gold);
        if (r.number === 0 || !forger) r.swapInventory = false;
        // The king's answer in clauses goes home as the envoy chose to report it (item 11a+).
        r.clauses = received && json.as_given === true ? answers : reportedBy(answers, json);
        return r;
      }
      case "Pitch": {
        const court = requestFor(req);
        const user =
          `${Views.capitalized(courtOf(court))} is looking for envoys and agents, and you have come before the king. ` +
          `Present yourself in a few sentences and name what you ask a season of a job's term (the king offers a whole fee for a term, part of it now and the rest when the job is done). Someone like you usually asks about ${ctx.basePrice} shekels a season at the going rate; ` +
          `${ctx.demand > 1 ? "several courts are looking for people right now" : "few courts are hiring right now"}.` +
          // Item 11a, "Hiring as a negotiation": real offers it may cite, or not; a claimed offer is words, true or false.
          ([...c.offers.keys()].length > 0 ? ` Real offers made to you last season: ${[...c.offers.entries()].map(([p, r]) => `the king of ${land(p)}, ${r} a season`).join("; ")}. You may cite one, or invent one; the king cannot check it here.` : "") +
          // Item 10: a court that has never seen it knows it only by the name it gives.
          (req.aliases.length > 0 ? " This court has never seen you, and knows you only by the name you give it." : "");
        const json = await this.ask(key, ctx.turn, `candidate:${c.id}`, c, user, Replies.pitch(req.aliases[0] ?? null, req.envoyOf !== null ? land(req.envoyOf) : null), signal, null, null, {
          stakes: { kind: "pitch", moved: 0.1 },
          keys: [`t${ctx.turn}/mind/${req.id}`],
          fields: ["asking_price"],
        });
        return Parse.pitch(json, req.envoyOf);
      }
      case "SpyReport": {
        const r = req.report ?? newSpyReport();
        const user = new Sb();
        user.appendLine(
          `You are quietly watching ${r.court !== null ? "the court of " + land(r.court) : (WorldMap.default.find(r.province)?.name ?? "a province")} for your lord.`,
        );
        user.appendLine("This season you observed: " + joinS(" ", r.observations));
        // The copies that reach the archive with it, as the engine's line lists them.
        if (req.copyIds.length > 0)
          user.appendLine(
            `You also copied ${req.copyIds.length === 1 ? "a tablet" : `${req.copyIds.length} tablets`} from the court's archive (you remember what it says); the copy goes home with this report, whatever you write.`,
          );
        if (!isBlank(r.poison)) user.appendLine(`Your secret masters want your lord to hear this, as if you had seen it yourself: "${r.poison}"`);
        user.appendLine("Write your report home, to be carried by a trusted messenger.");
        // Written when it arrives, of the season it was observed: the spy remembers nothing that happened to it since.
        const json = await this.ask(key, ctx.turn, `spy:${c.id}`, c, user.toString(), Replies.text("report", "Your report home."), signal, r.observedTurn > 0 ? r.observedTurn : null, r, {
          stakes: { kind: "spy", moved: 0.2 },
          keys: [`t${ctx.turn}/mind/${req.id}`],
          fields: [],
        });
        return newMindReply({ text: Parse.field(json, "report") });
      }
      case "Questioned": {
        // Item 10+b: the questioning broke it on these tablets; what it says now is its own choice.
        const host = requestFor(req);
        // A lie needs a lord to lie for: one whose kingdom fell is offered none.
        const was = c.employer ?? c.formerEmployer;
        const lord = was !== null && ctx.alive.includes(was) ? was : null;
        const user = new Sb();
        user.appendLine(`You are a captive at the court of ${kingOf(host)}, and its questioners have pressed you until you gave way.`);
        user.appendLine("They will have from you what you know of these tablets, which passed through your hands:");
        for (const id of req.copyIds) {
          const t = ctx.tablets.get(id);
          if (t !== undefined) user.appendLine(`- ${cap(t, 400)}`);
        }
        const kings = lord === null ? [] : AllPowers.filter((q) => q !== host && q !== lord && ctx.alive.includes(q)).map((q) => land(q));
        if (lord !== null)
          user.appendLine(
            `You may tell them what these say, or recite instead a tablet that never was, a league of ${kingOf(lord)} with another king against your captor, to mislead them; only an examination of the tablet can show it false.`,
          );
        user.appendLine("Say what you say to them.");
        const json = await this.ask(key, ctx.turn, `captive:${c.id}`, c, user.toString(), Replies.questioned(kings), signal, null, null, {
          stakes: { kind: "questioned", moved: 0.2 },
          keys: [`t${ctx.turn}/mind/${req.id}`],
          fields: ["lie"],
        });
        const r = Parse.questioned(json);
        if (lord === null) r.lies = false;
        return r;
      }
      case "SummarizeMemory": {
        const user = new Sb();
        user.appendLine(
          "Your memory is growing long. Fold your older memories into a short summary, in your own voice, of what you want to remember about your life: whom you serve and have served, who paid you and for what, debts, promises and grudges, secrets you learned, courts you liked or feared. Under 150 words. Keep names, amounts and seasons that matter to you.",
        );
        if (c.memorySummary.length > 0) user.appendLine(`Your summary so far: ${c.memorySummary}`);
        user.appendLine("Older memories to fold in:");
        for (const m of req.facts) user.appendLine("- " + cap(m, 500));
        const json = await this.ask(key, ctx.turn, `memory:${c.id}`, c, user.toString(), Replies.text("summary", "The new summary of your older memories."), signal, null, null, {
          stakes: { kind: "memory", moved: 0.05 },
          keys: [`t${ctx.turn}/mind/${req.id}`],
          fields: [],
        });
        return newMindReply({ text: Parse.field(json, "summary") });
      }
    }
    return newMindReply();
  }
}
