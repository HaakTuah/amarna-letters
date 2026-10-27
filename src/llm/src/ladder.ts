/**
 * The ladder of every job ("Minds follow what is at stake", built in item 6c): the script, a small model and a large one,
 * each rung any provider's model. A decision goes to the rung the budget buys for it (where it starts, with nothing set to
 * spend by). The small rung may pass a matter up whole, with its reason, or keep it and ask the large rung's counsel from
 * a brief of its own, never the whole request; a reply of the small rung that would commit its mind goes up too, since only
 * the top rung commits. A share of the small rung's decisions is also put, out of play, to the rung above: the audit's
 * answer is never used, and the log keeps how far the two differed. Nothing in a request tells a mind which rung it is
 * playing on beyond what the small rung may do; the log records the rung of every decision and why.
 */
import { newAudit, type Audit, type Route } from "@amarna/game";
import { z } from "zod";
import type { CallSpec, JsonAsker } from "./client.ts";
import type { PriceTable } from "./models.ts";
import { object, type JsonObject, type ReplySchema } from "./schemas.ts";
import { Spending, callCost, type Rung, type RungOption, type Stakes } from "./spending.ts";

/** What the small rung reads after its request: what it may do besides answering. */
export const SmallNote =
  "\n\nBEFORE YOU ANSWER: if this matter is weightier than it looks, or you are unsure what you would want, you may leave it for fuller deliberation: give your reason in pass_up, and nothing else in your reply is used. Or keep it and first take counsel: write in ask_counsel a brief of a few hundred words (the situation, your options and what you are unsure of), and you are asked again with the counsel. Otherwise leave both empty.";

const PassUp = z.string().describe("Empty to decide now. Otherwise why this matter needs fuller deliberation: nothing else in your reply is then used.");
const AskCounsel = z
  .string()
  .describe("Empty for none. Otherwise a brief of a few hundred words for counsel: the situation, your options and what you are unsure of. You are asked again, with the counsel.");

/** A schema with the small rung's fields added: passing up, and (until counsel is taken) asking for it. */
export function withLadder(schema: ReplySchema, counsel = true): ReplySchema {
  return schema.extend(counsel ? { pass_up: PassUp, ask_counsel: AskCounsel } : { pass_up: PassUp });
}

/** The fixed part of every counsel call. */
const CounselSystem =
  "You give counsel to a ruler, or to a servant of one, in the Late Bronze Age, from a brief they wrote you. Answer the brief alone: weigh their options and say what you would do and why, in a few short paragraphs. Reply with the reply tool.";
/** What a counsel call answers. */
export const counselSchema = (): ReplySchema => object(["counsel", z.string().describe("Your counsel, in a few short paragraphs.")]);

/** One decision to climb the ladder with. */
export interface Climb {
  /** The request as the large rung would read it; the small rung reads it with its own fields added. */
  spec: CallSpec;
  small: string | null;
  large: string;
  /** Where the decision goes with nothing set to spend by: "small" for routine matters and characters, "large" otherwise. */
  start: Rung;
  /** Whether the script may decide it when the budget cannot pay ("What the script may do for a model-played mind"). */
  scriptMay: boolean;
  stakes: Stakes;
  /** The decisions it takes, as the log keys them. */
  keys: string[];
  /** Why a small rung's reply would commit its mind (then it goes up), or null. */
  commits?: (json: JsonObject) => string | null;
  /** How far two replies differ, 0 (the same) to 1, for audits. */
  differ: (a: JsonObject, b: JsonObject) => number;
}

/** Where a decision went, and the reply (null: the script decides it). */
export interface Climbed {
  json: JsonObject | null;
  rung: Rung;
  model: string;
  why: string;
  /** The counsel the small rung took, for the mind's record with its own thoughts; empty for none. */
  counsel: string;
}

export interface LadderHooks {
  route(key: string, r: Route): void;
  audit(a: Audit): void;
}

export class Ladder {
  readonly client: JsonAsker;
  readonly spending: Spending;
  private readonly prices: PriceTable;
  private readonly hooks: LadderHooks;

  constructor(client: JsonAsker, spending: Spending, prices: PriceTable, hooks: LadderHooks) {
    this.client = client;
    this.spending = spending;
    this.prices = prices;
    this.hooks = hooks;
  }

  /** What a call of this request would cost on a model (null: its price is unknown): the shared part from cache. */
  cost(spec: CallSpec, model: string): number | null {
    const price = this.prices.for(model);
    if (price === null) return null;
    const out = Math.min(spec.maxTokens ?? 4000, 3000) / 2;
    return callCost(price, spec.sharedSystem.length, (spec.seatSystem ?? "").length + spec.user.length, out);
  }

  /** The rungs a decision may take, cheapest first. */
  private options(c: Climb): RungOption[] {
    const out: RungOption[] = [];
    if (c.scriptMay) out.push({ rung: "script", model: "", cost: 0 });
    if (c.small !== null && c.small !== c.large) out.push({ rung: "small", model: c.small, cost: this.cost(c.spec, c.small) });
    out.push({ rung: "large", model: c.large, cost: this.cost(c.spec, c.large) });
    return out;
  }

  private route(c: Climb, rung: Rung, model: string, why: string): void {
    this.routeKeys(c.keys, rung, model, why);
  }

  /** Tells the log which rung takes the decisions under these keys, and why. */
  routeKeys(keys: readonly string[], rung: Rung, model: string, why: string): void {
    for (const key of keys) this.hooks.route(key, { rung, model, why });
  }

  /** Logs an audit and moves the rung's rates by it. */
  recordAudit(a: Audit): void {
    this.spending.learn(a.kind, a.rung as Rung, a.mattered);
    this.hooks.audit(a);
  }

  /** The small rung's request: its model, its fields, and what it may do. */
  private smallSpec(c: Climb, counsel: string | null): CallSpec {
    return {
      ...c.spec,
      model: c.small!,
      user: c.spec.user + (counsel === null ? SmallNote : `${SmallNote}\n\nTHE COUNSEL YOU ASKED FOR: ${counsel}`),
      schema: withLadder(c.spec.schema, counsel === null),
    };
  }

  /** Climbs: the reply of the rung the decision goes to, or null where the script decides. */
  async climb(c: Climb, signal?: AbortSignal): Promise<Climbed> {
    const start: Rung = c.start === "small" && (c.small === null || c.small === c.large) ? "large" : c.start;
    const rung = this.spending.choose(c.spec.turn, c.stakes, this.options(c), start);
    const why = this.spending.active ? "the budget" : start === "small" ? "routine" : "the mind's own";
    if (rung === "script") {
      this.route(c, "script", "", why);
      return { json: null, rung, model: "", why, counsel: "" };
    }
    if (rung === "large") return await this.top(c, why, "", signal);
    let json = await this.client.askJson(this.smallSpec(c, null), signal);
    let counsel = "";
    const brief = String(json.ask_counsel ?? "").trim();
    if (brief.length > 0) {
      counsel = await this.counsel(c, brief, signal);
      json = await this.client.askJson(this.smallSpec(c, counsel), signal);
    }
    const passed = String(json.pass_up ?? "").trim();
    if (passed.length > 0) return await this.top(c, `passed up: ${passed}`, counsel, signal);
    const commits = c.commits?.(json) ?? null;
    if (commits !== null) return await this.top(c, `passed up: it commits (${commits})`, counsel, signal);
    delete json.pass_up;
    delete json.ask_counsel;
    const said = counsel.length > 0 ? `${why}, with counsel` : why;
    this.route(c, "small", c.small!, said);
    await this.audit(c, json, signal);
    return { json, rung: "small", model: c.small!, why: said, counsel };
  }

  /** The large rung decides: the request as it is. */
  private async top(c: Climb, why: string, counsel: string, signal?: AbortSignal): Promise<Climbed> {
    const json = await this.client.askJson({ ...c.spec, model: c.large }, signal);
    this.route(c, "large", c.large, why);
    return { json, rung: "large", model: c.large, why, counsel };
  }

  /** The large rung answers a brief: never the whole request. */
  async counsel(c: Climb, brief: string, signal?: AbortSignal): Promise<string> {
    const json = await this.client.askJson(
      {
        key: `${c.spec.key}/counsel`,
        turn: c.spec.turn,
        role: `counsel:${c.spec.role}`,
        model: c.large,
        sharedSystem: CounselSystem,
        user: brief,
        schema: counselSchema(),
        effort: "low",
        maxTokens: 1500,
      },
      signal,
    );
    return String(json.counsel ?? "").trim();
  }

  /**
   * An audit, for a share of the small rung's decisions: the same request put to the large rung out of play. Its answer is
   * never used; how far it differs, and how much that would have mattered, go to the log and move the rung's rates. A
   * failed audit call is let go: the decision stands either way.
   */
  private async audit(c: Climb, json: JsonObject, signal?: AbortSignal): Promise<void> {
    if (!this.spending.audited(c.spec.key)) return;
    let above: JsonObject;
    try {
      above = await this.client.askJson({ ...c.spec, key: `${c.spec.key}/audit`, model: c.large }, signal);
    } catch (ex) {
      if (ex instanceof Error && ex.name === "AbortError") throw ex;
      return;
    }
    const differ = Math.min(1, Math.max(0, c.differ(json, above)));
    const mattered = Math.min(1, differ * Spending.worth(c.stakes));
    this.recordAudit(newAudit({ key: c.spec.key, turn: c.spec.turn, kind: c.stakes.kind, rung: "small", model: c.small!, above: c.large, differ, mattered }));
  }
}

/** How far two replies differ in the fields named, each field alike: 0 the same, 1 every field otherwise. */
export function fieldsDiffer(a: JsonObject, b: JsonObject, fields: readonly string[]): number {
  if (fields.length === 0) return 0;
  let n = 0;
  for (const f of fields) {
    const x = a[f];
    const y = b[f];
    if (typeof x === "number" && typeof y === "number") n += Math.min(1, Math.abs(x - y) / Math.max(1, Math.abs(x), Math.abs(y)));
    else if (JSON.stringify(x ?? null) !== JSON.stringify(y ?? null)) n += 1;
  }
  return n / fields.length;
}
