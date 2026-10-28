import { Dict } from "../core/collections.ts";
import { B, D, I, type ObjSchema, S, computed, dict, list, obj, opt } from "../core/json.ts";
import { newGameConfig } from "./config.ts";
import type { UnitKind } from "./map.ts";
import { type Order, OrderSchema } from "./orders.ts";
import { type OrderOutcome, OrderOutcomeSchema } from "./outcomes.ts";
import type { Power } from "./power.ts";
import { type Clause, ClauseSchema } from "./clauses.ts";
import { type Claim, ClaimSchema, type Recognition, RecognitionSchema } from "./recognition.ts";
import { type InboxItem, InboxItemSchema } from "./records.ts";
import { type LendOffer, LendOfferSchema } from "./money.ts";
import { type ScheduledOrders, ScheduledOrdersSchema, type StandingOrderView, StandingOrderViewSchema } from "./sleep.ts";
import { type StandingAnswer, StandingAnswerSchema } from "./answers.ts";
import { type GrantView, GrantViewSchema } from "./authority.ts";
import { type Toll, TollSchema } from "./trade.ts";

export interface UnitView {
  power: Power;
  kind: UnitKind;
  province: string;
  /** Of the court's own units only (item 9+a; zero for others'): the grain it carries and the most it can, seasons it went hungry and unpaid in a row, its men's savings. */
  food: number;
  carried: number;
  hungry: number;
  unpaid: number;
  savings: number;
  /** Item 11a+: its men, as anyone who sees it can count them (a full army 5,000, a fleet's crews 2,000). */
  men: number;
}

export function newUnitView(init: Partial<UnitView> = {}): UnitView {
  return {
    power: "Egypt",
    kind: "Army",
    province: "",
    food: 0,
    carried: 0,
    hungry: 0,
    unpaid: 0,
    savings: 0,
    men: 0,
    ...init,
  };
}

export const UnitViewSchema: ObjSchema<UnitView> = obj("UnitView", newUnitView, {
  power: S,
  kind: S,
  province: S,
  food: I,
  carried: I,
  hungry: I,
  unpaid: I,
  savings: I,
  men: I,
});

/**
 * One of the court's own provinces, as its stewards report it (item 9+a): the grain in its stores and the most they hold,
 * the tax in grain it brings in a season as things stand, its town's need a season, and its market's stock, purse and
 * price (in hundredths of a shekel for a measure).
 */
export interface ProvinceEconomyView {
  province: string;
  stores: number;
  capacity: number;
  tax: number;
  need: number;
  stock: number;
  purse: number;
  price: number;
  /**
   * Its people (item 10+a): the settled and the men of fighting age among them, the loose, and how many settled its
   * land carries; its tax in percent of the harvest; a season's share of its last harvest (item 11a+); and how well its countryside ate
   * last season, in thousandths (1000 when it ate its fill).
   */
  settled: number;
  men: number;
  loose: number;
  room: number;
  taxRate: number;
  harvest: number;
  fed: number;
  /**
   * Item 10+b: the loose men standing here who fled another king's land, by that king (to settle, or send back), and
   * whether the besieged city put out its mouths that cannot fight.
   */
  runaways: Dict<string, number>;
  /** Item 11a+: how many in a hundred of the town's mouths it has put out while besieged (0: none). */
  expelled: number;
  /**
   * Item 11a+ (the harvest in each land's own season): the farmers' granary, what they keep of the last harvest to eat until
   * the next (the tax is taken from it a season at a time); the crop growing in its fields; and the seasons until it is
   * reaped (0: this season). `harvest` is now a season's share of the last harvest, what the tax is reckoned from.
   */
  granary: number;
  crop: number;
  reapsIn: number;
}

export function newProvinceEconomyView(init: Partial<ProvinceEconomyView> = {}): ProvinceEconomyView {
  return { province: "", stores: 0, capacity: 0, tax: 0, need: 0, stock: 0, purse: 0, price: 0, settled: 0, men: 0, loose: 0, room: 0, taxRate: 0, harvest: 0, fed: 1000, runaways: new Dict(), expelled: 0, granary: 0, crop: 0, reapsIn: 0, ...init };
}

export const ProvinceEconomyViewSchema: ObjSchema<ProvinceEconomyView> = obj("ProvinceEconomyView", newProvinceEconomyView, {
  province: S,
  stores: I,
  capacity: I,
  tax: I,
  need: I,
  stock: I,
  purse: I,
  price: I,
  settled: I,
  men: I,
  loose: I,
  room: I,
  taxRate: I,
  harvest: I,
  fed: I,
  runaways: dict(I),
  expelled: I,
  granary: I,
  crop: I,
  reapsIn: I,
});

/** One of the court's caravans on the road (item 9+a), or ships in cargo service (item 9+b). */
export interface CaravanView {
  from: string;
  to: string;
  grain: number;
  /** Where it has got to. */
  at: string;
  returning: boolean;
  /** The gold it carries; whether it trades at `to`, smuggles, or is a fleet in cargo service (item 9+b). */
  gold: number;
  trade: boolean;
  sneak: boolean;
  ship: boolean;
}

export function newCaravanView(init: Partial<CaravanView> = {}): CaravanView {
  return { from: "", to: "", grain: 0, at: "", returning: false, gold: 0, trade: false, sneak: false, ship: false, ...init };
}

export const CaravanViewSchema: ObjSchema<CaravanView> = obj("CaravanView", newCaravanView, {
  from: S,
  to: S,
  grain: I,
  at: S,
  returning: B,
  gold: I,
  trade: B,
  sneak: B,
  ship: B,
});

export { type MarketSeen, newMarketSeen, MarketSeenSchema } from "./word.ts";
import { type MarketSeen, MarketSeenSchema } from "./word.ts";

/**
 * A siege as a court sees it: the city, the besieger, who holds the city, and how far it has been worn down against its walls.
 */
export interface SiegeView {
  province: string;
  besieger: Power;
  holder: Power | null;
  /** How far the city has been worn down; it surrenders when this reaches {@link Walls}. */
  progress: number;
  walls: number;
  /** The season the siege began. */
  since: number;
  /**
   * For the city's holder and the besieger only: the besieger's units in the city and next to it, from 1 to 3, which sets
   * the odds that an envoy leaving or coming home to a besieged capital is caught.
   */
  tightness: number | null;
}

export function newSiegeView(init: Partial<SiegeView> = {}): SiegeView {
  return {
    province: "",
    besieger: "Egypt",
    holder: null,
    progress: 0,
    walls: 0,
    since: 0,
    tightness: null,
    ...init,
  };
}

export const SiegeViewSchema: ObjSchema<SiegeView> = obj("SiegeView", newSiegeView, {
  province: S,
  besieger: S,
  holder: opt(S),
  progress: I,
  walls: I,
  since: I,
  tightness: opt(I),
});

export interface LotView {
  id: string;
  from: Power;
  stated: number;
  weighed: number;
  arrivedTurn: number;
}

export function newLotView(init: Partial<LotView> = {}): LotView {
  return {
    id: "",
    from: "Egypt",
    stated: 0,
    weighed: 0,
    arrivedTurn: 0,
    ...init,
  };
}

export const LotViewSchema: ObjSchema<LotView> = obj("LotView", newLotView, {
  id: S,
  from: S,
  stated: I,
  weighed: I,
  arrivedTurn: I,
});

export interface CharacterView {
  id: string;
  name: string;
  origin: string;
  ours: boolean;
  status: string;
  employer: Power | null;
  duty: string;
  where: string;
  /**
   * Your servant away: when it set out and when it is due back, as you can reckon it (see {@link Views.TimingText}).
   */
  timing: string;
  /** Item 11a: your servant's job: its whole fee and the advance handed over (the rest falls due when it is done). */
  fee: number | null;
  advance: number | null;
  /** The season your servant's job began, and the last season of its term. */
  contractFrom: number | null;
  contractUntil: number | null;
  /** One of your people who has given notice: what they ask a season of a new term to serve on. */
  noticePrice: number | null;
  /** With a notice: the season at whose start they leave unless renewed. */
  leavesTurn: number | null;
  /**
   * Your servant's job in plain words: the fee, until when, and what happens then (see {@link Views.TermText}).
   */
  term: string;
  knownFacts: string[];
  pitch: string | null;
  /** Item 10: what the person said it can do when it pitched to you, in words ("says they can slip past most guards"). */
  claims: string[];
  /** Item 10: the king a person at your court says it serves as his envoy, though it brought no letter; null if none. */
  claimsToServe: Power | null;
  /**
   * What someone not in your service asks you a season: named in a pitch, or asked by a free person at your court.
   */
  askingPrice: number | null;
  /** In your service, at your court, with no task: can be sent somewhere this season. */
  ready: boolean;
  /** An envoy or spy you are holding against their will. */
  heldByYou: boolean;
  /**
   * Your captive is an envoy your besiegers caught at a city you besiege (it can be executed, ransomed or released, not turned).
   */
  intercepted: boolean;
  /**
   * One of your people held captive abroad: the ransom its captor demands, once that demand has reached you.
   */
  ransomDemand: number | null;
  /** Item 11a: the rest of a fee you let fall due and did not pay them, a promise broken (order pay_fee pays it at your court); null if none. */
  owed: number | null;
  /** Item 11a: what they offer to lend you, if they stand at your court and would ("Lending to kings"). */
  lends: LendOffer | null;
  /** Item 11b: the news of other courts they offer you, if they stand at your court (order buy_news). */
  news: NewsOffer[];
}

/** Item 11b: a band a court sees: where it works, how many men, its chief's name, and whether it has a ship. */
export interface BandSeen {
  province: string;
  men: number;
  chief: string;
  ship: boolean;
}

export function newBandSeen(init: Partial<BandSeen> = {}): BandSeen {
  return { province: "", men: 0, chief: "", ship: false, ...init };
}

export const BandSeenSchema: ObjSchema<BandSeen> = obj("BandSeen", newBandSeen, { province: S, men: I, chief: S, ship: B });

/** Item 11b: news a person at your court offers of another court: as of when, how many reports, and its price. */
export interface NewsOffer {
  court: string;
  turn: number;
  lines: number;
  price: number;
}

export function newNewsOffer(init: Partial<NewsOffer> = {}): NewsOffer {
  return { court: "", turn: 0, lines: 0, price: 0, ...init };
}

export const NewsOfferSchema: ObjSchema<NewsOffer> = obj("NewsOffer", newNewsOffer, { court: S, turn: I, lines: I, price: I });

export function newCharacterView(init: Partial<CharacterView> = {}): CharacterView {
  return {
    id: "",
    name: "",
    origin: "",
    ours: false,
    status: "",
    employer: null,
    duty: "",
    where: "",
    timing: "",
    fee: null,
    advance: null,
    contractFrom: null,
    contractUntil: null,
    noticePrice: null,
    leavesTurn: null,
    term: "",
    knownFacts: [],
    pitch: null,
    claims: [],
    claimsToServe: null,
    askingPrice: null,
    ready: false,
    heldByYou: false,
    intercepted: false,
    ransomDemand: null,
    owed: null,
    lends: null,
    news: [],
    ...init,
  };
}

export const CharacterViewSchema: ObjSchema<CharacterView> = obj("CharacterView", newCharacterView, {
  id: S,
  name: S,
  origin: S,
  ours: B,
  status: S,
  employer: opt(S),
  duty: S,
  where: S,
  timing: S,
  fee: opt(I),
  advance: opt(I),
  contractFrom: opt(I),
  contractUntil: opt(I),
  noticePrice: opt(I),
  leavesTurn: opt(I),
  term: S,
  knownFacts: list(S),
  pitch: S,
  claims: list(S),
  claimsToServe: opt(S),
  askingPrice: opt(I),
  ready: B,
  heldByYou: B,
  intercepted: B,
  ransomDemand: opt(I),
  owed: opt(I),
  lends: () => LendOfferSchema,
  news: list(() => NewsOfferSchema),
});

/** Item 11a: a debt of the seat's own, as its tablet reads: whom it owes, what is left, and whether the holder stands at its court. */
export interface DebtView {
  id: string;
  /** Who holds the tablet now, by name, as far as the court knows ("Mane", or the lender's name if it went missing unseen). */
  holder: string;
  holderId: string;
  lender: string;
  principal: number;
  owed: number;
  left: number;
  sealedTurn: number;
  dueTurn: number;
  /** The holder stands at your court, so it can be repaid this season (order repay). */
  here: boolean;
}

export function newDebtView(init: Partial<DebtView> = {}): DebtView {
  return { id: "", holder: "", holderId: "", lender: "", principal: 0, owed: 0, left: 0, sealedTurn: 0, dueTurn: 0, here: false, ...init };
}

export const DebtViewSchema: ObjSchema<DebtView> = obj("DebtView", newDebtView, {
  id: S,
  holder: S,
  holderId: S,
  lender: S,
  principal: I,
  owed: I,
  left: I,
  sealedTurn: I,
  dueTurn: I,
  here: B,
});

export interface TabletView {
  /** The tablet as every court names it, by its seals and date (see {@link Views.TabletName}). */
  name: string;
  /**
   * This court's own mark for its copy, for its orders only: every court numbers its copies differently.
   */
  copyId: string;
  tabletId: string;
  text: string;
  seals: Power[];
  proposedBy: Power;
  partner: Power | null;
  sealedTurn: number | null;
  allianceOath: boolean;
  source: string;
  authResult: string | null;
  clauses: Clause[];
  /** Sealed by an envoy for this king (item 9): "by the hand of" the envoy, named. */
  byHand: string | null;
  byHandOf: Power | null;
  /** Within the envoy's authority, shown only to its king and to a host that read its credentials; null otherwise. */
  within: boolean | null;
  /** The season its envoy's king repudiated it, or null. */
  repudiatedTurn: number | null;
}

export function newTabletView(init: Partial<TabletView> = {}): TabletView {
  return {
    clauses: [],
    name: "",
    copyId: "",
    tabletId: "",
    text: "",
    seals: [],
    proposedBy: "Egypt",
    partner: null,
    sealedTurn: null,
    allianceOath: false,
    source: "",
    authResult: null,
    byHand: null,
    byHandOf: null,
    within: null,
    repudiatedTurn: null,
    ...init,
  };
}

export const TabletViewSchema: ObjSchema<TabletView> = obj("TabletView", newTabletView, {
  clauses: list(() => ClauseSchema),
  name: S,
  copyId: S,
  tabletId: S,
  text: S,
  seals: list(S),
  proposedBy: S,
  partner: opt(S),
  sealedTurn: opt(I),
  allianceOath: B,
  source: S,
  authResult: S,
  byHand: opt(S),
  byHandOf: opt(S),
  within: opt(B),
  repudiatedTurn: opt(I),
});

/**
 * A letter the king sent, as his scribes wrote it ({@link MessageTrail}): his record of what he sent with an envoy,
 * to set beside what the envoy reports.
 */
export interface LetterView {
  turn: number;
  envoyId: string;
  envoyName: string;
  to: Power;
  gold: number;
  message: string;
  mandate: string;
  /** The tablet the envoy carried to be sealed, or null. */
  tablet: string | null;
  /** The season the envoy's report reached the king, or null while it is still away. */
  reportedTurn: number | null;
}

export function newLetterView(init: Partial<LetterView> = {}): LetterView {
  return {
    turn: 0,
    envoyId: "",
    envoyName: "",
    to: "Egypt",
    gold: 0,
    message: "",
    mandate: "",
    tablet: null,
    reportedTurn: null,
    ...init,
  };
}

export const LetterViewSchema: ObjSchema<LetterView> = obj("LetterView", newLetterView, {
  turn: I,
  envoyId: S,
  envoyName: S,
  to: S,
  gold: I,
  message: S,
  mandate: S,
  tablet: S,
  reportedTurn: opt(I),
});

/**
 * One seat's view of the world: the public map, its own treasury and people, what its
 * characters chose to tell it. Every seat - human, model or script - receives exactly this.
 */
export interface SeatView {
  turn: number;
  season: string;
  power: Power;
  king: string;
  ended: boolean;
  /** Whether the age has no end ("An open age"). The ending itself is told in words; no number or season of it is shown. */
  openAge: boolean;
  /** What every seat is told of the table's median, in a word ("Short", "Usual", "Long"; rules/ending.ts). */
  ageBand: string;
  gold: number;
  unassayedGold: LotView[];
  income: number;
  upkeep: number;
  /** The upkeep of walls it raised above the map's own, a season (paid after its troops'). */
  wallUpkeep: number;
  /** Item 11a: the rest of its servants' fees, due as their jobs are done (as it believes it for those abroad). */
  feesDue: number;
  /** Item 11a: the fees it let fall due and did not pay, to anyone: broken promises, counted in no score. */
  feesOwed: number;
  /** Item 11a: what its servants' jobs cost a season, each job's fee over its term (as it reckons them). */
  fees: number;
  /** Item 11a: how much of a promised fee or loan people count on from this court, in percent, by its record of paying. */
  trust: number;
  /** Item 11a: its record of paying what fell due: promises kept and broken. */
  kept: number;
  broken: number;
  /** Item 11a: the going rate of service, in percent of what people would ask on their own ("Fees clear the market"). */
  goingRate: number;
  /** Item 11a: the debt tablets of its debts that stand, as it knows them. */
  debts: DebtView[];
  /**
   * Strength by the seat's own ledger (unassayed gold at its weight); never the true figure (see {@link Scoring}).
   */
  strength: number;
  startStrength: number;
  /** What a shekel of yield counts in strength (public, in the rulebook). */
  provinceWeight: number;
  /**
   * Who this court knows holds each land province (build order item 7b, "Hidden by default"): as it is where it sees, and
   * elsewhere as of the season in {@link ownerAsOf}, by word or by what its own people brought home ({@link ownerFrom}).
   */
  owner: Dict<string, Power | null>;
  /** For a province it does not see now: the season its knowledge of the holder dates from. */
  ownerAsOf: Dict<string, number>;
  /** For a province it does not see now: where that knowledge came from ("word from abroad", or a traveller's name). */
  ownerFrom: Dict<string, string>;
  /** The courts whose travellers this court's men stop passing through its land. */
  roadsClosed: Power[];
  /** The kings this court has heard closed their roads to its people. */
  roadsClosedToUs: Power[];
  /** Passage and basing standing on sealed tablets (item 9) that this king granted or was granted. */
  grants: GrantView[];
  /**
   * The walls as this court knows them, by province (a province with none is left out): standing now where it can see
   * troops, elsewhere as it last saw them ({@link Views.WallsKnown}; since the review of the siege package, until
   * which every court saw every wall as it stood).
   */
  walls: Dict<string, number>;
  /** The sieges this court knows of: its own, those of its cities, and those it can see. */
  sieges: SiegeView[];
  /**
   * This court's own land taken by force and still being absorbed, with the season it was taken. Only its own: who holds
   * a province is public, but how it changed hands is not (since the review of the siege package; until then every court
   * saw every king's marks, and so which land had been conquered and which ceded or bought).
   */
  conquered: Dict<string, number>;
  units: UnitView[];
  visible: string[];
  fallen: Power[];
  /** Item 11b: the bands it sees: in its sight, and in its own land. */
  bands: BandSeen[];
  court: CharacterView[];
  known: CharacterView[];
  tablets: TabletView[];
  /**
   * Its own letters in full, oldest first: each envoy's latest, while the envoy is away on that errand as far as the court
   * knows, and once more when its report has come since the court last gave orders (see {@link Views.Letters}).
   */
  letters: LetterView[];
  inbox: InboxItem[];
  travelTimes: string[];
  /** Last season's orders as they resolved, for every unit this court could see. */
  lastSeason: OrderOutcome[];
  /**
   * Whether this seat sleeps after its orders (see {@link GameConfig.SleepingSeats}). The cap on its sleep is never shown.
   */
  sleeps: boolean;
  /** Why this seat was woken this season; empty when it was awake anyway. */
  wokenBecause: string[];
  /** The last season this seat gave orders before this one (0 if it never has). */
  lastCalled: number;
  /**
   * News delivered while this seat slept, oldest first: routine treasury notices left out (this season's is in its
   * news), and at most {@link Views.MaxWhileAsleep} items, the latest.
   */
  whileAsleep: InboxItem[];
  /** Older news of the seasons it slept that did not fit. */
  whileAsleepLeftOut: number;
  /** What happened while it slept that did not wake it, in brief, one line each. */
  digest: string[];
  /** Older digest lines that did not fit. */
  digestLeftOut: number;
  /** Its own orders queued for later seasons, each of its units named by where it stands now. */
  scheduled: ScheduledOrders[];
  /** Its standing orders, each of its units named by where it stands now. */
  standing: StandingOrderView[];
  /** Its standing answers for what arrives at its court (item 6b). */
  answers: StandingAnswer[];
  /**
   * It sleeps and was woken for its audiences only ({@link WokenBecause} names the envoys): its orders stand unless
   * it reopens them at an audience.
   */
  holdsCourt: boolean;
  /** Letters it sent from its audiences this season, which go out with its orders (checked before them). */
  courtLetters: Order[];
  prices: Dict<string, number>;
  /** Its own provinces' stores and markets (item 9+a). */
  provinces: ProvinceEconomyView[];
  /** Its caravans on the road, and its fleets in cargo service. */
  caravans: CaravanView[];
  /** Foreign markets as it last knew them (item 9+b), by province. */
  markets: Dict<string, MarketSeen>;
  /** The tolls it sets, and those on its goods as last reported to it (item 10+b: never posted). */
  tolls: Toll[];
  /** What each free city's elders ask to be bought: what it adds, its land's worth, purse, stores and market (public). */
  cityPrices: Dict<string, number>;
  /**
   * The yield of each land province the court sees (its own and those in its sight), as its people bring it in now
   * (item 10+a), on the scale of the map's yields: a ravaged or emptied province yields less than at the start.
   * Provinces out of sight are left out: the court knows only the map's yield for them.
   */
  yields: Dict<string, number>;
  /** The resistance this court's armies would meet from the people of each land in its sight where no troop stands (item 10+a), where any. */
  resistance: Dict<string, number>;
  /** Its discharged men still walking home (item 10+a). */
  walking: number;
  /** Claims to the rank of Great King and whether each is still new (item 8): public facts. */
  claims: Claim[];
  /** What this court called others, and they it, in the greetings sent between them (item 8). */
  greetings: Recognition[];
}

export function newSeatView(init: Partial<SeatView> = {}): SeatView {
  return {
    greetings: [],
    claims: [],
    turn: 0,
    season: "",
    power: "Egypt",
    king: "",
    ended: false,
    openAge: false,
    ageBand: "Usual",
    gold: 0,
    unassayedGold: [],
    income: 0,
    upkeep: 0,
    wallUpkeep: 0,
    feesDue: 0,
    feesOwed: 0,
    fees: 0,
    trust: 0,
    kept: 0,
    broken: 0,
    goingRate: 100,
    debts: [],
    strength: 0,
    startStrength: 0,
    provinceWeight: newGameConfig().provinceWeight,
    owner: new Dict(),
    ownerAsOf: new Dict(),
    ownerFrom: new Dict(),
    roadsClosed: [],
    roadsClosedToUs: [],
    grants: [],
    walls: new Dict(),
    sieges: [],
    conquered: new Dict(),
    units: [],
    visible: [],
    fallen: [],
    bands: [],
    court: [],
    known: [],
    tablets: [],
    letters: [],
    inbox: [],
    travelTimes: [],
    lastSeason: [],
    sleeps: false,
    wokenBecause: [],
    lastCalled: 0,
    whileAsleep: [],
    whileAsleepLeftOut: 0,
    digest: [],
    digestLeftOut: 0,
    scheduled: [],
    standing: [],
    answers: [],
    holdsCourt: false,
    courtLetters: [],
    prices: new Dict(),
    provinces: [],
    caravans: [],
    markets: new Dict(),
    tolls: [],
    cityPrices: new Dict(),
    yields: new Dict(),
    resistance: new Dict(),
    walking: 0,
    ...init,
  };
}

export const SeatViewSchema: ObjSchema<SeatView> = obj("SeatView", newSeatView, {
  greetings: list(() => RecognitionSchema),
  claims: list(() => ClaimSchema),
  turn: I,
  season: S,
  power: S,
  king: S,
  ended: B,
  openAge: B,
  ageBand: S,
  gold: I,
  unassayedGold: list(() => LotViewSchema),
  income: I,
  upkeep: I,
  wallUpkeep: I,
  feesDue: I,
  feesOwed: I,
  fees: I,
  trust: I,
  kept: I,
  broken: I,
  goingRate: I,
  debts: list(() => DebtViewSchema),
  strength: I,
  startStrength: I,
  provinceWeight: I,
  owner: dict(opt(S)),
  ownerAsOf: dict(I),
  ownerFrom: dict(S),
  roadsClosed: list(S),
  roadsClosedToUs: list(S),
  grants: list(() => GrantViewSchema),
  walls: dict(I),
  sieges: list(() => SiegeViewSchema),
  conquered: dict(I),
  units: list(() => UnitViewSchema),
  visible: list(S),
  fallen: list(S),
  bands: list(() => BandSeenSchema),
  court: list(() => CharacterViewSchema),
  known: list(() => CharacterViewSchema),
  tablets: list(() => TabletViewSchema),
  letters: list(() => LetterViewSchema),
  inbox: list(() => InboxItemSchema),
  travelTimes: list(S),
  lastSeason: list(() => OrderOutcomeSchema),
  sleeps: B,
  wokenBecause: list(S),
  lastCalled: I,
  whileAsleep: list(() => InboxItemSchema),
  whileAsleepLeftOut: I,
  digest: list(S),
  digestLeftOut: I,
  scheduled: list(() => ScheduledOrdersSchema),
  standing: list(() => StandingOrderViewSchema),
  answers: list(() => StandingAnswerSchema),
  holdsCourt: B,
  courtLetters: list(() => OrderSchema),
  prices: dict(I),
  provinces: list(() => ProvinceEconomyViewSchema),
  caravans: list(() => CaravanViewSchema),
  markets: dict(() => MarketSeenSchema),
  tolls: list(() => TollSchema),
  cityPrices: dict(I),
  yields: dict(I),
  resistance: dict(I),
  walking: I,
});

/**
 * One power's standing as any court can reckon it from public ownership alone: the base yield of the land it holds now
 * against the yield of its homeland, which it held at the start. Treasuries are left out, so it is only an estimate of growth.
 */
export interface LandStanding {
  power: Power;
  yield: number;
  startYield: number;
  fallen: boolean;
  // computed in C#: StartYield <= 0 ? 0 : (double)Yield / StartYield
}

export function newLandStanding(init: Partial<LandStanding> = {}): LandStanding {
  return {
    power: "Egypt",
    yield: 0,
    startYield: 0,
    fallen: false,
    ...init,
  };
}

export const LandStandingSchema: ObjSchema<LandStanding> = obj("LandStanding", newLandStanding, {
  power: S,
  yield: I,
  startYield: I,
  fallen: B,
  growth: computed(D, (o: LandStanding) => landGrowth(o)),
});


/** A land's growth: its yield over its starting yield (0 for none at the start). */
export function landGrowth(o: LandStanding): number {
  return o.startYield <= 0 ? 0 : o.yield / o.startYield;
}
