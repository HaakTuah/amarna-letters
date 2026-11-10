/** The makers of every order (`orders.ts`), with the C# records' defaults. */
import type { LetterFate } from "./held-letters.ts";
import type { UnitKind } from "./map.ts";
import type { WorkKind } from "./works.ts";
import type { Power } from "./power.ts";
import type { Clause } from "./clauses.ts";
import type { GreetingOptions, TabletProposal } from "./records.ts";
import type { Authority, GrantKind } from "./authority.ts";
import type { JobWhat } from "./people.ts";
import type { Mandate } from "./command.ts";
import type { HoldOrder, MoveOrder, SupportOrder, ConvoyOrder, BesiegeOrder, BuildOrder, RazeOrder, SallyOrder, SellOrder, PurchaseOrder, FeedOrder, SendOrder, CaravanOrder, TradeOrder, ShipOrder, TollOrder, DemandOrder, AnswerOrder, CensusOrder, WelcomeOrder, DeportOrder, ExpelOrder, ReturnRunawaysOrder, RaiseOrder, DisbandOrder, FoldOrder, CedeProvinceOrder, GiftUnitOrder, DispatchOrder, ReleaseOrder, SeekCandidatesOrder, HireOrder, RenewOrder, SeizeHoardOrder, SellDebtOrder, PayCarriersOrder, UpkeepOrder, CommandOrder, RelieveOrder, SupplyOrder, MandateOrder, GovernOrder, CrownOrder, UnseatOrder, EnlistOrder,
  PayOffOrder, CourtOrder, HuntOrder, HuntBandsOrder, PayFeeOrder, BorrowOrder, RepayOrder, BuyNewsOrder, DismissOrder, BackgroundCheckOrder, PlaceSpyOrder, RecallSpyOrder, StealOrder, GiftOrder, CounterIntelOrder, RoadsOrder, ClaimNameOrder, RevokeOrder, GrantOrder, RepudiateOrder, AssayOrder, AuthenticateOrder, ForgeOrder, CaptiveFate, CaptiveOrder, PayRansomOrder, LetterOrder, BuyLetterOrder, UnreadableOrder } from "./orders.ts";

export const hold = (unit: string): HoldOrder => ({ type: "hold", unit });
export const command = (unit: string, character: string): CommandOrder => ({ type: "command", unit, character });
export const relieve = (unit: string): RelieveOrder => ({ type: "relieve", unit });
export const supply = (unit: string, buy: boolean, gold = 0): SupplyOrder => ({ type: "supply", unit, buy, gold });
export const mandateOrder = (unit: string, mandate: Mandate | null): MandateOrder => ({ type: "mandate", unit, mandate });
export const govern = (province: string, character: string, levies = 0): GovernOrder => ({ type: "govern", province, character, levies });
export const crown = (character: string, provinces: string[], tribute: number, price = 0): CrownOrder => ({ type: "crown", character, provinces, tribute, price });
export const unseat = (province: string): UnseatOrder => ({ type: "unseat", province });
export const moveCourt = (to: string, alone = false): CourtOrder => (alone ? { type: "court", to, alone } : { type: "court", to });
export const enlist = (province: string, fee: number, term: number): EnlistOrder => ({ type: "enlist", province, fee, term });
export const payOff = (province: string, fee: number, term: number): PayOffOrder => ({ type: "payOff", province, fee, term });
export const move = (unit: string, to: string, forced = false): MoveOrder => (forced ? { type: "move", unit, to, forced } : { type: "move", unit, to });
export const support = (unit: string, supported: string, to: string | null = null): SupportOrder => ({ type: "support", unit, supported, to });
export const convoy = (unit: string, army: string, to: string): ConvoyOrder => ({ type: "convoy", unit, army, to });
export const besiege = (unit: string): BesiegeOrder => ({ type: "besiege", unit });
export const build = (province: string, kind: WorkKind, level: number, labour = false, share: number | null = null): BuildOrder => ({ type: "build", province, kind, level, labour, ...(share !== null ? { share } : {}) });
export const raze = (unit: string, kind: WorkKind): RazeOrder => ({ type: "raze", unit, kind });
export const sally = (city: string, from: string): SallyOrder => ({ type: "sally", city, from });
export const raise = (province: string, kind: UnitKind, men: number | null = null, share: number | null = null): RaiseOrder =>
  share !== null ? { type: "raise", province, kind, share } : men === null ? { type: "raise", province, kind } : { type: "raise", province, kind, men };
export const disband = (unit: string, settle = false): DisbandOrder => (settle ? { type: "disband", unit, settle } : { type: "disband", unit });
export const fold = (unit: string, into: string): FoldOrder => ({ type: "fold", unit, into });
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
export const upkeep = (pay: boolean | null, feed: boolean | null, province: string | null = null): UpkeepOrder => ({ type: "upkeep", pay, feed, ...(province !== null && province !== "" ? { province } : {}) });
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
export const send = (province: string, gold: number): SendOrder => ({ type: "send", province, gold });
export const feed = (province: string, amount: number, own = false): FeedOrder => ({ type: "feed", province, amount, ...(own ? { own } : {}) });
export const caravan = (from: string, to: string, amount: number): CaravanOrder => ({ type: "caravan", from, to, amount });
export const trade = (from: string, to: string, grain: number, gold: number, sneak = false): TradeOrder => ({ type: "trade", from, to, grain, gold, sneak });
export const ship = (fleet: string, from: string, to: string, grain: number, gold: number, trade = true): ShipOrder => ({ type: "ship", fleet, from, to, grain, gold, trade });
export const demand = (how: "share" | "amount", n: number, province: string | null = null): DemandOrder => ({ type: "demand", province, how, n });
export const census = (province: string): CensusOrder => ({ type: "census", province });
export const answer = (province: string, take: boolean): AnswerOrder => ({ type: "answer", province, take });
export const welcome = (province: string): WelcomeOrder => ({ type: "welcome", province });
export const deport = (province: string, to: string, number: number, purse = false): DeportOrder => ({ type: "deport", province, to, number, purse });
export const expel = (province: string, percent = 50): ExpelOrder => ({ type: "expel", province, percent });
export const returnRunaways = (province: string, to: Power): ReturnRunawaysOrder => ({ type: "returnRunaways", province, to });
export const toll = (percent: number, partner: Power | null = null, province: string | null = null): TollOrder => ({ type: "toll", province, partner, percent });
export const placeSpy = (character: string, court: Power | null = null, province: string | null = null, stir = 0): PlaceSpyOrder =>
  stir > 0 ? { type: "spy", character, court, province, stir } : { type: "spy", character, court, province };
export const recall = (character: string): RecallSpyOrder => ({ type: "recall", character });
export const counterIntel = (spend: number): CounterIntelOrder => ({ type: "counterIntel", spend });
export const roads = (court: Power, close: boolean): RoadsOrder => ({ type: "roads", court, close });
export const claimName = (name: string): ClaimNameOrder => ({ type: "claimName", name });
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
export const letter = (province: string, fate: LetterFate, to: Power, price = 0, written: number | null = null): LetterOrder => ({ type: "letter", province, fate, to, price, written });
export const buyLetter = (province: string, written: number | null = null): BuyLetterOrder => ({ type: "buyLetter", province, written });
export const payRansom = (character: string): PayRansomOrder => ({ type: "payRansom", character });
export const unreadable = (text: string, reason: string): UnreadableOrder => ({ type: "unreadable", text, reason });
