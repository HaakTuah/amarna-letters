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
import { type WorkKind, workLevelText, workName } from "./works.ts";
import type { Power } from "./power.ts";
import { type Clause, ClauseSchema } from "./clauses.ts";
import { GreetingOptionsSchema, TabletProposalSchema, type GreetingOptions, type TabletProposal } from "./records.ts";
import { AuthoritySchema, type Authority, type GrantKind } from "./authority.ts";
import type { JobWhat } from "./people.ts";
import { type Mandate, MandateSchema, mandateText } from "./command.ts";

export interface HoldOrder {
  type: "hold";
  unit: string;
}
export interface MoveOrder {
  type: "move";
  unit: string;
  to: string;
  /** A forced march (item 13): a third quicker, and some of the men drop along the way. */
  forced?: boolean;
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
 * What a king keeps and builds in a province of his (item 15, "One rule for everything built"): the level of one kind
 * (walls, roads, relay stations, a harbour, policing or water works) to keep there, paid in gold or by corvée
 * (`labour`). Above the level standing it starts a project that raises it a level at a time over the seasons; below it,
 * the levels above go unkept and decay. It stands until changed. In a besieged city an order for its walls repairs them,
 * with the men and food inside ("Walls price the storm, not the clock").
 */
export interface BuildOrder {
  type: "build";
  province: string;
  kind: WorkKind;
  level: number;
  labour: boolean;
}
/**
 * An army of the seat's standing in land another holds razes a level of what stands there: its roads, relay stations,
 * harbour or water works (item 15: "an occupying army can raze what stands"; roads and stations "can be captured or cut").
 */
export interface RazeOrder {
  type: "raze";
  unit: string;
  kind: WorkKind;
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
/**
 * Set the tax in goods on a province of one's own, or on all one's land (`province` null), in percent of its harvest
 * (item 10+a, "How a king lives"). It stands until changed; hunger answers a heavy one.
 */
export interface TaxOrder {
  type: "tax";
  province: string | null;
  percent: number;
}
/**
 * People across borders and in kings' hands (item 10+b, "Where people go"). `welcome`: settle the loose men standing in a
 * province of one's own, as far as it has room. `deport`: move settled people from a province one has taken (not one's
 * homeland) to one of one's own; they walk there, and carry their share of the purse only if `purse`. `expel`: put out of
 * a besieged city of one's own the mouths that cannot fight. `returnRunaways`: send back to `to` the runaways from its land
 * standing loose in a province of one's own ("Fugitive clauses": deportation in reverse).
 */
export interface WelcomeOrder {
  type: "welcome";
  province: string;
}
export interface DeportOrder {
  type: "deport";
  province: string;
  to: string;
  number: number;
  purse: boolean;
}
export interface ExpelOrder {
  type: "expel";
  province: string;
  /** Item 11a+: the share of the town's mouths put out, in percent (1 to `LandData.expelMost`), the king's choice. */
  percent: number;
}
export interface ReturnRunawaysOrder {
  type: "returnRunaways";
  province: string;
  to: Power;
}
export interface RaiseOrder {
  type: "raise";
  province: string;
  kind: UnitKind;
  /** Haakon's answers to item 11a+: how many men the levy takes, up to every man of fighting age there; none: a unit's full size. */
  men?: number | null;
}
export interface DisbandOrder {
  type: "disband";
  unit: string;
  /** Its men settle where it stands, in a province of one's own, as colonists, instead of walking home (item 10+a). */
  settle?: boolean | null;
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
  /**
   * Item 10, "check a claim": a person at your court who says they serve the king the envoy goes to. The envoy asks there,
   * and brings home whether they do.
   */
  checkClaim?: string | null;
  /**
   * Haakon's answers to item 11a: a debt tablet in your archive the envoy carries to the court it goes to, to present to
   * the borrower there; what is repaid to it, and the tablet if not repaid in full, it brings home.
   */
  collect?: string | null;
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
/**
 * Item 11a, "Jobs, not wages", as Haakon's answers rework it: offer a person a job, which is one errand: `what` ("envoy" to
 * the court `where`, or "spy" on the court or province `where`), done by `term` seasons from now, for a whole `fee`, of
 * which `advance` is handed over now and the rest falls due when the job is done. `payOnDone`: your standing order to pay
 * the rest then; otherwise you pay it by order pay_fee, or not. `offerAgain`: when it is done, the same job is offered again,
 * which the man may take or not. A person at your court is offered it there; one elsewhere only through `via`, one of
 * your envoys you send this season to the court where the person stands, carrying the offer and the advance.
 */
export interface HireOrder {
  type: "hire";
  character: string;
  fee: number;
  advance: number;
  term: number;
  what?: JobWhat | null;
  where?: string | null;
  payOnDone?: boolean | null;
  offerAgain?: boolean | null;
  via?: string | null;
}
/**
 * A new job offered to one of your own people at your court (a new errand, fee and term), the advance handed over now, if
 * the man takes it. Not a task: the servant may be renewed and sent on the new job's errand in the same season.
 */
export interface RenewOrder {
  type: "renew";
  character: string;
  fee: number;
  advance: number;
  term: number;
  what?: JobWhat | null;
  where?: string | null;
  payOnDone?: boolean | null;
  offerAgain?: boolean | null;
}
/** Haakon's answers to item 11a: seize the hoard a living person keeps in your capital, with the tablets kept in it. */
export interface SeizeHoardOrder {
  type: "seize";
  character: string;
}
/** Haakon's answers to item 11a: sell a debt tablet in your archive to a person at your court, for `price` from its purse. */
export interface SellDebtOrder {
  type: "sellDebt";
  debt: string;
  character: string;
  price: number;
}
/**
 * Haakon's answers to item 11a: your standing order, until changed, to pay on delivery the fee of whoever carries your
 * people's letters home (or not).
 */
export interface PayCarriersOrder {
  type: "payCarriers";
  pay: boolean;
}
/**
 * Haakon's answers to item 11b: your armies standing in `province` of your land fall on the bands there at the start of
 * next season (a king's army falls on a band only on his order).
 */
/**
 * Item 13 ("Generals lead armies", "Privileges"): grant command of the unit standing in `unit` to `character`, a person at
 * the king's court, his own servant or free. A grant of authority, not a job: no fee; what the commander gains is the
 * spoils, the men and his name. He travels to the army and commands it from the season he reaches it.
 */
export interface CommandOrder {
  type: "command";
  unit: string;
  character: string;
}
/** Item 13: take back the command of the unit in `unit` by sending word; he steps down when it reaches him, or refuses. */
export interface RelieveOrder {
  type: "relieve";
  unit: string;
}
/**
 * Item 13 ("Army mandates"): give the unit in `unit` a mandate, which reaches it with the realm's couriers and holds until
 * changed; a null mandate clears it. Its commander carries it out when no order of the king's reaches the army.
 */
export interface MandateOrder {
  type: "mandate";
  unit: string;
  mandate: Mandate | null;
}
/**
 * Item 13 ("Governors"): grant `character`, a person at the king's court, the governorship of `province`, a province of the
 * king's, under a mandate: he may raise up to `levies` levies there on his own when foreign troops stand in or next to it
 * (0: none), collects its yield, and reports what he sees. A privilege, not a job: no fee. He travels there and governs
 * from the season he arrives.
 */
export interface GovernOrder {
  type: "govern";
  province: string;
  character: string;
  levies: number;
}
/** Item 13: take back the governorship of `province` by sending word; he steps down when it reaches him, or refuses. */
export interface UnseatOrder {
  type: "unseat";
  province: string;
}
/**
 * Item 13 (hiring bands as soldiers, "Bands are a character's soldiers", "Anyone can hire anyone"): offer the chief of the
 * band in `province`, where an army of the king's stands with it under its commander or the king himself (who carries the
 * offer), `fee` shekels, paid now, for his band to serve as the king's army for `term` seasons, the chief commanding it.
 * The chief takes it or not; when the term ends his men are his band again.
 */
export interface EnlistOrder {
  type: "enlist";
  province: string;
  fee: number;
  term: number;
}
/**
 * Item 13 ("The capital is wherever the king is"): the king himself sets out for `to`, a province of his own or any he may
 * reach, with his court; it costs gold and takes the road's time, and his orders travel from wherever he is.
 */
export interface CourtOrder {
  type: "court";
  to: string;
}
export interface HuntOrder {
  type: "hunt";
  province: string;
}
/**
 * Your standing order, until changed, that any army of yours standing where a band works falls on it: in the provinces
 * named, or, naming none, anywhere in your land (Haakon's answers to item 11b+). A new one replaces the old.
 */
export interface HuntBandsOrder {
  type: "huntBands";
  on: boolean;
  provinces?: string[] | null;
}
/**
 * Item 11a: the rest of a servant's fee. `pay` true pays what you let fall due unpaid, if the person stands at your court;
 * false withholds the rest of its present job when it falls due (a promise broken, which others hear of).
 */
export interface PayFeeOrder {
  type: "payFee";
  character: string;
  pay: boolean;
}
/**
 * Item 11a, "Lending to kings": borrow `amount` from a person at your court who offers to lend, sealing a debt tablet for
 * `repay`, to be repaid in `seasons`.
 */
export interface BorrowOrder {
  type: "borrow";
  character: string;
  amount: number;
  repay: number;
  seasons: number;
}
/** Item 11a: repay a debt to whoever holds its tablet, if they stand at your court; repaid in full, the tablet is yours. */
export interface RepayOrder {
  type: "repay";
  debt: string;
  amount: number;
}
/** Item 11b, "Characters as sellers of news": buy the news a person at your court offers of another court, at its price. */
export interface BuyNewsOrder {
  type: "buyNews";
  character: string;
  court: Power;
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
/** Item 10: have your spy posted at a court steal a tablet from its archive, so that its court loses it. */
export interface StealOrder {
  type: "steal";
  character: string;
}
/** Item 10: a gift of gold from your treasury to a person at your court (a false envoy's motive: the host's return gifts). */
export interface GiftOrder {
  type: "gift";
  character: string;
  gold: number;
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
 * Item 11a+: grant another king passage through land of one's own (one province, or all of it with none named) or basing
 * in one province, by order rather than on a tablet: it stands from this season, for `seasons` seasons or until revoked
 * (null), and the news reaches his court as fast as a messenger rides between the capitals.
 */
export interface GrantOrder {
  type: "grant";
  grantee: Power;
  kind: GrantKind;
  province: string | null;
  seasons: number | null;
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

export const CaptiveFateValues = ["Execute", "Ransom", "Turn", "Release", "Question", "HandOver", "TakePurse"] as const;
export type CaptiveFate = (typeof CaptiveFateValues)[number];

/** Decide the fate of a caught spy held at this court. */
export interface CaptiveOrder {
  type: "captive";
  character: string;
  fate: CaptiveFate;
  ransom: number;
  poison: string;
  /** Item 10: for "Question", the shekels spent on the questioning; for "HandOver", the court the captive is given to. */
  spend?: number | null;
  to?: Power | null;
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
  | CommandOrder
  | RelieveOrder
  | MandateOrder
  | GovernOrder
  | UnseatOrder
  | CourtOrder
  | EnlistOrder
  | HoldOrder
  | MoveOrder
  | SupportOrder
  | ConvoyOrder
  | BesiegeOrder
  | BuildOrder
  | RazeOrder
  | SallyOrder
  | SellOrder
  | StealOrder
  | GiftOrder
  | PurchaseOrder
  | FeedOrder
  | CaravanOrder
  | TradeOrder
  | ShipOrder
  | TollOrder
  | TaxOrder
  | WelcomeOrder
  | DeportOrder
  | ExpelOrder
  | ReturnRunawaysOrder
  | RaiseOrder
  | DisbandOrder
  | CedeProvinceOrder
  | GiftUnitOrder
  | DispatchOrder
  | ReleaseOrder
  | SeekCandidatesOrder
  | HireOrder
  | RenewOrder
  | PayFeeOrder
  | BorrowOrder
  | RepayOrder
  | BuyNewsOrder
  | DismissOrder
  | BackgroundCheckOrder
  | PlaceSpyOrder
  | RecallSpyOrder
  | CounterIntelOrder
  | RoadsOrder
  | RevokeOrder
  | GrantOrder
  | RepudiateOrder
  | AssayOrder
  | AuthenticateOrder
  | ForgeOrder
  | CaptiveOrder
  | PayRansomOrder
  | SeizeHoardOrder
  | SellDebtOrder
  | PayCarriersOrder
  | HuntOrder
  | HuntBandsOrder
  | UnreadableOrder;

export type OrderType = Order["type"];

// ---------------------------------------------------------------- makers, with the C# records' defaults

export const hold = (unit: string): HoldOrder => ({ type: "hold", unit });
export const command = (unit: string, character: string): CommandOrder => ({ type: "command", unit, character });
export const relieve = (unit: string): RelieveOrder => ({ type: "relieve", unit });
export const mandateOrder = (unit: string, mandate: Mandate | null): MandateOrder => ({ type: "mandate", unit, mandate });
export const govern = (province: string, character: string, levies = 0): GovernOrder => ({ type: "govern", province, character, levies });
export const unseat = (province: string): UnseatOrder => ({ type: "unseat", province });
export const moveCourt = (to: string): CourtOrder => ({ type: "court", to });
export const enlist = (province: string, fee: number, term: number): EnlistOrder => ({ type: "enlist", province, fee, term });
export const move = (unit: string, to: string, forced = false): MoveOrder => (forced ? { type: "move", unit, to, forced } : { type: "move", unit, to });
export const support = (unit: string, supported: string, to: string | null = null): SupportOrder => ({ type: "support", unit, supported, to });
export const convoy = (unit: string, army: string, to: string): ConvoyOrder => ({ type: "convoy", unit, army, to });
export const besiege = (unit: string): BesiegeOrder => ({ type: "besiege", unit });
export const build = (province: string, kind: WorkKind, level: number, labour = false): BuildOrder => ({ type: "build", province, kind, level, labour });
export const raze = (unit: string, kind: WorkKind): RazeOrder => ({ type: "raze", unit, kind });
export const sally = (city: string, from: string): SallyOrder => ({ type: "sally", city, from });
export const raise = (province: string, kind: UnitKind, men: number | null = null): RaiseOrder => (men === null ? { type: "raise", province, kind } : { type: "raise", province, kind, men });
export const disband = (unit: string, settle = false): DisbandOrder => (settle ? { type: "disband", unit, settle } : { type: "disband", unit });
export const cede = (province: string, to: Power): CedeProvinceOrder => ({ type: "cede", province, to });
export const giftUnit = (unit: string, to: Power): GiftUnitOrder => ({ type: "giftUnit", unit, to });
export function dispatch(
  envoy: string,
  to: Power,
  letter: string,
  opts: { mandate?: string; greeting?: GreetingOptions | null; gold?: number; purityPercent?: number; proposal?: TabletProposal | null; copies?: string[] | null; clauses?: Clause[] | null; noInventory?: boolean | null; authority?: Authority | null; checkClaim?: string | null; collect?: string | null } = {},
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
    ...(opts.checkClaim != null ? { checkClaim: opts.checkClaim } : {}),
    ...(opts.collect != null ? { collect: opts.collect } : {}),
  };
}
export const release = (character: string, reply = ""): ReleaseOrder => ({ type: "release", character, reply });
export const seekCandidates = (): SeekCandidatesOrder => ({ type: "seekCandidates" });
/** A job's terms beyond its fee: its errand, the standing orders that go with it, and the envoy carrying an offer abroad. */
export interface JobTerms {
  what?: JobWhat | null;
  where?: string | null;
  payOnDone?: boolean;
  offerAgain?: boolean;
  via?: string | null;
}
const terms = (t: JobTerms): Omit<Partial<HireOrder>, "type"> => ({
  ...(t.what != null ? { what: t.what, where: t.where ?? null } : {}),
  ...(t.payOnDone === true ? { payOnDone: true } : {}),
  ...(t.offerAgain === true ? { offerAgain: true } : {}),
  ...(t.via != null ? { via: t.via } : {}),
});
/** A job: by default the whole fee for `term` seasons, half of it handed over now. */
export const hire = (character: string, fee: number, term = 6, advance: number | null = null, t: JobTerms = {}): HireOrder => ({ type: "hire", character, fee, advance: advance ?? Math.trunc(fee / 2), term, ...terms(t) });
export const renew = (character: string, fee: number, term = 6, advance: number | null = null, t: JobTerms = {}): RenewOrder => {
  const { via: _via, ...rest } = terms(t);
  return { type: "renew", character, fee, advance: advance ?? Math.trunc(fee / 2), term, ...rest };
};
export const seize = (character: string): SeizeHoardOrder => ({ type: "seize", character });
export const sellDebt = (debt: string, character: string, price: number): SellDebtOrder => ({ type: "sellDebt", debt, character, price });
export const payCarriers = (pay: boolean): PayCarriersOrder => ({ type: "payCarriers", pay });
export const hunt = (province: string): HuntOrder => ({ type: "hunt", province });
export const huntBands = (on: boolean, provinces: string[] | null = null): HuntBandsOrder => ({ type: "huntBands", on, ...(provinces !== null && provinces.length > 0 ? { provinces } : {}) });
export const payFee = (character: string, pay = true): PayFeeOrder => ({ type: "payFee", character, pay });
export const borrow = (character: string, amount: number, repay: number, seasons = 6): BorrowOrder => ({ type: "borrow", character, amount, repay, seasons });
export const repay = (debt: string, amount: number): RepayOrder => ({ type: "repay", debt, amount });
export const buyNews = (character: string, court: Power): BuyNewsOrder => ({ type: "buyNews", character, court });
export const dismiss = (character: string): DismissOrder => ({ type: "dismiss", character });
export const check = (character: string, spend: number): BackgroundCheckOrder => ({ type: "check", character, spend });
export const sell = (province: string, amount: number): SellOrder => ({ type: "sell", province, amount });
export const purchase = (province: string, amount: number): PurchaseOrder => ({ type: "purchase", province, amount });
export const feed = (province: string, amount: number): FeedOrder => ({ type: "feed", province, amount });
export const caravan = (from: string, to: string, amount: number): CaravanOrder => ({ type: "caravan", from, to, amount });
export const trade = (from: string, to: string, grain: number, gold: number, sneak = false): TradeOrder => ({ type: "trade", from, to, grain, gold, sneak });
export const ship = (fleet: string, from: string, to: string, grain: number, gold: number, trade = true): ShipOrder => ({ type: "ship", fleet, from, to, grain, gold, trade });
export const tax = (percent: number, province: string | null = null): TaxOrder => ({ type: "tax", province, percent });
export const welcome = (province: string): WelcomeOrder => ({ type: "welcome", province });
export const deport = (province: string, to: string, number: number, purse = false): DeportOrder => ({ type: "deport", province, to, number, purse });
export const expel = (province: string, percent = 50): ExpelOrder => ({ type: "expel", province, percent });
export const returnRunaways = (province: string, to: Power): ReturnRunawaysOrder => ({ type: "returnRunaways", province, to });
export const toll = (percent: number, partner: Power | null = null, province: string | null = null): TollOrder => ({ type: "toll", province, partner, percent });
export const placeSpy = (character: string, court: Power | null = null, province: string | null = null): PlaceSpyOrder => ({ type: "spy", character, court, province });
export const recall = (character: string): RecallSpyOrder => ({ type: "recall", character });
export const counterIntel = (spend: number): CounterIntelOrder => ({ type: "counterIntel", spend });
export const roads = (court: Power, close: boolean): RoadsOrder => ({ type: "roads", court, close });
export const revoke = (grantee: Power, province: string | null = null): RevokeOrder => ({ type: "revoke", grantee, province });
export const grant = (grantee: Power, kind: GrantKind, province: string | null = null, seasons: number | null = null): GrantOrder => ({ type: "grant", grantee, kind, province, seasons });
export const repudiate = (copy: string): RepudiateOrder => ({ type: "repudiate", copy });
export const assay = (lot: string): AssayOrder => ({ type: "assay", lot });
export const authenticate = (copy: string, spend: number): AuthenticateOrder => ({ type: "authenticate", copy, spend });
export const forge = (character: string, text: string, seals: Power[]): ForgeOrder => ({ type: "forge", character, text, seals });
export const captive = (character: string, fate: CaptiveFate, ransom = 0, poison = ""): CaptiveOrder => ({ type: "captive", character, fate, ransom, poison });
export const question = (character: string, spend: number): CaptiveOrder => ({ type: "captive", character, fate: "Question", ransom: 0, poison: "", spend });
export const handOver = (character: string, to: Power): CaptiveOrder => ({ type: "captive", character, fate: "HandOver", ransom: 0, poison: "", to });
export const steal = (character: string): StealOrder => ({ type: "steal", character });
export const giftTo = (character: string, gold: number): GiftOrder => ({ type: "gift", character, gold });
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
    case "command":
      return `grant ${o.character} the command of ${o.unit}`;
    case "relieve":
      return `take back the command of ${o.unit}`;
    case "mandate":
      return o.mandate === null ? `clear the mandate of ${o.unit}` : `give ${o.unit} the mandate: ${mandateText(o.mandate)}`;
    case "govern":
      return `grant ${o.character} the governorship of ${named(o.province)}${o.levies > 0 ? `, to raise up to ${o.levies} levies there if foreign troops threaten it` : ""}`;
    case "unseat":
      return `take back the governorship of ${named(o.province)}`;
    case "court":
      return `set out with the court for ${named(o.to)}`;
    case "enlist":
      return `offer the chief of the band in ${named(o.province)} ${o.fee} shekels for his band to serve as your army for ${o.term} seasons`;
    case "hold":
      return `${o.unit} holds`;
    case "move":
      return `${o.unit} -> ${named(o.to)}${o.forced === true ? " (forced march)" : ""}`;
    case "support":
      return o.to === null || o.to === undefined ? `${o.unit} supports ${named(o.supported)} holding` : `${o.unit} supports ${named(o.supported)} -> ${o.to}`;
    case "convoy":
      return `${o.unit} convoys ${named(o.army)} -> ${named(o.to)}`;
    case "besiege":
      return `${o.unit} besieges the city`;
    case "unreadable":
      return o.text;
    case "build":
      return `keep the ${workName(o.kind)} of ${named(o.province)} at ${workLevelText(o.kind, o.level)}, ${o.labour ? "by corvée" : "paid in gold"}`;
    case "raze":
      return `${o.unit} razes a level of the ${workName(o.kind)} where it stands`;
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
    case "welcome":
      return `settle the loose men in ${named(o.province)}`;
    case "deport":
      return `deport ${o.number} people from ${named(o.province)} to ${named(o.to)}${o.purse ? " with their share of the purse" : ""}`;
    case "expel":
      return `put ${o.percent} in a hundred of the mouths of ${named(o.province)} out of the city`;
    case "returnRunaways":
      return `send ${o.to}'s runaways in ${named(o.province)} back to ${o.to}`;
    case "raise":
      return `raise ${o.kind === "Army" ? "army" : "fleet"} in ${o.province}${o.men != null ? ` of ${o.men} men` : ""}`;
    case "disband":
      return o.settle === true ? `disband ${o.unit} and settle its men there as colonists` : `disband ${o.unit}`;
    case "tax":
      return `set the tax to ${o.percent}% of the harvest in ${o.province === null ? "all your land" : named(o.province)}`;
    case "cede":
      return `cede ${o.province} to ${o.to}`;
    case "giftUnit":
      return `give ${o.unit} to ${o.to}`;
    case "dispatch":
      return `send ${o.envoy} to ${o.to}` + (o.gold > 0 ? ` with ${o.gold} shekels` : "") + (o.proposal ? " bearing a tablet to seal" : "") + (o.collect != null ? ` carrying debt tablet ${o.collect}` : "");
    case "release":
      return `release ${o.character}`;
    case "seekCandidates":
      return "ask for candidates";
    case "hire":
      return `offer ${o.character} a job${jobText(o)} within ${o.term} seasons for ${o.fee} shekels, ${o.advance} of them now${o.via != null ? `, the offer carried by ${o.via}` : ""}`;
    case "renew":
      return `offer ${o.character} a new job${jobText(o)} within ${o.term} seasons for ${o.fee} shekels, ${o.advance} of them now`;
    case "seize":
      return `seize the hoard ${o.character} keeps in your capital`;
    case "sellDebt":
      return `sell debt tablet ${o.debt} to ${o.character} for ${o.price} shekels`;
    case "payCarriers":
      return o.pay ? "pay the carriers of your people's letters on delivery" : "stop paying the carriers of your people's letters on delivery";
    case "hunt":
      return `your armies in ${named(o.province)} fall on the bands there`;
    case "huntBands":
      return o.on
        ? `your armies fall on any band where they stand ${(o.provinces ?? []).length > 0 ? `in ${(o.provinces ?? []).map(named).join(", ")}` : "in your land"}, until you say otherwise`
        : "your armies leave the bands alone unless you order a hunt";
    case "payFee":
      return o.pay ? `pay ${o.character} the rest of the fee owed` : `withhold the rest of ${o.character}'s fee`;
    case "borrow":
      return `borrow ${o.amount} shekels from ${o.character}, to repay ${o.repay} in ${o.seasons} seasons`;
    case "repay":
      return `repay ${o.amount} shekels on debt ${o.debt}`;
    case "buyNews":
      return `buy ${o.character}'s news of ${o.court}`;
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
    case "grant":
      return `grant ${o.grantee} ${o.kind === "passage" ? "passage through" : "basing in"} ${o.province !== null ? named(o.province) : "all your land"}${o.seasons !== null ? ` for ${o.seasons} seasons` : " until revoked"}`;
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
      return o.fate === "Question"
        ? `question the captive ${o.character} (${o.spend ?? 0} shekels)`
        : o.fate === "HandOver"
          ? `hand the captive ${o.character} over to ${o.to ?? "?"}`
          : o.fate === "TakePurse"
            ? `take the purse of the captive ${o.character}`
            : `${o.fate.toLowerCase()} the captive ${o.character}`;
    case "steal":
      return `have ${o.character} steal a tablet from the archive they watch`;
    case "gift":
      return `give ${o.character} a gift of ${o.gold} shekels`;
    case "payRansom":
      return `pay the ransom for ${o.character}`;
  }
}

/** A job's errand and standing orders in words, for an order's line. */
function jobText(o: HireOrder | RenewOrder): string {
  const errand = o.what === "envoy" ? ` as envoy to ${o.where ?? "?"}` : o.what === "spy" ? ` to watch ${o.where ?? "?"}` : o.what === "stay" ? " to stay at court" : "";
  return errand + (o.payOnDone === true ? ", the rest paid when it is done" : "") + (o.offerAgain === true ? ", offered again when done" : "");
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
    case "raze":
      return o.unit;
    default:
      return null;
  }
}

/**
 * The person an order gives a task to. A job offered (hire, renew) is not a task (Haakon's answers to item 11a: the man may
 * be sent on its errand in the same season), so it is not counted here.
 */
export function characterOf(o: Order): string | null {
  switch (o.type) {
    case "dispatch":
      return o.envoy;
    case "command":
    case "govern":
      return o.character;
    case "release":
    case "dismiss":
    case "spy":
    case "recall":
    case "forge":
    case "steal":
      return o.character;
    // Taking what a captive carries is no task (Haakon's answers to item 11a): its fate may be decided the same season.
    case "captive":
      return o.fate === "TakePurse" ? null : o.character;
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
  command: v("CommandOrder", () => command("", ""), { unit: S, character: S }),
  relieve: v("RelieveOrder", () => relieve(""), { unit: S }),
  mandate: v("MandateOrder", () => mandateOrder("", null), { unit: S, mandate: opt(() => MandateSchema) }),
  govern: v("GovernOrder", () => govern("", ""), { province: S, character: S, levies: I }),
  unseat: v("UnseatOrder", () => unseat(""), { province: S }),
  court: v("CourtOrder", () => moveCourt(""), { to: S }),
  enlist: v("EnlistOrder", () => enlist("", 0, 0), { province: S, fee: I, term: I }),
  hold: v("HoldOrder", () => hold(""), { unit: S }),
  move: v("MoveOrder", () => move("", ""), { unit: S, to: S, forced: opt(B) }),
  support: v("SupportOrder", () => support("", ""), { unit: S, supported: S, to: S }),
  convoy: v("ConvoyOrder", () => convoy("", "", ""), { unit: S, army: S, to: S }),
  besiege: v("BesiegeOrder", () => besiege(""), { unit: S }),
  build: v("BuildOrder", () => build("", "Walls", 0), { province: S, kind: S, level: I, labour: B }),
  raze: v("RazeOrder", () => raze("", "Roads"), { unit: S, kind: S }),
  sally: v("SallyOrder", () => sally("", ""), { city: S, from: S }),
  sell: v("SellOrder", () => sell("", 0), { province: S, amount: I }),
  purchase: v("PurchaseOrder", () => purchase("", 0), { province: S, amount: I }),
  feed: v("FeedOrder", () => feed("", 0), { province: S, amount: I }),
  caravan: v("CaravanOrder", () => caravan("", "", 0), { from: S, to: S, amount: I }),
  trade: v("TradeOrder", () => trade("", "", 0, 0), { from: S, to: S, grain: I, gold: I, sneak: B }),
  ship: v("ShipOrder", () => ship("", "", "", 0, 0), { fleet: S, from: S, to: S, grain: I, gold: I, trade: B }),
  toll: v("TollOrder", () => toll(0), { province: opt(S), partner: opt(S), percent: I }),
  raise: v("RaiseOrder", () => raise("", "Army"), { province: S, kind: S, men: opt(I) }),
  disband: v("DisbandOrder", () => disband(""), { unit: S, settle: opt(B) }),
  tax: v("TaxOrder", () => tax(0), { province: opt(S), percent: I }),
  welcome: v("WelcomeOrder", () => welcome(""), { province: S }),
  deport: v("DeportOrder", () => deport("", "", 0), { province: S, to: S, number: I, purse: B }),
  expel: v("ExpelOrder", () => expel(""), { province: S, percent: I }),
  returnRunaways: v("ReturnRunawaysOrder", () => returnRunaways("", "Egypt"), { province: S, to: S }),
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
    checkClaim: opt(S),
    collect: opt(S),
  }),
  release: v("ReleaseOrder", () => release(""), { character: S, reply: S }),
  seekCandidates: v("SeekCandidatesOrder", () => seekCandidates(), {}),
  hire: v("HireOrder", () => hire("", 0), { character: S, fee: I, advance: I, term: I, what: opt(S), where: opt(S), payOnDone: opt(B), offerAgain: opt(B), via: opt(S) }),
  renew: v("RenewOrder", () => renew("", 0), { character: S, fee: I, advance: I, term: I, what: opt(S), where: opt(S), payOnDone: opt(B), offerAgain: opt(B) }),
  seize: v("SeizeHoardOrder", () => seize(""), { character: S }),
  sellDebt: v("SellDebtOrder", () => sellDebt("", "", 0), { debt: S, character: S, price: I }),
  payCarriers: v("PayCarriersOrder", () => payCarriers(true), { pay: B }),
  hunt: v("HuntOrder", () => hunt(""), { province: S }),
  huntBands: v("HuntBandsOrder", () => huntBands(true), { on: B, provinces: opt(list(S)) }),
  payFee: v("PayFeeOrder", () => payFee(""), { character: S, pay: B }),
  borrow: v("BorrowOrder", () => borrow("", 0, 0), { character: S, amount: I, repay: I, seasons: I }),
  repay: v("RepayOrder", () => repay("", 0), { debt: S, amount: I }),
  buyNews: v("BuyNewsOrder", () => buyNews("", "Egypt"), { character: S, court: S }),
  dismiss: v("DismissOrder", () => dismiss(""), { character: S }),
  check: v("BackgroundCheckOrder", () => check("", 0), { character: S, spend: I }),
  spy: v("PlaceSpyOrder", () => placeSpy(""), { character: S, court: S, province: S }),
  recall: v("RecallSpyOrder", () => recall(""), { character: S }),
  counterIntel: v("CounterIntelOrder", () => counterIntel(0), { spend: I }),
  roads: v("RoadsOrder", () => roads("Egypt", true), { court: S, close: B }),
  revoke: v("RevokeOrder", () => revoke("Egypt"), { grantee: S, province: opt(S) }),
  grant: v("GrantOrder", () => grant("Egypt", "passage"), { grantee: S, kind: S, province: opt(S), seasons: opt(I) }),
  repudiate: v("RepudiateOrder", () => repudiate(""), { copy: S }),
  assay: v("AssayOrder", () => assay(""), { lot: S }),
  authenticate: v("AuthenticateOrder", () => authenticate("", 0), { copy: S, spend: I }),
  forge: v("ForgeOrder", () => forge("", "", []), { character: S, text: S, seals: list(S), clauses: opt(list(() => ClauseSchema)) }),
  captive: v("CaptiveOrder", () => captive("", "Execute"), { character: S, fate: S, ransom: I, poison: S, spend: opt(I), to: opt(S) }),
  steal: v("StealOrder", () => steal(""), { character: S }),
  gift: v("GiftOrder", () => giftTo("", 0), { character: S, gold: I }),
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
  /** Item 16: a model, file or human seat turns its royal council "on" or "off" from next season ("" leaves it as it is). */
  council: string;
}

export function newTurnSubmission(init: Partial<TurnSubmission> = {}): TurnSubmission {
  return { orders: [], notes: "", summary: "", ledger: [], scheduled: [], standing: [], cancelStanding: [], answers: [], cancelAnswers: [], fromFallback: false, stayAwake: false, council: "", ...init };
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
  council: S,
});
