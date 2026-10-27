/**
 * Stands in for the Anthropic API (tests and the "simulate" option): records every request and answers with valid JSON
 * chosen by looking at the schema the request asks for. Optional hooks inject bad output or refusals.
 */
import type { ApiTransport } from "./anthropic.ts";
import type { ApiResult } from "./client.ts";
import { ReportText, ReportToSender, type JsonObject } from "./schemas.ts";

export class SimulatedApi implements ApiTransport {
  readonly requests: JsonObject[] = [];
  override: ((body: JsonObject) => string | null) | null = null;
  refuse = false;
  /** Report token usage (tests check cost accounting); the in-app simulator reports none, so it costs nothing. */
  reportUsage = true;

  /** Bodies of the checks at setup it was asked to count. */
  readonly counted: JsonObject[] = [];
  /** A check at setup fails with this, as the API's error would read. */
  refuseCheck: string | null = null;

  count(body: JsonObject): Promise<void> {
    this.counted.push(body);
    return this.refuseCheck === null ? Promise.resolve() : Promise.reject(new Error(this.refuseCheck));
  }

  send(body: JsonObject): Promise<ApiResult> {
    this.requests.push(body);
    const tool = (body.tools as JsonObject[] | undefined)?.[0];
    const props = ((tool?.input_schema as JsonObject | undefined)?.properties as JsonObject | undefined) ?? null;
    const content = (body.messages as JsonObject[] | undefined)?.[0]?.content;
    const output = this.override?.(body) ?? answer(props, typeof content === "string" ? content : "");
    const model = typeof body.model === "string" ? body.model : "claude-sonnet-5-5";
    return Promise.resolve({
      text: output,
      stopReason: this.refuse ? "refusal" : "end_turn",
      category: null,
      model,
      input: this.reportUsage ? 1200 : 0,
      output: this.reportUsage ? 300 : 0,
      cacheRead: this.reportUsage ? 3000 : 0,
      cacheWrite: 0,
    });
  }
}

/** The canned reply to a request whose schema has these properties. */
export function answer(props: JsonObject | null, user = ""): string {
  const has = (name: string): boolean => props !== null && Object.prototype.hasOwnProperty.call(props, name);
  let o: JsonObject;
  const gold = (reply: JsonObject): void => {
    if (!has("keep_gold")) return;
    reply.keep_gold = 0;
    reply.swap_inventory = false;
  };
  if (has("units")) o = { notes: "Hold the line; keep Hatti friendly.", summary: "", ledger: [], units: [], letters: [], other_orders: [] };
  else if (has("answers")) {
    // A king holding court: one answer for each envoy the request names, by his id.
    const ids = [...user.matchAll(/\((c\d+)\), envoy of /g)].map((m) => m[1]);
    // Only the fields an answer asks: a small rung's routine answer has no seal, detention or service, and may pass him up.
    const item = (((props!.answers as JsonObject).items as JsonObject | undefined)?.properties as JsonObject | undefined) ?? {};
    const only = (a: JsonObject): JsonObject => (Object.keys(item).length === 0 ? a : Object.fromEntries(Object.keys(item).map((k) => [k, k in a ? a[k] : ""])));
    o = {
      answers: ids.map((envoy) => only({
        envoy,
        speech: "Tell your lord I am his brother.",
        clauses: [],
        gift_to_envoy: 0,
        gift_request: "",
        gift_news: [],
        offer_service_wage: 0,
        seal_tablet: true,
        your_tablet: "",
        your_tablet_clauses: [],
        detain_envoy: false,
        send_gold_back: 0,
        gold_back_purity: 100,
        end_audience: true,
      })),
      ledger: [],
    };
  }
  else if (has("gift_to_envoy"))
    o = {
      speech: "Tell your lord I am his brother.",
      gift_to_envoy: 0,
      gift_request: "",
      offer_service_wage: 0,
      seal_tablet: true,
      your_tablet: "",
      your_tablet_clauses: [],
      detain_envoy: false,
      send_gold_back: 0,
      gold_back_purity: 100,
      end_audience: true,
      ledger: [],
    };
  else if (has("commitments")) {
    // An envoy's answer: it is asked whether to take a gift or a post only when one is offered.
    o = { speech: "I thank you, Great King.", commitments: "" };
    if (has("accept_gift")) o.accept_gift = false;
    if (has("accept_service")) o.accept_service = false;
    if (has("seal_tablet")) o.seal_tablet = false;
  } else if (has("speech")) {
    // An envoy's presentation, with the gold fields only when it carries gold.
    o = { speech: "My lord greets you as a brother." };
    gold(o);
  } else if (has("report") && (has("keep_gold") || [ReportText, ReportToSender].some((t) => (((props!.report as JsonObject)?.description as string) ?? "").endsWith(t)))) {
    // An envoy's report home, to its lord or to the king who dismissed it while it was away.
    o = { report: "The king received me kindly." };
    gold(o);
  } else if (has("pitch")) o = { pitch: "I know every road from Ugarit to Babylon.", asking_price: 20 };
  else if (has("persona")) o = { persona: "You are a careful messenger who has seen many courts and trusts none of them entirely. You speak softly." };
  else if (has("summary")) o = { summary: "I have carried many messages and kept my own counsel." };
  else if (has("chronicle")) o = { chronicle: "Year 1. His Majesty triumphed in all things." };
  else if (has("report")) o = { report: "Nothing of note." };
  else o = {};
  // A simulated king plans nothing ahead: no standing orders and no schedule. Every field the schema asks for is answered.
  if (has("units")) {
    if (has("schedule")) o.schedule = [];
    if (has("standing_orders")) o.standing_orders = [];
    if (has("cancel_standing")) o.cancel_standing = [];
  }
  // Every other field the schema asks for gets its default, as a model is asked to write it: letters none, choices no.
  for (const [name, p] of Object.entries(props ?? {}))
    if (!(name in o)) {
      const type = (p as JsonObject).type;
      o[name] = type === "array" ? [] : type === "boolean" ? false : type === "integer" ? 0 : "";
    }
  return JSON.stringify(o);
}
