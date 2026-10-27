/**
 * Every state change a seat can ask for. Units are named by the province they stand in, as in Diplomacy
 * ("A memphis -> sinai"). Text never changes state: only these orders do, and only after the OrderValidator accepts them.
 * Each order is a plain object whose `type` names its kind, written first in JSON as the C# build's [JsonPolymorphic]
 * writes it.
 */
import { B, I, S, list, obj, opt, poly, type ObjSchema } from "../core/json.ts";
import { ScheduledOrdersSchema, StandingRequestSchema, type ScheduledOrders, type StandingRequest } from "./sleep.ts";
import { StandingAnswerRequestSchema, type StandingAnswerRequest } from "./answers.ts";
import { isBlank } from "../core/text.ts";
import type { UnitKind } from "./map.ts";
import type { Power } from "./power.ts";
import { type Clause, ClauseSchema } from "./clauses.ts";
import { GreetingOptionsSchema, TabletProposalSchema, type GreetingOptions, type TabletProposal } from "./records.ts";
import { AuthoritySchema, type Authority } from "./authority.ts";

export interface HoldOrder {
  type: "hold";
  unit: string;
}
export interface MoveOrder {
  type: "move";
  unit: string;
  to: string;
}
/** Support a unit standing in `supported`: to hold if `to` is null, else its move to `to`. */
export interface SupportOrder {
  type: "support";
  unit: string;
  supported: string;
  to?: string | null;
}
export interface ConvoyOrder {
  type: "convoy";
  unit: string;
  army: string;
  to: string;
}
/**
 * An army standing in a walled city it does not hold lays siege to it (Build order item 5): it holds there, and the city
 * is worn down a step each season it holds, two with an uncut support, until it surrenders. One order is enough: the
 * siege goes on each season the army holds there, until it leaves or is destroyed.
 */
export interface BesiegeOrder {
  type: "besiege";
  unit: string;
}
/**
 * Strengthen the walls of a province the seat holds by one level, at the end of the season (Build order item 5): a real
 * choice between defence and expansion, paid once and then in upkeep.
 */
export interface FortifyOrder {
  type: "fortify";
  province: string;
}
/**
 * The walls of a city of the seat's, with foreign troops within them, sally: they support one attack on those troops, the
 * move from `from` into the city, whoever makes it, for +1, a support that cannot be cut (Build order item 5; question 5,
 * plan step 8). Only walls of GameConfig.sallyMinWalls or more can sally.
 */
export interface SallyOrder {
  type: "sally";
  city: string;
  from: string;
}
/**
 * Sell grain from a province's stores at its own market (build order item 9+a, "Markets"): the market pays from its
 * people's purse, a little under its price, the lot priced along the curve, and buys no more than its purse can pay for.
 */
export interface SellOrder {
  type: "sell";
  province: string;
  amount: number;
}
/** Buy grain at a province's market into its stores, paid from the treasury a little over the market's price (item 9+a). */
export interface PurchaseOrder {
  type: "purchase";
  province: string;
  amount: number;
}
/** Hand grain from a province's stores to its town for nothing, into its market (item 9+a, "Kings can feed their towns"). */
export interface FeedOrder {
  type: "feed";
  province: string;
  amount: number;
}
/**
 * Send a caravan with grain from a province's stores to another province through the king's own land (item 9+a,
 * "Caravans carry a kingdom's goods"): it fills the baggage of his troops standing there and puts the rest in its stores.
 */
export interface CaravanOrder {
  type: "caravan";
  from: string;
  to: string;
  amount: number;
}
/**
 * Send a trading caravan (item 9+b, "Caravans carry a kingdom's goods"): grain from a province's stores and gold from the
 * treasury, through land open to it, to a foreign market, where it sells its grain and buys grain with its gold, and
 * home again with what it got. Smuggling (`sneak`): off the road and round the toll posts, through closed land too,
 * paying no tolls but at the risk of being found and losing its goods ("Tolls and smuggling").
 */
export interface TradeOrder {
  type: "trade";
  from: string;
  to: string;
  grain: number;
  gold: number;
  sneak: boolean;
}
/**
 * Put a fleet into cargo service (item 9+b, "Ships carry goods"): it loads grain from the stores of a harbour of its
 * king's on its waters and gold from the treasury, sails to another harbour, trades at its market (`trade`) or hands its
 * grain to its king's troops and stores there, and sails home, out of the war until it is back.
 */
export interface ShipOrder {
  type: "ship";
  fleet: string;
  from: string;
  to: string;
  grain: number;
  gold: number;
  trade: boolean;
}
/**
 * Set a toll on goods entering one's land (item 9+b, "Tolls and smuggling"): a percent of what crosses, in one province
 * or all one's land (`province` null), for one partner or everyone (`partner` null). It stands until changed.
 */
export interface TollOrder {
  type: "toll";
  province: string | null;
  partner: Power | null;
  percent: number;
}
export interface RaiseOrder {
  type: "raise";
  province: string;
  kind: UnitKind;
}
export interface DisbandOrder {
  type: "disband";
  unit: string;
}
export interface BuyProvinceOrder {
  type: "buy";
  province: string;
}
export interface CedeProvinceOrder {
  type: "cede";
  province: string;
  to: Power;
}
export interface GiftUnitOrder {
  type: "giftUnit";
  unit: string;
  to: Power;
}
/** Send an envoy abroad with a spoken message, a mandate, gold and tablets. */
export interface DispatchOrder {
  type: "dispatch";
  envoy: string;
  to: Power;
  letter: string;
  mandate: string;
  greeting?: GreetingOptions | null;
  gold: number;
  purityPercent: number;
  proposal?: TabletProposal | null;
  copies?: string[] | null;
  /** The letter's clauses (item 8): beside the words in full press, the whole letter in structured press. */
  clauses?: Clause[] | null;
  /** Gold sent without an inventory tablet (item 8): saves the scribe's fee, and nobody can check what arrived. */
  noInventory?: boolean | null;
  /** The envoy's authority (item 9): the seal, the limits the engine checks, and whether it shows them. None: no seal. */
  authority?: Authority | null;
}
/** Let a detained envoy (or captive) go home, optionally with a spoken reply. */
export interface ReleaseOrder {
  type: "release";
  character: string;
  reply: string;
}
export interface SeekCandidatesOrder {
  type: "seekCandidates";
}
export interface HireOrder {
  type: "hire";
  character: string;
  wage: number;
  term: number;
}
/**
 * Keep one of your own people on at a new wage, for a new term. Not a task: the servant may be renewed and sent on an
 * errand in the same season.
 */
export interface RenewOrder {
  type: "renew";
  character: string;
  wage: number;
  term: number;
}
export interface DismissOrder {
  type: "dismiss";
  character: string;
}
export interface BackgroundCheckOrder {
  type: "check";
  character: string;
  spend: number;
}
/** Place a spy at a foreign court, or in a province. */
export interface PlaceSpyOrder {
  type: "spy";
  character: string;
  court?: Power | null;
  province?: string | null;
}
export interface RecallSpyOrder {
  type: "recall";
  character: string;
}
export interface CounterIntelOrder {
  type: "counterIntel";
  spend: number;
}
/** Close or open one's roads to a court's travellers (build order item 7b, "Passage and access"); it stands until changed. */
export interface RoadsOrder {
  type: "roads";
  court: Power;
  close: boolean;
}
/**
 * End the passage and basing this king granted another on sealed tablets (item 9), in one province or, with none named,
 * all of them. Its troops still standing in the land after it ends take it, as any troop does.
 */
export interface RevokeOrder {
  type: "revoke";
  grantee: Power;
  province: string | null;
}
/**
 * Repudiate a tablet one's envoy sealed in one's name (item 9), as beyond his authority: the rights it granted end, both
 * ways, and its partner is told. Named by the copy in one's archive, as an examination names it.
 */
export interface RepudiateOrder {
  type: "repudiate";
  copy: string;
}
export interface AssayOrder {
  type: "assay";
  lot: string;
}
export interface AuthenticateOrder {
  type: "authenticate";
  copy: string;
  spend: number;
}
export interface ForgeOrder {
  type: "forge";
  character: string;
  text: string;
  seals: Power[];
  /** In structured press the forgery is set out in clauses too (item 8), its text their words. */
  clauses?: Clause[] | null;
}

export const CaptiveFateValues = ["Execute", "Ransom", "Turn", "Release"] as const;
export type CaptiveFate = (typeof CaptiveFateValues)[number];

/** Decide the fate of a caught spy held at this court. */
export interface CaptiveOrder {
  type: "captive";
  character: string;
  fate: CaptiveFate;
  ransom: number;
  poison: string;
}
export interface PayRansomOrder {
  type: "payRansom";
  character: string;
}
/**
 * An order a reply named but left incomplete or unreadable (a cession to no power anyone knows): the validator refuses it
 * with `reason`, so its king is told next season instead of the order vanishing.
 */
export interface UnreadableOrder {
  type: "unreadable";
  text: string;
  reason: string;
}

export type Order =
  | HoldOrder
  | MoveOrder
  | SupportOrder
  | ConvoyOrder
  | BesiegeOrder
  | FortifyOrder
  | SallyOrder
  | SellOrder
  | PurchaseOrder
  | FeedOrder
  | CaravanOrder
  | TradeOrder
  | ShipOrder
  | TollOrder
  | RaiseOrder
  | DisbandOrder
  | BuyProvinceOrder
  | CedeProvinceOrder
  | GiftUnitOrder
  | DispatchOrder
  | ReleaseOrder
  | SeekCandidatesOrder
  | HireOrder
  | RenewOrder
  | DismissOrder
  | BackgroundCheckOrder
  | PlaceSpyOrder
  | RecallSpyOrder
  | CounterIntelOrder
  | RoadsOrder
  | RevokeOrder
  | RepudiateOrder
  | AssayOrder
  | AuthenticateOrder
  | ForgeOrder
  | CaptiveOrder
  | PayRansomOrder
  | UnreadableOrder;

export type OrderType = Order["type"];

// ---------------------------------------------------------------- makers, with the C# records' defaults

export const hold = (unit: string): HoldOrder => ({ type: "hold", unit });
export const move = (unit: string, to: string): MoveOrder => ({ type: "move", unit, to });
export const support = (unit: string, supported: string, to: string | null = null): SupportOrder => ({ type: "support", unit, supported, to });
export const convoy = (unit: string, army: string, to: string): ConvoyOrder => ({ type: "convoy", unit, army, to });
export const besiege = (unit: string): BesiegeOrder => ({ type: "besiege", unit });
export const fortify = (province: string): FortifyOrder => ({ type: "fortify", province });
export const sally = (city: string, from: string): SallyOrder => ({ type: "sally", city, from });
export const raise = (province: string, kind: UnitKind): RaiseOrder => ({ type: "raise", province, kind });
export const disband = (unit: string): DisbandOrder => ({ type: "disband", unit });
export const buy = (province: string): BuyProvinceOrder => ({ type: "buy", province });
export const cede = (province: string, to: Power): CedeProvinceOrder => ({ type: "cede", province, to });
export const giftUnit = (unit: string, to: Power): GiftUnitOrder => ({ type: "giftUnit", unit, to });
export function dispatch(
  envoy: string,
  to: Power,
  letter: string,
  opts: { mandate?: string; greeting?: GreetingOptions | null; gold?: number; purityPercent?: number; proposal?: TabletProposal | null; copies?: string[] | null; clauses?: Clause[] | null; noInventory?: boolean | null; authority?: Authority | null } = {},
): DispatchOrder {
  return {
    type: "dispatch",
    envoy,
    to,
    letter,
    mandate: opts.mandate ?? "",
    greeting: opts.greeting ?? null,
    gold: opts.gold ?? 0,
    purityPercent: opts.purityPercent ?? 100,
    proposal: opts.proposal ?? null,
    copies: opts.copies ?? null,
    clauses: opts.clauses ?? null,
    noInventory: opts.noInventory ?? null,
    ...(opts.authority != null ? { authority: opts.authority } : {}),
  };
}
export const release = (character: string, reply = ""): ReleaseOrder => ({ type: "release", character, reply });
export const seekCandidates = (): SeekCandidatesOrder => ({ type: "seekCandidates" });
export const hire = (character: string, wage: number, term = 6): HireOrder => ({ type: "hire", character, wage, term });
export const renew = (character: string, wage: number, term = 6): RenewOrder => ({ type: "renew", character, wage, term });
export const dismiss = (character: string): DismissOrder => ({ type: "dismiss", character });
export const check = (character: string, spend: number): BackgroundCheckOrder => ({ type: "check", character, spend });
export const sell = (province: string, amount: number): SellOrder => ({ type: "sell", province, amount });
export const purchase = (province: string, amount: number): PurchaseOrder => ({ type: "purchase", province, amount });
export const feed = (province: string, amount: number): FeedOrder => ({ type: "feed", province, amount });
export const caravan = (from: string, to: string, amount: number): CaravanOrder => ({ type: "caravan", from, to, amount });
export const trade = (from: string, to: string, grain: number, gold: number, sneak = false): TradeOrder => ({ type: "trade", from, to, grain, gold, sneak });
export const ship = (fleet: string, from: string, to: string, grain: number, gold: number, trade = true): ShipOrder => ({ type: "ship", fleet, from, to, grain, gold, trade });
export const toll = (percent: number, partner: Power | null = null, province: string | null = null): TollOrder => ({ type: "toll", province, partner, percent });
export const placeSpy = (character: string, court: Power | null = null, province: string | null = null): PlaceSpyOrder => ({ type: "spy", character, court, province });
export const recall = (character: string): RecallSpyOrder => ({ type: "recall", character });
export const counterIntel = (spend: number): CounterIntelOrder => ({ type: "counterIntel", spend });
export const roads = (court: Power, close: boolean): RoadsOrder => ({ type: "roads", court, close });
export const revoke = (grantee: Power, province: string | null = null): RevokeOrder => ({ type: "revoke", grantee, province });
export const repudiate = (copy: string): RepudiateOrder => ({ type: "repudiate", copy });
export const assay = (lot: string): AssayOrder => ({ type: "assay", lot });
export const authenticate = (copy: string, spend: number): AuthenticateOrder => ({ type: "authenticate", copy, spend });
export const forge = (character: string, text: string, seals: Power[]): ForgeOrder => ({ type: "forge", character, text, seals });
export const captive = (character: string, fate: CaptiveFate, ransom = 0, poison = ""): CaptiveOrder => ({ type: "captive", character, fate, ransom, poison });
export const payRansom = (character: string): PayRansomOrder => ({ type: "payRansom", character });
export const unreadable = (text: string, reason: string): UnreadableOrder => ({ type: "unreadable", text, reason });

// ---------------------------------------------------------------- what an order says

/** A name the order left blank, as a refusal shows it. */
function named(s: string | null | undefined): string {
  return isBlank(s) ? "?" : s;
}

/** The order in a line, as reports and refusals show it (Order.Describe). */
export function describe(o: Order): string {
  switch (o.type) {
    case "hold":
      return `${o.unit} holds`;
    case "move":
      return `${o.unit} -> ${named(o.to)}`;
    case "support":
      return o.to === null || o.to === undefined ? `${o.unit} supports ${named(o.supported)} holding` : `${o.unit} supports ${named(o.supported)} -> ${o.to}`;
    case "convoy":
      return `${o.unit} convoys ${named(o.army)} -> ${named(o.to)}`;
    case "besiege":
      return `${o.unit} besieges the city`;
    case "unreadable":
      return o.text;
    case "fortify":
      return `strengthen the walls of ${named(o.province)}`;
    case "sally":
      return `the walls of ${named(o.city)} sally in support of the attack from ${named(o.from)}`;
    case "sell":
      return `sell ${o.amount} measures of grain from the stores of ${named(o.province)}`;
    case "purchase":
      return `buy ${o.amount} measures of grain at the market of ${named(o.province)}`;
    case "feed":
      return `hand ${o.amount} measures of grain to the town of ${named(o.province)}`;
    case "caravan":
      return `send a caravan with ${o.amount} measures of grain from ${named(o.from)} to ${named(o.to)}`;
    case "trade":
      return `send a caravan${o.sneak ? ", smuggling," : ""} with ${o.grain} measures of grain and ${o.gold} shekels from ${named(o.from)} to trade at ${named(o.to)}`;
    case "ship":
      return `load the fleet in ${o.fleet} with ${o.grain} measures of grain and ${o.gold} shekels at ${named(o.from)} and sail to ${o.trade ? "trade at" : "deliver to"} ${named(o.to)}`;
    case "toll":
      return `set a toll of ${o.percent}% on ${o.partner === null ? "everyone's" : `${o.partner}'s`} goods entering ${o.province === null ? "your land" : named(o.province)}`;
    case "raise":
      return `raise ${o.kind === "Army" ? "army" : "fleet"} in ${o.province}`;
    case "disband":
      return `disband ${o.unit}`;
    case "buy":
      return `buy the city-state of ${o.province}`;
    case "cede":
      return `cede ${o.province} to ${o.to}`;
    case "giftUnit":
      return `give ${o.unit} to ${o.to}`;
    case "dispatch":
      return `send ${o.envoy} to ${o.to}` + (o.gold > 0 ? ` with ${o.gold} shekels` : "") + (o.proposal ? " bearing a tablet to seal" : "");
    case "release":
      return `release ${o.character}`;
    case "seekCandidates":
      return "ask for candidates";
    case "hire":
      return `hire ${o.character} at ${o.wage} a season`;
    case "renew":
      return `renew ${o.character} at ${o.wage} a season for ${o.term} seasons`;
    case "dismiss":
      return `dismiss ${o.character}`;
    case "check":
      return `check the background of ${o.character} (${o.spend} shekels)`;
    case "spy":
      return `send ${o.character} to spy on ${o.court ?? o.province ?? ""}`;
    case "recall":
      return `recall ${o.character}`;
    case "counterIntel":
      return `spend ${o.spend} on watching for spies`;
    case "roads":
      return `${o.close ? "close" : "open"} your roads to the people of ${o.court}`;
    case "revoke":
      return `revoke the passage and basing you granted ${o.grantee}${o.province !== null ? ` in ${o.province}` : ""}`;
    case "repudiate":
      return `repudiate the tablet ${o.copy}, sealed by your envoy, as beyond his authority`;
    case "assay":
      return `assay gold lot ${o.lot}`;
    case "authenticate":
      return `authenticate tablet ${o.copy} (${o.spend} shekels)`;
    case "forge":
      return `have ${o.character} forge a tablet sealed by ${o.seals.join(", ")}`;
    case "captive":
      return `${o.fate.toLowerCase()} the captive ${o.character}`;
    case "payRansom":
      return `pay the ransom for ${o.character}`;
  }
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
    case "giftUnit":
      return o.unit;
    case "ship":
      return o.fleet;
    default:
      return null;
  }
}

/** The person an order gives a task to. A renewal is not a task, so it is not counted here. */
export function characterOf(o: Order): string | null {
  switch (o.type) {
    case "dispatch":
      return o.envoy;
    case "release":
    case "hire":
    case "dismiss":
    case "spy":
    case "recall":
    case "forge":
    case "captive":
      return o.character;
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

// ---------------------------------------------------------------- JSON

const v = <T>(name: string, make: () => T, fields: Parameters<typeof obj>[2]): ObjSchema<unknown> => obj(name, make, fields) as ObjSchema<unknown>;

export const OrderSchema = poly("Order", "type", {
  hold: v("HoldOrder", () => hold(""), { unit: S }),
  move: v("MoveOrder", () => move("", ""), { unit: S, to: S }),
  support: v("SupportOrder", () => support("", ""), { unit: S, supported: S, to: S }),
  convoy: v("ConvoyOrder", () => convoy("", "", ""), { unit: S, army: S, to: S }),
  besiege: v("BesiegeOrder", () => besiege(""), { unit: S }),
  fortify: v("FortifyOrder", () => fortify(""), { province: S }),
  sally: v("SallyOrder", () => sally("", ""), { city: S, from: S }),
  sell: v("SellOrder", () => sell("", 0), { province: S, amount: I }),
  purchase: v("PurchaseOrder", () => purchase("", 0), { province: S, amount: I }),
  feed: v("FeedOrder", () => feed("", 0), { province: S, amount: I }),
  caravan: v("CaravanOrder", () => caravan("", "", 0), { from: S, to: S, amount: I }),
  trade: v("TradeOrder", () => trade("", "", 0, 0), { from: S, to: S, grain: I, gold: I, sneak: B }),
  ship: v("ShipOrder", () => ship("", "", "", 0, 0), { fleet: S, from: S, to: S, grain: I, gold: I, trade: B }),
  toll: v("TollOrder", () => toll(0), { province: opt(S), partner: opt(S), percent: I }),
  raise: v("RaiseOrder", () => raise("", "Army"), { province: S, kind: S }),
  disband: v("DisbandOrder", () => disband(""), { unit: S }),
  buy: v("BuyProvinceOrder", () => buy(""), { province: S }),
  cede: v("CedeProvinceOrder", () => cede("", "Egypt"), { province: S, to: S }),
  giftUnit: v("GiftUnitOrder", () => giftUnit("", "Egypt"), { unit: S, to: S }),
  dispatch: v("DispatchOrder", () => dispatch("", "Egypt", ""), {
    envoy: S,
    to: S,
    letter: S,
    mandate: S,
    greeting: opt(() => GreetingOptionsSchema),
    gold: I,
    purityPercent: I,
    proposal: opt(() => TabletProposalSchema),
    copies: opt(list(S)),
    clauses: opt(list(() => ClauseSchema)),
    noInventory: opt(B),
    authority: opt(() => AuthoritySchema),
  }),
  release: v("ReleaseOrder", () => release(""), { character: S, reply: S }),
  seekCandidates: v("SeekCandidatesOrder", () => seekCandidates(), {}),
  hire: v("HireOrder", () => hire("", 0), { character: S, wage: I, term: I }),
  renew: v("RenewOrder", () => renew("", 0), { character: S, wage: I, term: I }),
  dismiss: v("DismissOrder", () => dismiss(""), { character: S }),
  check: v("BackgroundCheckOrder", () => check("", 0), { character: S, spend: I }),
  spy: v("PlaceSpyOrder", () => placeSpy(""), { character: S, court: S, province: S }),
  recall: v("RecallSpyOrder", () => recall(""), { character: S }),
  counterIntel: v("CounterIntelOrder", () => counterIntel(0), { spend: I }),
  roads: v("RoadsOrder", () => roads("Egypt", true), { court: S, close: B }),
  revoke: v("RevokeOrder", () => revoke("Egypt"), { grantee: S, province: opt(S) }),
  repudiate: v("RepudiateOrder", () => repudiate(""), { copy: S }),
  assay: v("AssayOrder", () => assay(""), { lot: S }),
  authenticate: v("AuthenticateOrder", () => authenticate("", 0), { copy: S, spend: I }),
  forge: v("ForgeOrder", () => forge("", "", []), { character: S, text: S, seals: list(S), clauses: opt(list(() => ClauseSchema)) }),
  captive: v("CaptiveOrder", () => captive("", "Execute"), { character: S, fate: S, ransom: I, poison: S }),
  payRansom: v("PayRansomOrder", () => payRansom(""), { character: S }),
  unreadable: v("UnreadableOrder", () => unreadable("", ""), { text: S, reason: S }),
});

/** One line of a king's ledger of dealings: what it wrote of its dealings with one court. */
export interface LedgerLine {
  court: Power;
  entry: string;
}

export const LedgerLineSchema = obj<LedgerLine>("LedgerLine", () => ({ court: "Egypt", entry: "" }), { court: S, entry: S });

export interface RejectedOrder {
  order: Order;
  reason: string;
}

/** Everything one seat submits in one season. Notes are a private journal for the seat itself. */
export interface TurnSubmission {
  orders: Order[];
  notes: string;
  /**
   * Model and file seats: the king's own summary of the seasons that have left its record, written in its reply (empty
   * keeps the one before). Logged with the orders, so a replay can read it; the engine ignores it.
   */
  summary: string;
  /**
   * Model and file seats: lines of the king's ledger of dealings, one per court, in its own words (an entry replaces that
   * court's line, an empty entry removes it). Logged with the orders; the engine ignores it.
   */
  ledger: LedgerLine[];
  /** Seats that may sleep: orders queued for later seasons (one entry per season replaces any earlier one). */
  scheduled: ScheduledOrders[];
  /** Every seat, awake or asleep: new standing orders, kept with those it already has. */
  standing: StandingRequest[];
  /** Every seat, awake or asleep: ids of standing orders to cancel, or "all". */
  cancelStanding: string[];
  /** Model, file and human seats: new standing answers for what arrives at its court (item 6b). */
  answers: StandingAnswerRequest[];
  /** Ids of standing answers to cancel, or "all". */
  cancelAnswers: string[];
  /** Set by the runner when the script king stood in for a seat whose call failed: the seat has not seen this season. */
  fromFallback: boolean;
  /**
   * A seat that may sleep asks to be asked again next season instead of sleeping (item 9+a: a human ends his turn without
   * sleeping; "Per-seat sleep, never a global skip"). Model and file seats leave it false and sleep after their orders.
   */
  stayAwake: boolean;
}

export function newTurnSubmission(init: Partial<TurnSubmission> = {}): TurnSubmission {
  return { orders: [], notes: "", summary: "", ledger: [], scheduled: [], standing: [], cancelStanding: [], answers: [], cancelAnswers: [], fromFallback: false, stayAwake: false, ...init };
}

export const TurnSubmissionSchema = obj<TurnSubmission>("TurnSubmission", newTurnSubmission, {
  orders: list(OrderSchema),
  notes: S,
  summary: S,
  ledger: list(LedgerLineSchema),
  scheduled: list(() => ScheduledOrdersSchema),
  standing: list(() => StandingRequestSchema),
  cancelStanding: list(S),
  answers: list(() => StandingAnswerRequestSchema),
  cancelAnswers: list(S),
  fromFallback: B,
  stayAwake: B,
});
