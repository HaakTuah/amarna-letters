import { Dict } from "../core/collections.ts";
import {
  B,
  I,
  type ObjSchema,
  S,
  computed,
  dict,
  list,
  obj,
  opt,
} from "../core/json.ts";
import type { Power } from "./power.ts";
import { type Clause, ClauseSchema } from "./clauses.ts";
import {
  type Errand,
  ErrandSchema,
  type Hoard,
  HoardSchema,
  type LendOffer,
  LendOfferSchema,
  type PayOld,
  PayOldSchema,
  type Strategy,
} from "./money.ts";
import {
  type ChiefChoice,
  ChiefChoiceSchema,
  type ReportsChoice,
  ReportsChoiceSchema,
} from "./life.ts";

export const SecrecyValues = ["Public", "Hidden", "Deep"] as const;
export type Secrecy = (typeof SecrecyValues)[number];

export interface Traits {
  loyalty: number;
  greed: number;
  competence: number;
  ambition: number;
  courage: number;
  sympathy: Power | null;
  sympathyStrength: number;
}

export function newTraits(init: Partial<Traits> = {}): Traits {
  return {
    loyalty: 0,
    greed: 0,
    competence: 0,
    ambition: 0,
    courage: 0,
    sympathy: null,
    sympathyStrength: 0,
    ...init,
  };
}

export const TraitsSchema: ObjSchema<Traits> = obj("Traits", newTraits, {
  loyalty: I,
  greed: I,
  competence: I,
  ambition: I,
  courage: I,
  sympathy: opt(S),
  sympathyStrength: I,
});

/**
 * What the engine rolls on (item 10, "What skills cover"): gathering information, avoiding detection and capture, and making
 * forgeries. Kings never see them ("Kings never see skills"), and the character sees them only through its belief.
 */
export interface Skills {
  gather: number;
  stealth: number;
  forge: number;
}

export const SkillValues = ["gather", "stealth", "forge"] as const;
export type Skill = (typeof SkillValues)[number];

export function newSkills(init: Partial<Skills> = {}): Skills {
  return { gather: 0, stealth: 0, forge: 0, ...init };
}

export const SkillsSchema: ObjSchema<Skills> = obj("Skills", newSkills, {
  gather: I,
  stealth: I,
  forge: I,
});

/**
 * A tie from the life before the game (item 10, "A past before the game"): a debt owed to a court's people, which presses
 * on the purse and gives that court leverage; or a lover or family at a court, which draws the character there and gives
 * that court a hold over it.
 */
export const TieKindValues = ["Debt", "Lover", "Family"] as const;
export type TieKind = (typeof TieKindValues)[number];

export interface Tie {
  kind: TieKind;
  court: Power;
  /** For a debt: the shekels still owed. */
  amount: number;
}

export function newTie(init: Partial<Tie> = {}): Tie {
  return { kind: "Debt", court: "Egypt", amount: 0, ...init };
}

export const TieSchema: ObjSchema<Tie> = obj("Tie", newTie, {
  kind: S,
  court: S,
  amount: I,
});

/**
 * The name a character gave a court when it first met it (item 10, "Declaring a name"): its own, another character's
 * (`as`), or an invented one; and for a false envoy (item 10, "Swapped tablets and false envoys"), the king it claims to
 * serve. The court's records attach to the name given. `exposed`: the season the court saw through it.
 */
export interface Declared {
  court: Power;
  name: string;
  as: string | null;
  employer: Power | null;
  turn: number;
  exposed: number | null;
  /** The name's standing at that court when it was given: the borrowed person's, or nothing for an invented one. */
  rep: number;
}

export function newDeclared(init: Partial<Declared> = {}): Declared {
  return {
    court: "Egypt",
    name: "",
    as: null,
    employer: null,
    turn: 0,
    exposed: null,
    rep: 0,
    ...init,
  };
}

export const DeclaredSchema: ObjSchema<Declared> = obj(
  "Declared",
  newDeclared,
  {
    court: S,
    name: S,
    as: opt(S),
    employer: opt(S),
    turn: I,
    exposed: opt(I),
    rep: I,
  },
);

export interface Fact {
  id: string;
  text: string;
  secrecy: Secrecy;
  tag: string;
  knownBy: Power[];
  /** Item 10: the false name it went by at the court that saw this, which that court's record attaches it to; null: its own. */
  alias: string | null;
}

export function newFact(init: Partial<Fact> = {}): Fact {
  return {
    id: "",
    text: "",
    secrecy: "Public",
    tag: "",
    knownBy: [],
    alias: null,
    ...init,
  };
}

export const FactSchema: ObjSchema<Fact> = obj("Fact", newFact, {
  id: S,
  text: S,
  secrecy: S,
  tag: S,
  knownBy: list(S),
  alias: opt(S),
});

export interface MemoryEntry {
  turn: number;
  text: string;
}

export function newMemoryEntry(init: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    turn: 0,
    text: "",
    ...init,
  };
}

export const MemoryEntrySchema: ObjSchema<MemoryEntry> = obj(
  "MemoryEntry",
  newMemoryEntry,
  {
    turn: I,
    text: S,
  },
);

/**
 * What a job's errand is (Haakon's answers to item 11a): carrying a mission to a court, or watching a court or a province;
 * and (Haakon's answers to item 11b+) staying at the employer's court until the term's end, an errand like any other.
 */
export const JobWhatValues = ["envoy", "spy", "stay"] as const;
export type JobWhat = (typeof JobWhatValues)[number];

/**
 * A job's errand ("A job is always an errand", Haakon's answers to items 11a and 11a+): what to do and where; the term is
 * by when. `where` is the court an envoy goes to, the court or province a spy watches, or the employer's own court for a
 * stay. `done`: the envoy has had its audience there, or the spy has come home from its post; a stay is done at its term.
 */
export interface JobErrand {
  what: JobWhat;
  where: string;
  done: boolean;
}

export function newJobErrand(init: Partial<JobErrand> = {}): JobErrand {
  return { what: "envoy", where: "", done: false, ...init };
}

export const JobErrandSchema: ObjSchema<JobErrand> = obj(
  "JobErrand",
  newJobErrand,
  { what: S, where: S, done: B },
);

/**
 * A stay at court waiting beside an errand given during it (Haakon's answers to item 11b+: each errand given during a stay
 * is its own job with its own fee): until when the stay runs, the rest of its fee still to come, and whether the employer
 * ordered it paid when the stay is done. When the errand's job is done, the stay goes on if its term has not run out.
 */
export interface StayLeft {
  until: number;
  rest: number;
  payOnDone: boolean;
}

export function newStayLeft(init: Partial<StayLeft> = {}): StayLeft {
  return { until: 0, rest: 0, payOnDone: false, ...init };
}

export const StayLeftSchema: ObjSchema<StayLeft> = obj(
  "StayLeft",
  newStayLeft,
  { until: I, rest: I, payOnDone: B },
);

/**
 * A job (item 11a, "Jobs, not wages", reworked by Haakon's answers to items 11a and 11a+): one errand, with what to do,
 * where and by when, and a fee: the advance handed over when the job was agreed, the rest due when it is done (the errand
 * done, or its term served, and the servant back at court with no task). The rest is paid only by its employer's order:
 * by hand (order pay_fee) or by his own standing order given with the job (`payOnDone`). When the job is done it ends;
 * another errand is a new offer, which the employer may make in advance (`offerAgain`) and the man must still accept.
 */
export interface Contract {
  /** The whole fee agreed for the job. */
  fee: number;
  /** The part of the fee handed over when the job was agreed. */
  advance: number;
  startTurn: number;
  /** The last season of the term: the errand is to be done by then. */
  untilTurn: number;
  /** The rest of earlier jobs carried into this one (a stay renewed at a post abroad, or a new job before the old was done). */
  carried: number;
  /** The job's errand; null for a starting servant's or one taken over at an audience, whose first errand names it. */
  errand: JobErrand | null;
  /** The employer's standing order with the job: pay the rest when the job is done. */
  payOnDone: boolean;
  /** The employer's standing offer with the job: when it is done, the same job again, which the man may take or not. */
  offerAgain: boolean;
  /** Its master ordered the rest withheld when it falls due (order pay_fee with pay false). */
  withheld: boolean;
  /** It was taken captive during the term: a captured man has not done his job, so the rest never falls due. */
  captured: boolean;
  /**
   * The season its employer learns that the man took the job: at once at court, and for an offer taken abroad when word of
   * it comes home by the roads (Haakon's answers to item 11a). Until then the court does not count him its own.
   */
  knownFrom: number;
  /** The stay this job was given during, which goes on when it is done (see {@link StayLeft}); null if none. */
  stay: StayLeft | null;
}

/** Whether a court knows that a man in its employ took his job (see {@link Contract.knownFrom}). */
export const jobKnown = (
  c: { contract: Contract | null },
  turn: number,
): boolean => (c.contract?.knownFrom ?? 0) <= turn;

export function newContract(init: Partial<Contract> = {}): Contract {
  return {
    fee: 0,
    advance: 0,
    startTurn: 0,
    untilTurn: 0,
    carried: 0,
    errand: null,
    payOnDone: false,
    offerAgain: false,
    withheld: false,
    captured: false,
    knownFrom: 0,
    stay: null,
    ...init,
  };
}

export const ContractSchema: ObjSchema<Contract> = obj(
  "Contract",
  newContract,
  {
    fee: I,
    advance: I,
    startTurn: I,
    untilTurn: I,
    carried: I,
    errand: () => JobErrandSchema,
    payOnDone: B,
    offerAgain: B,
    withheld: B,
    captured: B,
    knownFrom: I,
    stay: () => StayLeftSchema,
  },
);

export const CharacterStatusValues = [
  "Free",
  "Employed",
  "Captured",
  "Dead",
] as const;
export type CharacterStatus = (typeof CharacterStatusValues)[number];

export const DutyValues = [
  "None",
  "EnvoyOutbound",
  "EnvoyAtCourt",
  "EnvoyHomebound",
  "Detained",
  "SpyOutbound",
  "SpyPosted",
  "UnderGuard",
  "Travelling",
  "Leading",
  "Commanding",
  "Governing",
  "Ruling",
] as const;
export type Duty = (typeof DutyValues)[number];

/**
 * Item 11b, "Characters as sellers of news": what a character saw of a court while it stood there, as of a season, and the
 * price it asks for it at another court. `honest` false: a greedy seller made the treasury out to be larger than he saw.
 */
export interface NewsHeld {
  court: Power;
  turn: number;
  lines: string[];
  price: number;
  honest: boolean;
}

export function newNewsHeld(init: Partial<NewsHeld> = {}): NewsHeld {
  return {
    court: "Egypt",
    turn: 0,
    lines: [],
    price: 0,
    honest: true,
    ...init,
  };
}

export const NewsHeldSchema: ObjSchema<NewsHeld> = obj(
  "NewsHeld",
  newNewsHeld,
  { court: S, turn: I, lines: list(S), price: I, honest: B },
);

export interface Character {
  id: string;
  name: string;
  origin: string;
  calling: string;
  traits: Traits;
  facts: Fact[];
  /** Written once by the narrator at creation, then frozen. */
  persona: string;
  memory: MemoryEntry[];
  memorySummary: string;
  status: CharacterStatus;
  employer: Power | null;
  contract: Contract | null;
  duty: Duty;
  /** The court the character is physically at, or null while travelling. */
  at: Power | null;
  /** A province the character watches as a spy, when not at a court. */
  watchProvince: string | null;
  /**
   * Item 17++: posted to watch `watchProvince` openly, as a resident known to all as his master's man (Pharaoh's
   * commissioners over vassals' lands): nobody hunts for him, and he reports home as any watcher does.
   */
  openly: boolean;
  /** Item 17 ("outside help"): gold a spy carries for its master to spend among the people of the province it watches. */
  stirGold: number;
  missionTarget: Power | null;
  currentTrail: string | null;
  heldBy: Power | null;
  /**
   * A captive caught leaving, or coming home to, its king's besieged capital (Build order item 5): its captor may execute,
   * ransom or release it, not turn it (it was no spy at a post). Cleared when it is set free.
   */
  intercepted: boolean;
  /** A double agent's real master. */
  secretMaster: Power | null;
  poisonText: string | null;
  turnsAbroad: number;
  /** Item 17+: the times it has set out on a journey of its own (an errand, a post, a road), for the report's count of who acts. */
  sent: number;
  /** The gold on its person. Characters start with none; what it holds came in by {@link Gain}. */
  purse: number;
  /** Where the gold in its purse came from. Nothing is spent yet, so the parts add up to the purse. */
  earned: Earnings;
  unpaidTurns: number;
  reputation: Dict<Power, number>;
  askingPrice: Dict<Power, number>;
  /** Courts this character has pitched to, with the pitch text. */
  pitches: Dict<Power, string>;
  /**
   * What courts it serves or served still believe of it, after something happened abroad that they cannot see:
   * at most one per court (an envoy that went over to a host may be covered for its old master and its new one).
   */
  covers: Cover[];
  /** The court it last served, once that service ended by dismissal or by the court's fall. */
  formerEmployer: Power | null;
  /**
   * Item 11a: the rest of a fee each court let fall due and did not pay: a fact, a broken promise the court may still
   * make good (order pay_fee), counted in no score ("Debts are facts; repayment is a choice"); lost when the court's
   * kingdom falls.
   */
  owed: Dict<Power, number>;
  /**
   * The season each fee in {@link owed} fell due (Haakon's answers to item 11a: unpaid is unpaid): unpaid by the end of
   * the next season, it counts once as a broken promise, and the season is set to -1.
   */
  owedDue: Dict<Power, number>;
  /** Gold it carries for its master, an advance a man it was sent to hire did not take: handed over when it is home. */
  carriedFor: number;
  /** The promises to pay it has heard kept or broken (ids of {@link PayFact}), newest last: a court's record is news. */
  heardPay: string[];
  /** Older talk of promises kept or broken, by party, that it keeps all its life (Haakon's answers to item 11b+). */
  payOld: PayOld[];
  /** What it has heard a job pays a season, from the jobs agreed where it stood and from those it met; null if nothing. */
  heardRate: number | null;
  /** Item 10: the true skills the engine rolls on. */
  skills: Skills;
  /**
   * Item 10, "Seeing oneself": a hidden inclination to over- (above 0) or underestimate oneself, in skill points; and what
   * the character believes its skills are, which moves with what happens to it.
   */
  inclination: number;
  belief: Skills;
  /** What it last said it can do, when it pitched (item 10, "Kings never see skills"); null if it never has. */
  claimed: Skills | null;
  /** Ties from the life before the game. */
  ties: Tie[];
  /** Item 10, "What servants know": the tablets that passed through its hands (sealed before it, carried, read, copied). */
  seen: string[];
  /** The courts that have seen it under its own name. */
  met: Power[];
  /** The names it declared at courts other than its own. */
  declared: Declared[];
  /** A real person of the period (item 10, "Attested characters"); else generated in its region's style. */
  attested: boolean;
  /** Item 11a, "Where characters keep their gold": its hoard in one city, if it keeps one. */
  hoard: Hoard | null;
  /** Item 11a, "Lending to kings": what it offers to lend the king of the court where it stands, if anything. */
  lendOffer: LendOffer | null;
  /** Item 11a: the fees a season each court really offered it this season, which it may cite elsewhere ("Hiring as a negotiation"). */
  offers: Dict<Power, number>;
  /** Item 11a, "How the strategy is made": its way to a fortune, chosen from its traits, and whether it takes the bold road. */
  strategy: Strategy;
  bold: boolean;
  /** Item 11a: an errand for another character (collecting a debt), if it is on one. */
  errand: Errand | null;
  /** Item 11a: the season it came through a door onto the map, or rose from the crowd; null for one there from the start. */
  arrived: number | null;
  /** Item 11a: seasons it has waited unhired at the court where it stands, seeking work. */
  waited: number;
  /** Item 11a, "Working for oneself": a free person seeking service; false while it works for itself. */
  seeking: boolean;
  /** Item 11a, "The richest characters": what it held, purse and hoard, when it died; null while it lives. */
  diedWith: number | null;
  /** Item 11a: the last season it decided a season of its own; null since it arrived somewhere new (or never). */
  lastLife: number | null;
  /**
   * Haakon's answers to item 11b: a model chief's last choices for his band, and a model spy's for its waiting reports,
   * each taken the season after it was made; null while the script's traits decide (a script mind never sets them).
   */
  chiefPlan: ChiefChoice | null;
  reportsPlan: ReportsChoice | null;
  /** Item 11a: a newcomer's mark in the data ("invented name", "first recorded later"), never told in the game; null if none. */
  marked: string | null;
  /** Item 11b: the news it carries of the courts it stood at, newest last, at most one a court ("Characters as sellers of news"). */
  news: NewsHeld[];
  /** Item 11b: the losses abroad it has heard of (`kind|court|master|character`), news that travels with people. */
  heard: string[];
  /** Item 11b: the last season it gave up the road ("The way back"), or null if it never led a band. */
  leftRoad: number | null;
  /** Item 13: the battles it won and lost commanding an army, a record its master and anyone who hears of them can weigh. */
  won: number;
  lost: number;
  /** Item 13: the king whose command of an army or governorship of a province it holds (duty Commanding or Governing). */
  grantedBy: Power | null;
  /** Item 12, "Languages": its true skill in each language it has any of, 0 to 100, hidden like every skill. */
  tongues: Dict<string, number>;
  /** Item 12, "Learning by living there": its hidden aptitude for languages, 0 to 100. */
  aptitude: number;
  /**
   * Item 12, "Speaking": the people in the same place it has come to understand (their ids), and `@` and a court's name
   * for the court where it stands (its king, or a servant there who bridges); kept while they stay together.
   */
  understood: string[];
  /** Item 12, "A go-between for hire": what it asks to bridge one message where it stands, or null if it posts no price. */
  bridgePrice: number | null;
  /** Item 12: gold handed to it, by whom (a court or a person) and when: a motive with a name on it ("A go-between for hire"). */
  handed: Handed[];
  /** Item 12: an envoy nobody understands at the court where it stands: a model's last choice, taken the next season. */
  unheardPlan: UnheardChoice | null;
}

/** Gold handed to a character (item 12): by a court or a person, in a season. */
export interface Handed {
  by: string;
  turn: number;
}

export function newHanded(init: Partial<Handed> = {}): Handed {
  return { by: "", turn: 0, ...init };
}

export const HandedSchema: ObjSchema<Handed> = obj("Handed", newHanded, {
  by: S,
  turn: I,
});

/** What an envoy nobody understands chooses (item 12): stay until he is understood, go home, or say his message was delivered. */
export const UnheardValues = ["stay", "home", "lie"] as const;
export type Unheard = (typeof UnheardValues)[number];

export interface UnheardChoice {
  turn: number;
  choice: Unheard;
  /** Of the gifts he has not yet presented, what he keeps for himself when he presents them (null: his traits decide). */
  keep: number | null;
}

export function newUnheardChoice(
  init: Partial<UnheardChoice> = {},
): UnheardChoice {
  return { turn: 0, choice: "stay", keep: null, ...init };
}

export const UnheardChoiceSchema: ObjSchema<UnheardChoice> = obj(
  "UnheardChoice",
  newUnheardChoice,
  { turn: I, choice: S, keep: opt(I) },
);

/**
 * What a go-between or a bridging servant in someone else's pay is asked (item 12, task "Bridge"): the envoy's words and
 * clauses as spoken, which he passes on to the host as he chooses, and who pays him otherwise (his motive, by name).
 */
export interface BridgeView {
  turn: number;
  envoy: string;
  from: Power;
  host: Power;
  /** Who pays him otherwise: courts, or people by name. */
  paidBy: string[];
  speech: string;
  clauses: Clause[];
}

export function newBridgeView(init: Partial<BridgeView> = {}): BridgeView {
  return {
    turn: 0,
    envoy: "",
    from: "Egypt",
    host: "Egypt",
    paidBy: [],
    speech: "",
    clauses: [],
    ...init,
  };
}

export const BridgeViewSchema: ObjSchema<BridgeView> = obj(
  "BridgeView",
  newBridgeView,
  {
    turn: I,
    envoy: S,
    from: S,
    host: S,
    paidBy: list(S),
    speech: S,
    clauses: list(() => ClauseSchema),
  },
);

/** What an envoy nobody understands is asked (item 12, task "Unheard"): where he stands, how long, and who might carry his words. */
export interface UnheardView {
  turn: number;
  /** The court where nobody understands him, and his own king. */
  host: Power;
  lord: Power;
  /** Seasons he has waited there unheard. */
  waited: number;
  /** The gifts he presented, in shekels (0 if none), and the gold he carries and has not presented yet. */
  presented: number;
  carried: number;
  /** His purse, and the go-betweens standing there with their price for a message (none of whom could carry his words yet). */
  purse: number;
  goBetweens: { name: string; price: number }[];
  /** His own languages, in words, and the language of the court. */
  tongues: string[];
  courtTongue: string;
}

export function newUnheardView(init: Partial<UnheardView> = {}): UnheardView {
  return {
    turn: 0,
    host: "Egypt",
    lord: "Egypt",
    waited: 0,
    presented: 0,
    carried: 0,
    purse: 0,
    goBetweens: [],
    tongues: [],
    courtTongue: "",
    ...init,
  };
}

export const UnheardViewSchema: ObjSchema<UnheardView> = obj(
  "UnheardView",
  newUnheardView,
  {
    turn: I,
    host: S,
    lord: S,
    waited: I,
    presented: I,
    carried: I,
    purse: I,
    goBetweens: list(() =>
      obj("GoBetweenSeen", () => ({ name: "", price: 0 }), {
        name: S,
        price: I,
      }),
    ),
    tongues: list(S),
    courtTongue: S,
  },
);

export function newCharacter(init: Partial<Character> = {}): Character {
  return {
    id: "",
    name: "",
    origin: "",
    calling: "",
    traits: newTraits(),
    facts: [],
    persona: "",
    memory: [],
    memorySummary: "",
    status: "Free",
    employer: null,
    contract: null,
    duty: "None",
    at: null,
    watchProvince: null,
    openly: false,
    stirGold: 0,
    missionTarget: null,
    currentTrail: null,
    heldBy: null,
    intercepted: false,
    secretMaster: null,
    poisonText: null,
    turnsAbroad: 0,
    sent: 0,
    purse: 0,
    earned: newEarnings(),
    unpaidTurns: 0,
    reputation: new Dict(),
    askingPrice: new Dict(),
    pitches: new Dict(),
    covers: [],
    formerEmployer: null,
    owed: new Dict(),
    owedDue: new Dict(),
    carriedFor: 0,
    heardPay: [],
    payOld: [],
    heardRate: null,
    skills: newSkills(),
    inclination: 0,
    belief: newSkills(),
    claimed: null,
    ties: [],
    seen: [],
    met: [],
    declared: [],
    attested: false,
    hoard: null,
    lendOffer: null,
    offers: new Dict(),
    strategy: "Steady",
    bold: false,
    errand: null,
    arrived: null,
    waited: 0,
    seeking: true,
    diedWith: null,
    lastLife: null,
    chiefPlan: null,
    reportsPlan: null,
    marked: null,
    news: [],
    heard: [],
    leftRoad: null,
    won: 0,
    lost: 0,
    grantedBy: null,
    tongues: new Dict(),
    aptitude: 0,
    understood: [],
    bridgePrice: null,
    handed: [],
    unheardPlan: null,
    ...init,
  };
}

export const CharacterSchema: ObjSchema<Character> = obj(
  "Character",
  newCharacter,
  {
    id: S,
    name: S,
    origin: S,
    calling: S,
    traits: () => TraitsSchema,
    facts: list(() => FactSchema),
    persona: S,
    memory: list(() => MemoryEntrySchema),
    memorySummary: S,
    status: S,
    employer: opt(S),
    contract: () => ContractSchema,
    duty: S,
    at: opt(S),
    watchProvince: S,
    openly: B,
    stirGold: I,
    missionTarget: opt(S),
    currentTrail: S,
    heldBy: opt(S),
    intercepted: B,
    secretMaster: opt(S),
    poisonText: S,
    turnsAbroad: I,
    sent: I,
    purse: I,
    earned: () => EarningsSchema,
    unpaidTurns: I,
    reputation: dict(I),
    askingPrice: dict(I),
    pitches: dict(S),
    covers: list(() => CoverSchema),
    formerEmployer: opt(S),
    owed: dict(I),
    owedDue: dict(I),
    carriedFor: I,
    heardPay: list(S),
    payOld: list(() => PayOldSchema),
    heardRate: opt(I),
    skills: () => SkillsSchema,
    inclination: I,
    belief: () => SkillsSchema,
    claimed: () => SkillsSchema,
    ties: list(() => TieSchema),
    seen: list(S),
    met: list(S),
    declared: list(() => DeclaredSchema),
    attested: B,
    hoard: () => HoardSchema,
    lendOffer: () => LendOfferSchema,
    offers: dict(I),
    strategy: S,
    bold: B,
    errand: () => ErrandSchema,
    arrived: opt(I),
    waited: I,
    seeking: B,
    diedWith: opt(I),
    lastLife: opt(I),
    chiefPlan: () => ChiefChoiceSchema,
    reportsPlan: () => ReportsChoiceSchema,
    marked: opt(S),
    news: list(() => NewsHeldSchema),
    heard: list(S),
    leftRoad: opt(I),
    won: I,
    lost: I,
    grantedBy: opt(S),
    tongues: dict(I),
    aptitude: I,
    understood: list(S),
    bridgePrice: opt(I),
    handed: list(() => HandedSchema),
    unheardPlan: () => UnheardChoiceSchema,
    isAvailableForHire: computed(B, (o: Character) => o.status === "Free"),
  },
);

/** Where gold in a character's purse came from. */
export const GoldSourceValues = [
  "Fees",
  "Skimmed",
  "Gifts",
  "Carried",
  "Loans",
  "Loot",
  "News",
] as const;
export type GoldSource =
  /** Fees for its jobs: the advance when a job was agreed, the rest when it was done (item 11a). */
  | "Fees"
  /** Loans repaid to it, and gold borrowed or bought from others (item 11a): what it came by in dealing. */
  | "Loans"
  /** Kept from gold it carried, out to a court or home. */
  | "Skimmed"
  /** A king's personal gift at an audience. */
  | "Gifts"
  /** Gold it was carrying when it was dismissed on the way out, which became its own. */
  | "Carried"
  /** Item 11b: a chief's share of what his band took, on the land, the roads and the sea. */
  | "Loot"
  /** Item 11b: news it sold at a court ("Characters as sellers of news"), and letters it was paid to carry; item 12: messages it bridged. */
  | "News";

/**
 * What a character has gained, by source, and (item 11a) what it has spent.
 */
export interface Earnings {
  fees: number;
  /** Item 11a: what came in by lending and dealing (repayments, loans taken, sales); what went out is in {@link Spent}. */
  dealt: number;
  /** Item 11a: what it spent: its living, its hoard's keep, loans it made, what it bought, what was taken from it. */
  spent: number;
  /** Item 11a: what it brought into the game, or onto the map: savings from the life before. */
  savings: number;
  skimmed: number;
  gifts: number;
  carried: number;
  /** Item 11b: its share of its band's take, and what it was paid for news and for carrying letters. */
  loot: number;
  news: number;
}

export function newEarnings(init: Partial<Earnings> = {}): Earnings {
  return {
    fees: 0,
    dealt: 0,
    spent: 0,
    savings: 0,
    skimmed: 0,
    gifts: 0,
    carried: 0,
    loot: 0,
    news: 0,
    ...init,
  };
}

export const EarningsSchema: ObjSchema<Earnings> = obj(
  "Earnings",
  newEarnings,
  {
    fees: I,
    dealt: I,
    spent: I,
    savings: I,
    skimmed: I,
    gifts: I,
    carried: I,
    loot: I,
    news: I,
  },
);

/**
 * A servant abroad whose master cannot see what happened to it (caught as a spy, detained, gone over to
 * the host, put to death, let go) keeps appearing to that master as it was, until word of it comes: a
 * rumour, a report from it, the servant standing at the master's court, or the master dismissing it.
 */
export interface Cover {
  /** The master who still believes it. */
  for: Power;
  since: number;
  /**
   * The duty the master believes the servant is on (a posted spy, an envoy on the road home, one who has not returned).
   */
  believed: Duty;
  /**
   * Set when the master believes the servant is held captive at that court: its view then reads as a captive's.
   */
  heldAt: Power | null;
  /**
   * The master recalled a spy it believed at its post: it believes it on the road home, and so it comes home if it is turned.
   */
  recalled: boolean;
  dutyText: string;
  whereText: string;
  /**
   * When the master believes the servant set out and is due back, as its view read then (see {@link Views.TimingText}).
   */
  timingText: string;
  /** The job's fee and advance as the master agreed them, and the season it began (item 11a). */
  fee: number;
  advance: number;
  startTurn: number;
  contractUntil: number | null;
  /** The job's errand and standing orders as the master agreed them (Haakon's answers to item 11a). */
  errand: JobErrand | null;
  payOnDone: boolean;
  offerAgain: boolean;
  /**
   * The facts the master knew of the servant then, and public ones its inquiries have found since. A public fact
   * added meanwhile, such as a defection, stays unseen until an inquiry finds it; hidden facts the master learns
   * show as for any servant.
   */
  factIds: string[];
}

export function newCover(init: Partial<Cover> = {}): Cover {
  return {
    for: "Egypt",
    since: 0,
    believed: "None",
    heldAt: null,
    recalled: false,
    dutyText: "",
    whereText: "",
    timingText: "",
    fee: 0,
    advance: 0,
    startTurn: 0,
    contractUntil: null,
    errand: null,
    payOnDone: false,
    offerAgain: false,
    factIds: [],
    ...init,
  };
}

export const CoverSchema: ObjSchema<Cover> = obj("Cover", newCover, {
  for: S,
  since: I,
  believed: S,
  heldAt: opt(S),
  recalled: B,
  dutyText: S,
  whereText: S,
  timingText: S,
  fee: I,
  advance: I,
  startTurn: I,
  contractUntil: opt(I),
  errand: () => JobErrandSchema,
  payOnDone: B,
  offerAgain: B,
  factIds: list(S),
});

// ---------------------------------------------------------------- Character's methods

export function remember(c: Character, turn: number, text: string): void {
  c.memory.push(newMemoryEntry({ turn, text }));
}

/** Gold out of its purse (item 11a): its living, its hoard's keep, a loan made, a purchase. Never more than it holds. */
export function spend(c: Character, amount: number): number {
  const paid = Math.max(0, Math.min(amount, c.purse));
  c.purse -= paid;
  c.earned.spent += paid;
  return paid;
}

/** Gold into its purse, counted by where it came from. */
export function gain(c: Character, amount: number, source: GoldSource): void {
  if (amount <= 0) return;
  c.purse += amount;
  switch (source) {
    case "Fees":
      c.earned.fees += amount;
      break;
    case "Loans":
      c.earned.dealt += amount;
      break;
    case "Skimmed":
      c.earned.skimmed += amount;
      break;
    case "Gifts":
      c.earned.gifts += amount;
      break;
    case "Carried":
      c.earned.carried += amount;
      break;
    case "Loot":
      c.earned.loot += amount;
      break;
    case "News":
      c.earned.news += amount;
      break;
  }
}

/**
 * Item 11b, reputation from losses abroad: of the losses it heard of, how many of `court`'s own people were caught or put
 * to death abroad, and how many people `court` put to death.
 */
export function lossesHeardOf(
  c: Character,
  court: Power,
): { lost: number; killed: number; seized: number } {
  let lost = 0;
  let killed = 0;
  let seized = 0;
  for (const k of c.heard) {
    const [kind, at, master] = k.split("|");
    if (master === court) lost++;
    if (kind === "PutToDeath" && at === court) killed++;
    // Haakon's answers to item 11a: a king who seized a living man's hoard, talked of like the losses.
    if (kind === "Seized" && at === court) seized++;
  }
  return { lost, killed, seized };
}

/** The false name a character still goes by at a court (item 10, "Declaring a name"), or null if it goes by its own there. */
export function falseNameAt(c: Character, court: Power): Declared | null {
  return (
    c.declared.find((d) => d.court === court && d.exposed === null) ?? null
  );
}

/** The name a court knows a character by. */
export function nameKnownAt(c: Character, court: Power): string {
  return falseNameAt(c, court)?.name ?? c.name;
}

/** The standing of the name a court knows a character by ("A name made of outcomes"). */
export function reputationAt(c: Character, court: Power): number {
  const d = falseNameAt(c, court);
  return d !== null ? d.rep : c.reputation.getOrDefault(court, 0);
}

/**
 * What a court knows of a character: its public facts and those it learned. Item 10: a court's records attach to the name it
 * was given, so a court that knows it by a false name sees only what it learned under that name, and one that knows its
 * true name does not see what was learned of it under a name it never heard (until that name is exposed there).
 */
export function factsKnownTo(c: Character, p: Power): Fact[] {
  const d = falseNameAt(c, p);
  return c.facts.filter(
    (f) =>
      (f.secrecy === "Public" || f.knownBy.includes(p)) &&
      (d !== null
        ? f.alias === d.name
        : f.alias === null ||
          c.declared.some(
            (x) => x.court === p && x.name === f.alias && x.exposed !== null,
          )),
  );
}

/** What `p` still believes of this character, if it has not heard what happened to it. */
export function coverOf(c: Character, p: Power): Cover | null {
  return c.covers.find((k) => k.for === p) ?? null;
}

/**
 * A foreign spy posted at `court` that the court does not know is there. A spy watches a court in secret: the court does
 * not see it standing there, nor whom it serves, until its watchmen catch it (it is then the court's captive). A spy
 * secretly in that court's own pay (one it turned, or a plant) reports to it, so the court knows it is there.
 */
export function hiddenAt(c: Character, court: Power): boolean {
  return (
    c.at === court &&
    c.status === "Employed" &&
    c.duty === "SpyPosted" &&
    c.employer !== court &&
    c.secretMaster !== court
  );
}

/** All it has gained (not net of what it spent). */
export function earningsTotal(e: Earnings): number {
  return (
    e.fees +
    e.dealt +
    e.skimmed +
    e.gifts +
    e.carried +
    e.savings +
    e.loot +
    e.news
  );
}

export function addEarnings(e: Earnings, other: Earnings): void {
  e.fees += other.fees;
  e.dealt += other.dealt;
  e.spent += other.spent;
  e.savings += other.savings;
  e.skimmed += other.skimmed;
  e.gifts += other.gifts;
  e.carried += other.carried;
  e.loot += other.loot;
  e.news += other.news;
}
