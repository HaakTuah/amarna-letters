import { Dict } from "../core/collections.ts";
import { B, I, type ObjSchema, S, computed, dict, list, obj, opt } from "../core/json.ts";
import { distinct, sortBy, sum } from "../core/seq.ts";
import { type GameConfig, GameConfigSchema, newGameConfig } from "./config.ts";
import { WorldMap } from "./map.ts";
import { type OrderOutcome, OrderOutcomeSchema } from "./outcomes.ts";
import { type Character, CharacterSchema } from "./people.ts";
import { AllPowers, type Power, type RisenPower, cmpPower, namedFor, unmarked } from "./power.ts";
import { type Catastrophe, CatastropheSchema, type GameEvent, GameEventSchema, type InboxItem, InboxItemSchema, type InboxKind, type Journey, JourneySchema, type LossAbroad, LossAbroadSchema, type MessageTrail, MessageTrailSchema, type PendingAudience, PendingAudienceSchema, type PendingTask, PendingTaskSchema, type ScoreRow, ScoreRowSchema, type Tablet, type TabletCopy, TabletCopySchema, TabletSchema, newGameEvent, newInboxItem } from "./records.ts";
import { type SleepState, SleepStateSchema, type StandingBook, StandingBookSchema } from "./sleep.ts";
import { type AnswerBook, AnswerBookSchema } from "./answers.ts";
import { type Claim, ClaimSchema, type HeardName, HeardNameSchema, type Recognition, RecognitionSchema } from "./recognition.ts";
import { type Grant, GrantSchema } from "./authority.ts";
import { type Caravan, CaravanSchema, type Market, MarketSchema } from "./caravans.ts";
import { type Toll, TollSchema } from "./trade.ts";
import { type MarketSeen, MarketSeenSchema } from "./views.ts";
import type { People } from "./land.ts";
import { type Census, CensusSchema, type Count, CountSchema } from "./counts.ts";
import { type MoodRead, MoodReadSchema } from "./moods.ts";
import { type Declaration, DeclarationSchema } from "./declarations.ts";
import { type HeldLetter, HeldLetterSchema } from "./held-letters.ts";
import { type SiegeEnded, SiegeEndedSchema } from "./sieges-ended.ts";
import { type ProvinceReport, ProvinceReportSchema } from "./province-reports.ts";
import { type Band, BandSchema } from "./bands.ts";
import { type Approach, ApproachSchema, type Debt, DebtSchema, type PayFact, PayFactSchema, type PayRecord, PayRecordSchema } from "./money.ts";
import { type Courier, CourierSchema, type Crown, CrownSchema, type Governor, type GovernorGone, GovernorGoneSchema, GovernorSchema, type KingRoad, KingRoadSchema } from "./command.ts";
import { type WorkPlan, WorkPlanSchema } from "./works.ts";
import { type Bill, BillSchema, type Coffer, CofferSchema, type Remittance, RemittanceSchema } from "./coffers.ts";
import { type Unit, UnitSchema } from "./units.ts";
import { type Reign, type ReignEnded, ReignEndedSchema, ReignSchema } from "./kings.ts";

export const PeopleSchema: ObjSchema<People> = obj("People", (init: Partial<People> = {}) => ({ settled: 0, men: 0, loose: 0, ...init }), { settled: I, men: I, loose: I });

/** Discharged men on their way home: how many, to which province, the season they arrive, and the savings they carry. */
export interface Walk {
  home: string;
  men: number;
  arrives: number;
  /** The savings they carry, into their home's purse when they arrive ("Soldiers carry savings home"). */
  savings: number;
  /**
   * Item 10+b: people walking where a king sends them, deported or returned as runaways, `men` counting all of them: they
   * become the settled of `home` when they arrive, a fifth of them men of fighting age. `by`: the king who sent them.
   */
  deported: boolean;
  by: string;
  /**
   * Item 11a+ ("Deportation": deportees walk the route like any company, so they can be freed on the way): for deportees,
   * the road they walk, the season they set out and the province they were taken from. A king whose troops stand on the
   * stretch they walk this season and who is not the deporter's friend frees them: the king whose land they were taken
   * from, or one who closed his roads to the deporter (`route` empty for everyone else). Bug #540: for discharged men too,
   * the season they set out and where from, so their king counts them once word of it could come.
   */
  route: string[];
  departs: number;
  from: string;
}

export const WalkSchema: ObjSchema<Walk> = obj(
  "Walk",
  (init: Partial<Walk> = {}) => ({ home: "", men: 0, arrives: 0, savings: 0, deported: false, by: "", route: [], departs: 0, from: "", ...init }),
  {
    home: S,
    men: I,
    arrives: I,
    savings: I,
    deported: B,
    by: S,
    route: list(S),
    departs: I,
    from: S,
  },
);

/**
 * A drought over a region's rain-fed land or a river's bad flood along its course (item 10+a): the provinces it strikes,
 * the seasons it lasts, the share of the harvest left (`percent`), and its name for the notices.
 */
export interface ClimateEvent {
  id: string;
  kind: "Drought" | "Flood";
  name: string;
  provinces: string[];
  startTurn: number;
  endTurn: number;
  percent: number;
}

export const ClimateEventSchema: ObjSchema<ClimateEvent> = obj(
  "ClimateEvent",
  (init: Partial<ClimateEvent> = {}) => ({ id: "", kind: "Drought" as const, name: "", provinces: [], startTurn: 0, endTurn: 0, percent: 100, ...init }),
  { id: S, kind: S, name: S, provinces: list(S), startTurn: I, endTurn: I, percent: I },
);

export const CURRENT_VERSION = 92;

/**
 * Item 17 ("Armies need food as well as pay"): a king's word to the unit `unit` (by id) to buy its food or take it, with
 * `gold` shekels for it out of his treasury, arriving in season `at` with his couriers. If the unit is gone or no longer
 * his when it arrives, the gold comes back to his treasury.
 */
export interface FoodWord {
  power: Power;
  unit: string;
  /** Where the king named it, sending the word. */
  province: string;
  buy: boolean;
  gold: number;
  at: number;
}

export const FoodWordSchema: ObjSchema<FoodWord> = obj(
  "FoodWord",
  (init: Partial<FoodWord> = {}) => ({ power: "Egypt", unit: "", province: "", buy: false, gold: 0, at: 0, ...init }),
  { power: S, unit: S, province: S, buy: B, gold: I, at: I },
);

export const RisenPowerSchema: ObjSchema<RisenPower> = obj(
  "RisenPower",
  (init: Partial<RisenPower> = {}) => ({ power: "", land: "", king: "", ruler: "", capital: "", turn: 0, from: "", how: "revolt", ...init }),
  { power: S, land: S, king: S, ruler: S, capital: S, turn: I, from: S, how: S },
);

/**
 * Item 17+: a king's standing order to pay and feed his troops, which every king starts with and may change or cancel,
 * holding back pay or food from all his units or from the ones named ("Nothing happens unless someone orders it": the
 * engine pays and feeds nothing on its own). A unit held back counts a season of missing pay, or eats what it carries and
 * then takes from the land, as the economy's rules say.
 */
export interface TroopUpkeep {
  pay: boolean;
  feed: boolean;
  /** The units treated otherwise than the whole order says: held back while it pays, or paid while it pays none. */
  payExcept: string[];
  feedExcept: string[];
}

export const TroopUpkeepSchema: ObjSchema<TroopUpkeep> = obj(
  "TroopUpkeep",
  (init: Partial<TroopUpkeep> = {}) => ({ pay: true, feed: true, payExcept: [], feedExcept: [], ...init }),
  { pay: B, feed: B, payExcept: list(S), feedExcept: list(S) },
);

/** A king's standing order for his troops' pay and food: to pay and feed them all unless he changed it. */
export const upkeepOf = (s: GameState, p: Power): TroopUpkeep => s.upkeep.tryGet(p) ?? { pay: true, feed: true, payExcept: [], feedExcept: [] };
/** Whether the king's standing order pays this unit this season. */
export const paysUnit = (s: GameState, u: Unit): boolean => {
  const o = upkeepOf(s, u.power);
  return o.pay !== o.payExcept.includes(u.id);
};
/** Whether the king's standing order feeds this unit from his stores and his gold this season. */
export const feedsUnit = (s: GameState, u: Unit): boolean => {
  const o = upkeepOf(s, u.power);
  return o.feed !== o.feedExcept.includes(u.id);
};

/**
 * A standing order to hunt bands (the owner's answers to items 11b and 11b+): whose, in which provinces (none named: the
 * whole of its land), and the season it was given, from which talk of it travels out from its capital at the pace of the
 * roads, as any news, to the chiefs who might fear it.
 */
export interface StandingHunt {
  power: Power;
  provinces: string[];
  since: number;
  /** The season it was lifted or replaced, from which talk of that travels as of the order; null while it stands. */
  until: number | null;
}

export const StandingHuntSchema: ObjSchema<StandingHunt> = obj(
  "StandingHunt",
  (init: Partial<StandingHunt> = {}) => ({ power: "Egypt" as Power, provinces: [], since: 0, until: null, ...init }),
  { power: S, provinces: list(S), since: I, until: opt(I) },
);

/** Whether a standing hunt covers a province its power holds: the provinces it names, or, naming none, all its land. */
export const huntCovers = (s: GameState, h: StandingHunt, province: string): boolean =>
  s.owner.getOrDefault(province, null) === h.power && (h.provinces.length === 0 || h.provinces.includes(province));

/** The standing hunt a power's armies follow now, if any (one lifted or replaced is only still talked of). */
export const huntNow = (s: GameState, p: Power): StandingHunt | null => s.hunts.find((h) => h.power === p && h.until === null) ?? null;

/**
 * The authoritative world. Only the engine writes it; seats see filtered views of it. Iteration
 * that decides anything goes through {@link Powers.All} or the map's province list, never
 * dictionary order, so results stay deterministic.
 */
export interface GameState {
  version: number;
  seed: number;
  config: GameConfig;
  turn: number;
  ended: boolean;
  endReason: string | null;
  /**
   * The last season, drawn once in secret at the start ({@link drawFinalSeason}), or null in an open age. Nothing shown
   * reads it: no view, request, look-ahead or frame (build order item 6a).
   */
  finalSeason: number | null;
  /** Whether the drawn last season is the hard cap's rather than the rising chance's. Secret like it. */
  finalByCap: boolean;
  /** Claims to the rank of Great King, new or established (item 8, "Recognition is earned"). */
  claims: Claim[];
  /** Who called whom brother and granted whom the title, in the greetings sent (item 8). */
  recognition: Recognition[];
  /**
   * Item 17+ ("A power's name is a claim"): the name each power claims where it claims another than its own land's. A
   * claim gives nothing by rule.
   */
  names: Dict<Power, string>;
  /** Item 17+: whom each court gives a contested name to, as its greetings last named him (court, then name, to claimant). */
  nameGiven: Dict<Power, Dict<string, Power>>;
  /**
   * Item 17+: the name each court last read a claimant styled by in his sealed greetings, with the season it was sealed
   * (court, then claimant, to name), his own land's included.
   */
  namesHeard: Dict<Power, Dict<Power, HeardName>>;
  /**
   * The season the age ended in, when the table chose to play on into an open age after it ("An open age"); its winners
   * and reason stay recorded in {@link winners} and {@link endReason}. Null otherwise.
   */
  ageEndedTurn: number | null;
  /** The winners of the age, recorded when the table played on past its end (later endings never overwrite them). */
  ageWinners: string[];
  owner: Dict<string, Power | null>;
  /**
   * The walls standing now, by province, from 1 to 3; a province with none is left out (Build order item 5, the siege
   * package, in place of the free cities' garrisons that held with strength 1). They start as the map gives them
   * ({@link MapData.StartWalls}). Walls add nothing to a field battle: a move into a walled province not its
   * mover's takes it at once only if it storms the walls, and otherwise stands inside and takes nothing until a siege
   * wears the city down ({@link Sieges}).
   */
  walls: Dict<string, number>;
  /**
   * The walls as each court last saw them, by province (a province with none left out): at the start as the map gives
   * them, then, as each season resolves, those standing in the court's sight as it gave its orders. A court sees the walls
   * standing now only where it sees troops, and knows them elsewhere as they were when it last saw them
   * ({@link Views.WallsKnown}): walls fall to an earthquake or to unpaid upkeep, and rise for gold, out of other
   * courts' sight. Since the review of the siege package; until then every court saw every wall as it stood.
   */
  wallsSeen: Dict<Power, Dict<string, number>>;
  /**
   * The levels of everything built other than walls, by `kind:province` ({@link works.workKey}): roads, relay stations,
   * harbours, policing and water works (item 15, "One rule for everything built"); a level of 0 is left out.
   */
  built: Dict<string, number>;
  /** The kings' standing orders for what they keep and build, one for each kind in a province where any was given (item 15). */
  works: WorkPlan[];
  /** Every change of a province's holder, oldest first (item 7b): word of it travels, so courts far away learn it late. */
  ownerLog: OwnerChange[];
  /**
   * What each court knows of who holds each province, besides what word has brought (item 7b): what it saw itself, and
   * what its travellers brought home, each with the season it was true and where it came from.
   */
  known: Dict<Power, Dict<string, Known>>;
  /** The courts whose travellers each king stops passing through his land (item 7b, "Passage and access"). */
  roadsClosed: Dict<Power, Power[]>;
  /** The kings each court has heard closed their roads to its people, as far as word has reached it. */
  roadsHeard: Dict<Power, Power[]>;
  /** Passage and basing granted on sealed tablets (item 9), oldest first, ended ones kept as the record. */
  grants: Grant[];
  /** The fallen kingdoms each court has heard of: word of a fall travels too. */
  fallsHeard: Dict<Power, Power[]>;
  /** The sieges under way: a foreign army standing in a walled city, ordered to besiege it. */
  sieges: Siege[];
  /** Sieges ended lately, kept until word of their end has reached every court (bug #517; model/sieges-ended.ts). */
  siegesEnded: SiegeEnded[];
  /**
   * Item 17++ ("Loyalty is a ledger"): each province's people's ledger, by actor (a power, or a character's id), in points:
   * what he gave them less what he took, fading each season (`UnrestData`). Never shown as a number to anyone.
   */
  ledger: Dict<string, Dict<string, number>>;
  /**
   * Item 17++ ("Whom a province obeys"): how fully each province obeys its holder, in thousandths, as last reckoned (left
   * out at a thousand): it pays and counts in his strength by it, a third at the least.
   */
  obeyed: Dict<string, number>;
  /**
   * Bug #540: each held province's reports to its holder, a season each, the newest last, for as long as any word could
   * take (model/province-reports.ts): a court shows its land beyond its couriers' season as their word brings it.
   */
  reports: Dict<string, ProvinceReport[]>;
  /**
   * The grain in each land province's stores, in measures (build order item 9+a, "Production is local"): the tax in goods
   * goes in, armies standing there by their king's leave eat from it, caravans carry it away, and it falls with the
   * province. A province with none is left out.
   */
  stores: Dict<string, number>;
  /** Each land province's local market (item 9+a, "Markets"): its stock of grain and its people's purse. */
  markets: Dict<string, Market>;
  /**
   * Each land province's people at home (item 10+a, "People of the land"): the settled, its men of fighting age among
   * them, and the loose. The men under arms are counted on their units ({@link Unit.men}).
   */
  people: Dict<string, People>;
  /** Discharged men walking home ("Disbanding takes time"): they bring in no harvest until they arrive. */
  walking: Walk[];
  /** Droughts and river floods under way (item 10+a, "Land and climate", "Rivers"), oldest first. */
  climate: ClimateEvent[];
  /**
   * What each king asks of a province of his in grain (item 17++, "The king says how much he wants"): a share of its
   * harvest, in percent, where it is not the default (`shares`), or an amount, in measures a season (`amounts`), which
   * stands in place of a share.
   */
  shares: Dict<string, number>;
  amounts: Dict<string, number>;
  /** Each king's last counts of provinces, as they reached his court (item 17++, "Counts as the scribes knew them"). */
  counts: Dict<Power, Dict<string, Count>>;
  /** The scribes out counting, until their count reaches their court (item 17++, "A census"). */
  censuses: Census[];
  /** Item 17++, part C: each court's dated reads of its land's mood, as they reach it ("Who holds what, and the mood of the land"). */
  moodReads: MoodRead[];
  /** Item 17++ ("taken up, never thrust on anyone"): provinces declared for a power, and claims ceded by treaty, until answered or lapsed. */
  declarations: Declaration[];
  /** #592: provinces' offers caught on the road, held by their captors. */
  lettersHeld: HeldLetter[];
  /** The men levied this season to build and keep what stands (the corvée, item 15), by province: away from the next harvest. */
  corvee: Dict<string, number>;
  /** How well each province's countryside ate last season, in thousandths, where it went short (item 10+a). */
  fed: Dict<string, number>;
  /** The caravans on the road (item 9+a, "Caravans carry a kingdom's goods"), and ships in cargo service (item 9+b). */
  caravans: Caravan[];
  /** Bug #540: caravans whose journey ended lately, each with its last report, kept until word of the end could come. */
  caravansGone: Caravan[];
  /**
   * Gold travels both ways (#587, "One treasury, many stores"): the king's gold kept in his far provinces, the bills for
   * what was done there on credit, carried home, and gold on the road with his couriers to a far province or back.
   */
  coffers: Coffer[];
  bills: Bill[];
  sent: Remittance[];
  /** The tolls each power sets on goods entering its land (item 9+b, "Tolls and smuggling"); standing until changed. */
  tolls: Toll[];
  /** Foreign markets as each court last knew them (item 9+b): seen where it sees the land, or found by its traders. */
  marketsSeen: Dict<Power, Dict<string, MarketSeen>>;
  /** Item 11a: each party's record of paying what fell due, fees and loans ("A name made of outcomes"). */
  payRecords: Dict<string, PayRecord>;
  /** Every promise to pay kept or broken, as news that travels (the owner's answers to item 11a). */
  payFacts: PayFact[];
  /**
   * Promises kept and broken folded out of {@link payFacts} once old news (`knower|party`): what each court had heard of
   * them. Courts keep their records, and each person keeps the old talk it heard as its own (`Character.payOld`).
   */
  payKnown: Dict<string, PayRecord>;
  /** The courts whose standing order is to pay the carriers of their people's letters on delivery (order payCarriers). */
  payCarriers: Power[];
  /** Item 17+: each king's standing order to pay and feed his troops, where he changed it (absent: pay and feed them all). */
  upkeep: Dict<Power, TroopUpkeep>;
  /**
   * Item 16, "The royal council": the seats that turned their council off (a model, file or human seat has it on unless it
   * is here; script seats never have one). Recorded so experiments can report whether it was on.
   */
  councilOff: Power[];
  /** The owner's answers to items 11b and 11b+: the standing orders that armies fall on bands, by province or the whole land. */
  hunts: StandingHunt[];
  /** The hunts ordered this season (`power|province`), carried out as the next season begins. */
  huntNow: string[];
  /** Item 11a: every debt tablet sealed, standing or ended ("The debt tablet is the claim"). */
  debts: Debt[];
  /** Item 11a: approaches between characters waiting for an answer, and those answered this season. */
  approaches: Approach[];
  /** Item 11a, "A baseline, not a limit": the pool the world keeps near, set at the start. */
  baseline: number;
  /** Item 11a: the last season each court asked for candidates, which those seeking service hear of. */
  hiring: Dict<Power, number>;
  /** Item 10+b: the gold the loose men of each province carry, robbed from purses and stores ("Bandits rob the purse"). */
  loot: Dict<string, number>;
  /** Item 11b: the bands on the land and the coasts, each led by a character ("Bands are a character's soldiers"). */
  bands: Band[];
  /** Item 13 ("Governors"): the governorships granted, standing or on their way; ended ones are dropped. */
  governors: Governor[];
  /** Item 17++: governorships ended whose word has not yet reached their king's court; his view keeps them until it does. */
  governorsGone: GovernorGone[];
  /** Item 17++: grants of kingship on their way, answered, or their price on the road to the king; done ones are dropped. */
  crowns: Crown[];
  /**
   * Item 13 ("The capital is wherever the king is"): the province where each king is, which is his capital, where his
   * court sits and from where his orders travel; a king never moved is at his map capital and left out.
   */
  court: Dict<Power, string>;
  /**
   * Item 17b, part C ("A realm holds by its ledger"): the province where each king stands apart from his court, from where
   * he commands; a king with his court is left out.
   */
  kingAt: Dict<Power, string>;
  /**
   * Item 17b, part C: where a court still believes its king stands apart from it, while word that he was taken or died
   * there is on its way; he commands from nowhere meanwhile, and its orders go out from the court.
   */
  kingHeard: Dict<Power, string>;
  /**
   * Item 17b, part C: the season each person standing at a court came to stand there, by `<character>@<court>`, by which
   * one newly come reaches its king away from it as the notices of the court's business do (`broughtToKing`).
   */
  cameToCourt: Dict<string, number>;
  /** Item 13: the courts on the road, with their kings or without them; item 17b, part C: kings on the road alone. */
  kingRoads: KingRoad[];
  /** Item 13: orders on the road with the realm's couriers, from a king's court to where they are carried out. */
  couriers: Courier[];
  /**
   * Item 11b ("Where characters are, and what they speak"): for each court, the letters written there that found a carrier,
   * and the seasons they waited in all, to measure how long a court's letters wait.
   */
  lettersCarried: Dict<Power, number>;
  lettersWaited: Dict<Power, number>;
  /** Item 12: the same by the court a letter goes to, whose carrier must be understood there. */
  lettersToCarried: Dict<Power, number>;
  lettersToWaited: Dict<Power, number>;
  /**
   * Item 11a+ ("Period first": the harvest in each land's own season), by land province: the crop growing in its fields
   * since its last reaping, which each season's hands add to; the harvest it last reaped; and the farmers' granary, the
   * food they keep from it to eat until the next, from which the tax is taken a season at a time.
   */
  crop: Dict<string, number>;
  reaped: Dict<string, number>;
  granary: Dict<string, number>;
  /** Item 10+b: the loose men standing in each province who fled another kingdom, by the king whose land they fled. */
  runaways: Dict<string, Dict<Power, number>>;
  /** Item 10+b: a besieged city that put out the mouths that cannot fight: the share of its town's need it no longer eats. */
  expelled: Dict<string, number>;
  /**
   * The tolls each court knows to stand on its goods (item 10+b): never posted, only as last reported to it, by its
   * caravans, ships and envoys coming home ("Tolls and smuggling"). Its own tolls it always knows.
   */
  tollsKnown: Dict<Power, Toll[]>;
  /**
   * The besieged cities that could not feed their mouths in full when the season began (item 9+a, "How long a siege
   * lasts"): each surrenders to its besieger with the season's sieges, if the siege still stands.
   */
  starving: string[];
  units: Unit[];
  /**
   * Bug #600: units that left the game lately (destroyed, disbanded, mutinied, lost to winter or plague), each with its
   * reports, kept until word of its end could reach its king; till then he knows it as its last report has it.
   */
  unitsGone: Unit[];
  treasuries: Dict<Power, Treasury>;
  /**
   * Each realm's strength when its reigning king came to the throne: at the start, at a rise or grant, and since item 17b
   * part D at each heir's accession. Its growth, and its king's score, are measured from it.
   */
  startStrength: Dict<Power, number>;
  eliminated: Power[];
  /** Item 13+: the powers risen in play, as they rose: a fallen kingdom's governors ruling their provinces. */
  risen: RisenPower[];
  /** Item 17b: each power's king as a person, his traits as this game drew them. */
  reigns: Dict<Power, Reign>;
  /** Item 17b, part B: the reigns ended by a king's death, as they ended. */
  reignsEnded: ReignEnded[];
  /** Item 17b, part B: by realm, how many of its heirs each other court has heard of, as word of each reaches it. */
  reignsHeard: Dict<Power, Dict<Power, number>>;
  /**
   * Item 17: each held province's unrest as last reckoned, from item 17++ how far its holder's lead in its people's eyes
   * falls short of a firm hold (its holder never sees the number: his governor, spies and the people's complaints tell
   * him in words).
   */
  restless: Dict<string, number>;
  /** Item 17: the season each province last changed hands (to a power or to nobody). */
  takenAt: Dict<string, number>;
  /**
   * Item 17++: walled provinces whose walls a foe's troops stormed, by the power whose men broke in: they stand within the
   * walls, so their force weighs in full with its people, until they leave or it changes hands.
   */
  breached: Dict<string, Power>;
  /** Item 17++: each unit's men's ledger, by actor (a power, or a character's id), of what each gave them and took from them. */
  armies: Dict<string, Dict<string, number>>;
  /** Item 17: a king's word to an army on how to get its food, with the gold sent for it, on the road to it. */
  foodWord: FoodWord[];
  /**
   * Each kingdom's fall: when, to whom, and the land that passed (Build order item 5: a kingdom falls with its capital).
   */
  falls: KingdomFall[];
  /**
   * The record of wars, for the measures of the pace of war (Build order item 5): for each king, the season each other
   * king's troops first got into land he held (a move into it that succeeded, whether or not it took the province).
   */
  invaded: Dict<Power, Dict<Power, number>>;
  characters: Character[];
  journeys: Journey[];
  audiences: PendingAudience[];
  /** Item 12, "Speaking": envoys at a court where nobody has understood them yet, their audiences waiting. */
  unheard: PendingAudience[];
  /** Item 12, "Who speaks what": each king's skill in each language, as a character's ("Kings follow the same rules"). */
  kingTongues: Dict<Power, Dict<string, number>>;
  tablets: Tablet[];
  copies: TabletCopy[];
  catastrophes: Catastrophe[];
  /**
   * Servants caught or put to death abroad, at the court that did it: the talk of that court, which envoys and spies there carry home.
   */
  losses: LossAbroad[];
  tasks: PendingTask[];
  counterIntel: Dict<Power, number>;
  /**
   * Seats that may sleep (model and file seats, when {@link GameConfig.SleepingSeats} is on). Each sees only its own.
   */
  sleep: Dict<Power, SleepState>;
  /**
   * Every seat's standing orders, awake or asleep (since the additions to the fix pass after item 4); a seat that never
   * kept one has no entry. Each sees only its own.
   */
  standing: Dict<Power, StandingBook>;
  /** Each king's standing answers for what arrives at its court (item 6b); a king that never gave one has none. */
  answers: Dict<Power, AnswerBook>;
  inbox: Dict<Power, InboxItem[]>;
  /** The orders each power could see resolve last season (its own and those in sight). */
  lastSeen: Dict<Power, OrderOutcome[]>;
  trails: MessageTrail[];
  events: GameEvent[];
  scores: ScoreRow[];
  winners: string[];
  /**
   * How many ids each kind of object has been given, by its prefix ({@link IdKinds}). Every kind counts on its own,
   * so making more or fewer objects of one kind, or a kind added later, never shifts the ids of another, nor with them
   * the rolls keyed by those ids. (Until version 4 all kinds shared one counter, and new inventory tablets shifted the
   * ids, and so the dice, of everything made after them.)
   */
  idCounters: Dict<string, number>;
  // computed in C#: Powers.All.Where(IsAlive)
  /** While a season resolves, news is stamped for the next season, when the courts read it. */
  deliveryOffset: number; // not serialized
  /**
   * Item 17b, part C: for each king apart from his court, the seasons a courier takes from his court to him, by which the
   * court's business it sends on reaches him (`CourtKinds`); set each season by the engine, not serialized.
   */
  courtLag: Dict<Power, number>;
}

export function newGameState(init: Partial<GameState> = {}): GameState {
  return {
    version: CURRENT_VERSION,
    seed: 0,
    config: newGameConfig(),
    turn: 1,
    ended: false,
    endReason: null,
    finalSeason: null,
    finalByCap: false,
    claims: [],
    recognition: [],
    names: new Dict(),
    nameGiven: new Dict(),
    namesHeard: new Dict(),
    ageEndedTurn: null,
    ageWinners: [],
    owner: new Dict(),
    walls: new Dict(),
    wallsSeen: new Dict(),
    built: new Dict(),
    works: [],
    ownerLog: [],
    known: new Dict(),
    roadsClosed: new Dict(),
    roadsHeard: new Dict(),
    grants: [],
    fallsHeard: new Dict(),
    sieges: [],
    siegesEnded: [],
    ledger: new Dict(),
    obeyed: new Dict(),
    reports: new Dict(),
    stores: new Dict(),
    markets: new Dict(),
    caravans: [],
    caravansGone: [],
    coffers: [],
    bills: [],
    sent: [],
    tolls: [],
    marketsSeen: new Dict(),
    payRecords: new Dict(),
    payFacts: [],
    payKnown: new Dict(),
    payCarriers: [],
    upkeep: new Dict(),
    councilOff: [],
    hunts: [],
    huntNow: [],
    debts: [],
    approaches: [],
    baseline: 0,
    hiring: new Dict(),
    loot: new Dict(),
    bands: [],
    governors: [],
    governorsGone: [],
    crowns: [],
    court: new Dict(),
    kingAt: new Dict(),
    kingHeard: new Dict(),
    cameToCourt: new Dict(),
    kingRoads: [],
    couriers: [],
    lettersCarried: new Dict(),
    lettersWaited: new Dict(),
    lettersToCarried: new Dict(),
    lettersToWaited: new Dict(),
    crop: new Dict(),
    reaped: new Dict(),
    granary: new Dict(),
    runaways: new Dict(),
    expelled: new Dict(),
    tollsKnown: new Dict(),
    starving: [],
    units: [],
    unitsGone: [],
    treasuries: new Dict(),
    startStrength: new Dict(),
    eliminated: [],
    risen: [],
    reigns: new Dict(),
    reignsEnded: [],
    reignsHeard: new Dict(),
    restless: new Dict(),
    takenAt: new Dict(),
    breached: new Dict(),
    armies: new Dict(),
    foodWord: [],
    falls: [],
    invaded: new Dict(),
    characters: [],
    journeys: [],
    audiences: [],
    unheard: [],
    kingTongues: new Dict(),
    tablets: [],
    copies: [],
    catastrophes: [],
    people: new Dict(),
    walking: [],
    climate: [],
    shares: new Dict(),
    amounts: new Dict(),
    counts: new Dict(),
    censuses: [],
    moodReads: [],
    declarations: [],
    lettersHeld: [],
    corvee: new Dict(),
    fed: new Dict(),
    losses: [],
    tasks: [],
    counterIntel: new Dict(),
    sleep: new Dict(),
    standing: new Dict(),
    answers: new Dict(),
    inbox: new Dict(),
    lastSeen: new Dict(),
    trails: [],
    events: [],
    scores: [],
    winners: [],
    idCounters: new Dict(),
    deliveryOffset: 0,
    courtLag: new Dict(),
    ...init,
  };
}

export const GameStateSchema: ObjSchema<GameState> = obj("GameState", newGameState, {
  version: I,
  seed: I,
  config: () => GameConfigSchema,
  turn: I,
  ended: B,
  endReason: S,
  finalSeason: opt(I),
  finalByCap: B,
  claims: list(() => ClaimSchema),
  recognition: list(() => RecognitionSchema),
  names: dict(S),
  nameGiven: dict(dict(S)),
  namesHeard: dict(dict(() => HeardNameSchema)),
  ageEndedTurn: opt(I),
  ageWinners: list(S),
  owner: dict(opt(S)),
  walls: dict(I),
  wallsSeen: dict(dict(I)),
  built: dict(I),
  works: list(() => WorkPlanSchema),
  ownerLog: list(() => OwnerChangeSchema),
  known: dict(dict(() => KnownSchema)),
  roadsClosed: dict(list(S)),
  roadsHeard: dict(list(S)),
  grants: list(() => GrantSchema),
  fallsHeard: dict(list(S)),
  sieges: list(() => SiegeSchema),
  siegesEnded: list(() => SiegeEndedSchema),
  ledger: dict(dict(I)),
  obeyed: dict(I),
  reports: dict(list(() => ProvinceReportSchema)),
  stores: dict(I),
  markets: dict(() => MarketSchema),
  people: dict(() => PeopleSchema),
  walking: list(() => WalkSchema),
  climate: list(() => ClimateEventSchema),
  shares: dict(I),
  amounts: dict(I),
  counts: dict(dict(() => CountSchema)),
  censuses: list(() => CensusSchema),
  moodReads: list(() => MoodReadSchema),
  declarations: list(() => DeclarationSchema),
  lettersHeld: list(() => HeldLetterSchema),
  corvee: dict(I),
  fed: dict(I),
  caravans: list(() => CaravanSchema),
  caravansGone: list(() => CaravanSchema),
  coffers: list(() => CofferSchema),
  bills: list(() => BillSchema),
  sent: list(() => RemittanceSchema),
  tolls: list(() => TollSchema),
  marketsSeen: dict(dict(() => MarketSeenSchema)),
  payRecords: dict(() => PayRecordSchema),
  payFacts: list(() => PayFactSchema),
  payKnown: dict(() => PayRecordSchema),
  payCarriers: list(S),
  upkeep: dict(() => TroopUpkeepSchema),
  councilOff: list(S),
  hunts: list(() => StandingHuntSchema),
  huntNow: list(S),
  debts: list(() => DebtSchema),
  approaches: list(() => ApproachSchema),
  baseline: I,
  hiring: dict(I),
  loot: dict(I),
  bands: list(() => BandSchema),
  governors: list(() => GovernorSchema),
  governorsGone: list(() => GovernorGoneSchema),
  crowns: list(() => CrownSchema),
  court: dict(S),
  kingAt: dict(S),
  kingHeard: dict(S),
  cameToCourt: dict(I),
  kingRoads: list(() => KingRoadSchema),
  couriers: list(() => CourierSchema),
  lettersCarried: dict(I),
  lettersWaited: dict(I),
  lettersToCarried: dict(I),
  lettersToWaited: dict(I),
  crop: dict(I),
  reaped: dict(I),
  granary: dict(I),
  runaways: dict(dict(I)),
  expelled: dict(I),
  tollsKnown: dict(list(() => TollSchema)),
  starving: list(S),
  units: list(() => UnitSchema),
  unitsGone: list(() => UnitSchema),
  treasuries: dict(() => TreasurySchema),
  startStrength: dict(I),
  eliminated: list(S),
  risen: list(() => RisenPowerSchema),
  reigns: dict(() => ReignSchema),
  reignsEnded: list(() => ReignEndedSchema),
  reignsHeard: dict(dict(I)),
  restless: dict(I),
  takenAt: dict(I),
  breached: dict(S),
  armies: dict(dict(I)),
  foodWord: list(() => FoodWordSchema),
  falls: list(() => KingdomFallSchema),
  invaded: dict(dict(I)),
  characters: list(() => CharacterSchema),
  journeys: list(() => JourneySchema),
  audiences: list(() => PendingAudienceSchema),
  unheard: list(() => PendingAudienceSchema),
  kingTongues: dict(dict(I)),
  tablets: list(() => TabletSchema),
  copies: list(() => TabletCopySchema),
  catastrophes: list(() => CatastropheSchema),
  losses: list(() => LossAbroadSchema),
  tasks: list(() => PendingTaskSchema),
  counterIntel: dict(I),
  sleep: dict(() => SleepStateSchema),
  standing: dict(() => StandingBookSchema),
  answers: dict(() => AnswerBookSchema),
  inbox: dict(list(() => InboxItemSchema)),
  lastSeen: dict(list(() => OrderOutcomeSchema)),
  trails: list(() => MessageTrailSchema),
  events: list(() => GameEventSchema),
  scores: list(() => ScoreRowSchema),
  winners: list(S),
  idCounters: dict(I),
  alive: computed(list(S), (o: GameState) => alive(o)),
});

/**
 * The fall of a kingdom with its capital: the season, the power that took the capital, and the land that passed to it.
 */
export interface KingdomFall {
  power: Power;
  turn: number;
  /** The power that took the capital; null if it fell in the same season, when the land was left free. */
  conqueror: Power | null;
  capital: string;
  /**
   * The land it still held when its capital was taken, which passed with the capital (the capital not among it).
   */
  land: string[];
}

export function newKingdomFall(init: Partial<KingdomFall> = {}): KingdomFall {
  return {
    power: "Egypt",
    turn: 0,
    conqueror: null,
    capital: "",
    land: [],
    ...init,
  };
}

export const KingdomFallSchema: ObjSchema<KingdomFall> = obj("KingdomFall", newKingdomFall, {
  power: S,
  turn: I,
  conqueror: opt(S),
  capital: S,
  land: list(S),
});

/**
 * A siege under way (Build order item 5): a foreign army standing in a walled city it does not hold, whose king ordered it
 * to besiege the city. Each season the army holds there, the city's stores run down by one, or by two if another unit
 * supports the army holding and the support is not cut; when they reach the level of its walls the city surrenders to the
 * besieger at the end of that season. The siege ends, and its progress is lost, if the army leaves or is destroyed.
 */
export interface Siege {
  province: string;
  /** The besieger. */
  power: Power;
  /** The besieging army. */
  unitId: string;
  /** How far the city has been worn down: it surrenders when this reaches the level of its walls. */
  progress: number;
  /** The season the first besiege order ran. */
  since: number;
  /** Item 10+b: the seasons an island city without water of its own has been blockaded at sea ("Water too"). */
  blockaded: number;
  /** Item 17: the seasons it has starved under this siege; its gate opens from within after a few ("How long a siege lasts"). */
  hungry: number;
  /** Bug #517: its progress at the end of each season since it began, so a far court reads it as word of it last came. */
  history: number[];
}

export function newSiege(init: Partial<Siege> = {}): Siege {
  return {
    province: "",
    power: "Egypt",
    unitId: "",
    progress: 0,
    since: 0,
    blockaded: 0,
    hungry: 0,
    history: [],
    ...init,
  };
}

export const SiegeSchema: ObjSchema<Siege> = obj("Siege", newSiege, {
  province: S,
  power: S,
  unitId: S,
  progress: I,
  since: I,
  blockaded: I,
  hungry: I,
  history: list(I),
});

export interface Treasury {
  /** Fine gold actually held, in shekels. */
  gold: number;
  /** Received shipments not yet assayed. The owner's ledger counts them at face value. */
  lots: GoldLot[];
  /** The gold that came in last season from the mines and from sales at its markets (item 9+a). */
  income: number;
  // computed in C#: Gold + Lots.Sum(l => l.Face - l.True)
}

export function newTreasury(init: Partial<Treasury> = {}): Treasury {
  return {
    gold: 0,
    lots: [],
    income: 0,
    ...init,
  };
}

export const TreasurySchema: ObjSchema<Treasury> = obj("Treasury", newTreasury, {
  gold: I,
  lots: list(() => GoldLotSchema),
  income: I,
  ledger: computed(I, (o: Treasury) => ledger(o)),
});

export interface GoldLot {
  id: string;
  from: Power;
  /** What the tablet's inventory said was sent. */
  stated: number;
  /** What was weighed on arrival (after any skimming). */
  face: number;
  /** The fine gold in it (after debasement). */
  true: number;
  arrivedTurn: number;
}

export function newGoldLot(init: Partial<GoldLot> = {}): GoldLot {
  return {
    id: "",
    from: "Egypt",
    stated: 0,
    face: 0,
    true: 0,
    arrivedTurn: 0,
    ...init,
  };
}

export const GoldLotSchema: ObjSchema<GoldLot> = obj("GoldLot", newGoldLot, {
  id: S,
  from: S,
  stated: I,
  face: I,
  true: I,
  arrivedTurn: I,
});

// ---------------------------------------------------------------- GameState's methods

/** The next id of a kind: its prefix and its own count, "t1", "t2", ... */
export function newId(s: GameState, prefix: string): string {
  const n = s.idCounters.getOrDefault(prefix, 0) + 1;
  s.idCounters.set(prefix, n);
  return `${prefix}${n}`;
}

export function unitAt(s: GameState, province: string): Unit | null {
  return s.units.find((u) => u.province === province) ?? null;
}

/** The level of a province's walls now (0 for none). */
export function wallsOf(s: GameState, province: string): number {
  return s.walls.getOrDefault(province, 0);
}

/** The siege of a province under way, if any. */
export function siegeOf(s: GameState, province: string): Siege | null {
  return s.sieges.find((x) => x.province === province) ?? null;
}

export function findCharacter(s: GameState, id: string | null | undefined): Character | null {
  if (id === null || id === undefined) return null;
  return s.characters.find((c) => c.id === id) ?? null;
}

/** A character by id; throws when there is none. */
export function char(s: GameState, id: string): Character {
  const c = s.characters.find((x) => x.id === id);
  if (!c) throw new Error("Sequence contains no matching element");
  return c;
}

export function isAlive(s: GameState, p: Power): boolean {
  return !s.eliminated.includes(p);
}

/** The powers still in the game, in the fixed order. */
export function alive(s: GameState): Power[] {
  return AllPowers.filter((p) => isAlive(s, p));
}

/** The land a power holds, in the map's order. */
export function ownedBy(s: GameState, p: Power): string[] {
  return WorldMap.default.landProvinces.filter((x) => s.owner.getOrDefault(x.id, null) === p).map((x) => x.id);
}

export function inboxOf(s: GameState, p: Power): InboxItem[] {
  let list = s.inbox.tryGet(p);
  if (!list) s.inbox.set(p, (list = []));
  return list;
}

/**
 * Item 17b, part C: the notices of a court's own business (audiences, envoys' and spies' reports, foreign news, people
 * presenting themselves, tablets and the checks of them), which a court sends on to its king when he is away from it.
 */
export const CourtKinds: ReadonlySet<InboxKind> = new Set<InboxKind>(["Audience", "EnvoyReport", "SpyReport", "Rumor", "CheckResult", "Candidates", "Assay", "Authentication", "Tablet"]);

/**
 * A notice to a court: its powers named as that court knows and gives them (item 17+, {@link namedFor}), unless `named` is
 * false, for a notice that speaks of a name itself rather than the power it names. A notice of the court's own business
 * (`CourtKinds`) reaches a king away from it when his court's courier could bring it (`GameState.courtLag`), unless `atCourt`
 * is false, for word timed by its own road.
 */
export function notify(s: GameState, p: Power, kind: InboxKind, title: string, body: string, subject: string | null = null, named = true, atCourt = true): void {
  title = named ? namedFor(p, title) : unmarked(title);
  body = named ? namedFor(p, body) : unmarked(body);
  // A person the court knows by a false name (item 10) is named to it by that name.
  const c = subject === null ? null : (s.characters.find((x) => x.id === subject) ?? null);
  const alias = c === null ? null : (c.declared.find((d) => d.court === p && d.exposed === null)?.name ?? null);
  if (c !== null && alias !== null && alias !== c.name) {
    const own = new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    title = title.replace(own, alias);
    body = body.replace(own, alias);
  }
  const lag = atCourt && CourtKinds.has(kind) ? s.courtLag.getOrDefault(p, 0) : 0;
  inboxOf(s, p).push(newInboxItem({ turn: s.turn + s.deliveryOffset + lag, kind, title, body, subject }));
}

export function logEvent(s: GameState, kind: string, text: string, visibleTo: Iterable<Power> | null = null, signal: string | null = null): GameEvent {
  const e = newGameEvent({
    turn: s.turn,
    kind,
    text,
    visibleTo: visibleTo === null ? [...AllPowers] : sortBy(distinct(visibleTo), [(p: Power) => p, cmpPower]),
    signal,
  });
  s.events.push(e);
  return e;
}

/**
 * The kinds of object the engine numbers with {@link newId}, by prefix. Each prefix is letters only and belongs to one
 * kind, so ids stay unique across kinds although each kind counts from 1. A new kind takes a prefix of its own here (the
 * tests check that every id issued in play has one, and that no two kinds share one).
 */
export const IdKinds: ReadonlyMap<string, string> = new Map([
  ["a", "audience"],
  ["b", "band"],
  ["c", "character"],
  ["d", "debt tablet"],
  ["f", "fact about a character"],
  ["g", "lot of gold"],
  ["h", "approach between characters"],
  ["j", "journey"],
  ["k", "copy of a tablet"],
  ["kg", "kingship offered to a man"],
  ["m", "message trail"],
  ["p", "grant of passage or basing"],
  ["pf", "promise to pay kept or broken, as news"],
  ["q", "task owed to a court"],
  ["r", "request to a character's mind"],
  ["t", "tablet"],
  ["u", "unit"],
  ["v", "caravan"],
  ["x", "catastrophe"],
]);

/** Standing orders are numbered per seat ("s1", "s2", ...) by StandingBook.last, not here; no kind may take "s". */
export const StandingOrderPrefix = "s";

/** What the owner's ledger counts: fine gold, and received lots at face value. */
export function ledger(t: Treasury): number {
  return t.gold + sum(t.lots, (l) => l.face - l.true);
}

/** A province changed holder in a turn (GameState.ownerLog). */
export interface OwnerChange {
  province: string;
  turn: number;
  owner: Power | null;
}

export function newOwnerChange(init: Partial<OwnerChange> = {}): OwnerChange {
  return { province: "", turn: 0, owner: null, ...init };
}

export const OwnerChangeSchema: ObjSchema<OwnerChange> = obj("OwnerChange", newOwnerChange, { province: S, turn: I, owner: opt(S) });

/** Who a court knows holds a province: as of a season, and from where (seen by its own people, or a traveller's name). */
export interface Known {
  owner: Power | null;
  turn: number;
  source: string;
}

export function newKnown(init: Partial<Known> = {}): Known {
  return { owner: null, turn: 0, source: "", ...init };
}

export const KnownSchema: ObjSchema<Known> = obj("Known", newKnown, { owner: opt(S), turn: I, source: S });
