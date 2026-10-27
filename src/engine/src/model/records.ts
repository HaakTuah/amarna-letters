import { Dict } from "../core/collections.ts";
import { B, D, I, type ObjSchema, S, computed, dict, list, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";

export const JourneyKindValues = ["EnvoyOutbound", "EnvoyHomebound", "SpyOutbound", "SpyReport", "SpyHomebound", "Rumor", "Ransom", "Word"] as const;
export type JourneyKind = (typeof JourneyKindValues)[number];

/**
 * What a rumour about one of a court's own people tells it: news that ends a {@link Cover}. For word ("Word"), what it
 * tells a court of the world: a king closed or opened his roads to it, or a kingdom fell.
 */
export const NewsKindValues = ["Overdue", "Ransom", "Death", "RoadsClosed", "RoadsOpened", "KingdomFalls"] as const;
export type NewsKind = (typeof NewsKindValues)[number];

export interface Journey {
  id: string;
  kind: JourneyKind;
  departTurn: number;
  arriveTurn: number;
  from: Power;
  to: Power;
  characterId: string | null;
  dispatch: Dispatch | null;
  cargo: HomeCargo | null;
  report: SpyReport | null;
  text: string | null;
  gold: number;
  /** For a rumour about one of the receiving court's own people ({@link CharacterId}): what it tells. */
  news: NewsKind | null;
  /** For a ransom demand's rumour: the demand it announces, unless a newer one has replaced it. */
  taskId: string | null;
  /**
   * A traveller's road (item 7b): the provinces from where it set out to where it goes. Empty for word, which the engine
   * carries until item 11b and which arrives in the season set ({@link arriveTurn}); a traveller arrives when it reaches
   * the route's end, and {@link arriveTurn} is only when it is due.
   */
  route: string[];
  /** The route's province it last reached (an index), and the points it has made on the connection beyond it. */
  leg: number;
  along: number;
  /** The kings whose land it goes through off the road, unseen if it can be: those it believes closed to its master. */
  sneak: string[];
  /** The provinces it has reached on its way, and the turn it reached each: the news it brings of them is of then. */
  seen: string[];
  reached: number[];
  /** What befell it on the road (turned back, robbed), for its court when it comes home; null if nothing. */
  turnedBack: string | null;
  /** It gave up its errand on the road and comes home without having reached where it was sent. */
  gaveUp: boolean;
}

export function newJourney(init: Partial<Journey> = {}): Journey {
  return {
    id: "",
    kind: "EnvoyOutbound",
    departTurn: 0,
    arriveTurn: 0,
    from: "Egypt",
    to: "Egypt",
    characterId: null,
    dispatch: null,
    cargo: null,
    report: null,
    text: null,
    gold: 0,
    news: null,
    taskId: null,
    route: [],
    leg: 0,
    along: 0,
    sneak: [],
    seen: [],
    reached: [],
    turnedBack: null,
    gaveUp: false,
    ...init,
  };
}

export const JourneySchema: ObjSchema<Journey> = obj("Journey", newJourney, {
  id: S,
  kind: S,
  departTurn: I,
  arriveTurn: I,
  from: S,
  to: S,
  characterId: S,
  dispatch: () => DispatchSchema,
  cargo: () => HomeCargoSchema,
  report: () => SpyReportSchema,
  text: S,
  gold: I,
  news: opt(S),
  taskId: S,
  route: list(S),
  leg: I,
  along: I,
  sneak: list(S),
  seen: list(S),
  reached: list(I),
  turnedBack: opt(S),
  gaveUp: B,
});

/** What a leader hands an envoy: the spoken message, the mandate, and what it carries. */
export interface Dispatch {
  letter: string;
  greeting: GreetingOptions;
  /** Rendered by the engine and sealed on the tablet; the envoy cannot alter it. */
  greetingText: string;
  mandate: string;
  gold: number;
  purityPercent: number;
  proposal: TabletProposal | null;
  proposalTabletId: string | null;
  copyIds: string[];
  trailId: string;
}

export function newDispatch(init: Partial<Dispatch> = {}): Dispatch {
  return {
    letter: "",
    greeting: newGreetingOptions(),
    greetingText: "",
    mandate: "",
    gold: 0,
    purityPercent: 100,
    proposal: null,
    proposalTabletId: null,
    copyIds: [],
    trailId: "",
    ...init,
  };
}

export const DispatchSchema: ObjSchema<Dispatch> = obj("Dispatch", newDispatch, {
  letter: S,
  greeting: () => GreetingOptionsSchema,
  greetingText: S,
  mandate: S,
  gold: I,
  purityPercent: I,
  proposal: () => TabletProposalSchema,
  proposalTabletId: S,
  copyIds: list(S),
  trailId: S,
});

export interface TabletProposal {
  text: string;
  allianceOath: boolean;
}

export function newTabletProposal(init: Partial<TabletProposal> = {}): TabletProposal {
  return {
    text: "",
    allianceOath: false,
    ...init,
  };
}

export const TabletProposalSchema: ObjSchema<TabletProposal> = obj("TabletProposal", newTabletProposal, {
  text: S,
  allianceOath: B,
});

export interface GreetingOptions {
  omit: boolean;
  senderFirst: boolean;
  callBrother: boolean;
  claimGreatKing: boolean;
  grantGreatKing: boolean;
  /** Free text that replaces the rendered greeting entirely, if set. */
  custom: string | null;
}

export function newGreetingOptions(init: Partial<GreetingOptions> = {}): GreetingOptions {
  return {
    omit: false,
    senderFirst: false,
    callBrother: true,
    claimGreatKing: true,
    grantGreatKing: true,
    custom: null,
    ...init,
  };
}

export const GreetingOptionsSchema: ObjSchema<GreetingOptions> = obj("GreetingOptions", newGreetingOptions, {
  omit: B,
  senderFirst: B,
  callBrother: B,
  claimGreatKing: B,
  grantGreatKing: B,
  custom: S,
});

/** What an envoy brings home: the audience as it happened (the engine's record) and gifts. */
export interface HomeCargo {
  trailId: string;
  copyIds: string[];
  gold: number;
  purityPercent: number;
  goldStated: number;
  observations: string[];
  wasDetained: boolean;
}

export function newHomeCargo(init: Partial<HomeCargo> = {}): HomeCargo {
  return {
    trailId: "",
    copyIds: [],
    gold: 0,
    purityPercent: 100,
    goldStated: 0,
    observations: [],
    wasDetained: false,
    ...init,
  };
}

export const HomeCargoSchema: ObjSchema<HomeCargo> = obj("HomeCargo", newHomeCargo, {
  trailId: S,
  copyIds: list(S),
  gold: I,
  purityPercent: I,
  goldStated: I,
  observations: list(S),
  wasDetained: B,
});

export interface SpyReport {
  spyId: string;
  court: Power | null;
  province: string | null;
  observations: string[];
  poison: string | null;
  observedTurn: number;
  /**
   * Tablets the spy copied this season from the archive of the court it watches: the copies come home with the report.
   */
  tabletIds: string[];
  /**
   * How many facts of its own life the spy had when it observed (facts are only ever added), so that the report, written
   * when it arrives but of the season observed, shows the spy only those; null in a report made before this was kept
   * (the fix pass after item 4), which shows them all.
   */
  factCount: number | null;
  /** Whom the spy secretly served when it observed (with {@link FactCount} set), if anyone. */
  secretMaster: Power | null;
  /**
   * Its lord, wage, purse and back pay when it observed, so that a report arriving after it was dismissed or hired
   * elsewhere is still written by the servant it was then (the follow-up's review of the fix pass after item 4); null in
   * a report made before these were kept, which shows them as they are when it arrives.
   */
  lord: Power | null;
  wage: number | null;
  purse: number | null;
  backPay: Dict<Power, number> | null;
}

export function newSpyReport(init: Partial<SpyReport> = {}): SpyReport {
  return {
    spyId: "",
    court: null,
    province: null,
    observations: [],
    poison: null,
    observedTurn: 0,
    tabletIds: [],
    factCount: null,
    secretMaster: null,
    lord: null,
    wage: null,
    purse: null,
    backPay: null,
    ...init,
  };
}

export const SpyReportSchema: ObjSchema<SpyReport> = obj("SpyReport", newSpyReport, {
  spyId: S,
  court: opt(S),
  province: S,
  observations: list(S),
  poison: S,
  observedTurn: I,
  tabletIds: list(S),
  factCount: opt(I),
  secretMaster: opt(S),
  lord: opt(S),
  wage: opt(I),
  purse: opt(I),
  backPay: dict(I),
});

export interface PendingAudience {
  id: string;
  envoyId: string;
  from: Power;
  host: Power;
  dispatch: Dispatch;
  goldWeighed: number;
  /** The host's standing answer that answers this envoy, chosen as the season's court begins (item 6b), or null. */
  answer: string | null;
  /** The most gold that answer may send back with the envoy, within the hidden backstop. */
  answerGold: number;
}

export function newPendingAudience(init: Partial<PendingAudience> = {}): PendingAudience {
  return {
    id: "",
    envoyId: "",
    from: "Egypt",
    host: "Egypt",
    dispatch: newDispatch(),
    goldWeighed: 0,
    answer: null,
    answerGold: 0,
    ...init,
  };
}

export const PendingAudienceSchema: ObjSchema<PendingAudience> = obj("PendingAudience", newPendingAudience, {
  id: S,
  envoyId: S,
  from: S,
  host: S,
  dispatch: () => DispatchSchema,
  goldWeighed: I,
  answer: opt(S),
  answerGold: I,
});

export interface Tablet {
  id: string;
  text: string;
  proposedBy: Power;
  partner: Power | null;
  seals: Power[];
  createdTurn: number;
  sealedTurn: number | null;
  allianceOath: boolean;
  /**
   * The inventory of the gold an envoy carries, sealed by the court that sent the gold: the receiving court keeps it in
   * its archive. A forged one is an envoy's swap, stating only what was left after it kept some.
   */
  inventory: boolean;
  forged: boolean;
  forgerId: string | null;
  forgerEmployer: Power | null;
  forgerSkill: number;
  // computed in C#: !Forged && SealedTurn is not null && Partner is not null && Seals.Count >= 2
}

export function newTablet(init: Partial<Tablet> = {}): Tablet {
  return {
    id: "",
    text: "",
    proposedBy: "Egypt",
    partner: null,
    seals: [],
    createdTurn: 0,
    sealedTurn: null,
    allianceOath: false,
    inventory: false,
    forged: false,
    forgerId: null,
    forgerEmployer: null,
    forgerSkill: 0,
    ...init,
  };
}

export const TabletSchema: ObjSchema<Tablet> = obj("Tablet", newTablet, {
  id: S,
  text: S,
  proposedBy: S,
  partner: opt(S),
  seals: list(S),
  createdTurn: I,
  sealedTurn: opt(I),
  allianceOath: B,
  inventory: B,
  forged: B,
  forgerId: S,
  forgerEmployer: opt(S),
  forgerSkill: I,
  isSealedAgreement: computed(B, (o: Tablet) => isSealedAgreement(o)),
});

/**
 * A tablet as one court holds it. Every copy a court holds lies in its archive at its capital: a spy posted at that court
 * may copy from it, and whoever takes the capital gains a copy of every tablet in it (see {@link TurnEngine}'s archives).
 */
export interface TabletCopy {
  id: string;
  tabletId: string;
  holder: Power;
  acquiredTurn: number;
  source: string;
  authResult: string | null;
}

export function newTabletCopy(init: Partial<TabletCopy> = {}): TabletCopy {
  return {
    id: "",
    tabletId: "",
    holder: "Egypt",
    acquiredTurn: 0,
    source: "",
    authResult: null,
    ...init,
  };
}

export const TabletCopySchema: ObjSchema<TabletCopy> = obj("TabletCopy", newTabletCopy, {
  id: S,
  tabletId: S,
  holder: S,
  acquiredTurn: I,
  source: S,
  authResult: S,
});

export const CatastropheKindValues = ["Drought", "Plague", "Flood", "Earthquake"] as const;
export type CatastropheKind = (typeof CatastropheKindValues)[number];

export interface Catastrophe {
  id: string;
  power: Power;
  kind: CatastropheKind;
  province: string | null;
  startTurn: number;
  endTurn: number;
  /** Income multiplier while active (whole realm, or one province if Province is set). */
  incomeFactor: number;
  text: string;
}

export function newCatastrophe(init: Partial<Catastrophe> = {}): Catastrophe {
  return {
    id: "",
    power: "Egypt",
    kind: "Drought",
    province: null,
    startTurn: 0,
    endTurn: 0,
    incomeFactor: 1,
    text: "",
    ...init,
  };
}

export const CatastropheSchema: ObjSchema<Catastrophe> = obj("Catastrophe", newCatastrophe, {
  id: S,
  power: S,
  kind: S,
  province: S,
  startTurn: I,
  endTurn: I,
  incomeFactor: D,
  text: S,
});

export const LossKindValues = ["Captured", "PutToDeath"] as const;
export type LossKind = (typeof LossKindValues)[number];

/**
 * A servant of another court caught or put to death at a court, as that court knows it. It is the talk of that court:
 * envoys received there and spies posted there may hear of it and carry it home in their reports, so a court that
 * loses its people abroad, or puts them to death, becomes known for it, but only where someone carried the news.
 */
export interface LossAbroad {
  turn: number;
  kind: LossKind;
  characterId: string;
  /** The court that caught or put the servant to death. */
  court: Power;
  /** Whom the servant served, as that court knows it: null if the captive never said. */
  master: Power | null;
}

export function newLossAbroad(init: Partial<LossAbroad> = {}): LossAbroad {
  return {
    turn: 0,
    kind: "Captured",
    characterId: "",
    court: "Egypt",
    master: null,
    ...init,
  };
}

export const LossAbroadSchema: ObjSchema<LossAbroad> = obj("LossAbroad", newLossAbroad, {
  turn: I,
  kind: S,
  characterId: S,
  court: S,
  master: opt(S),
});

export const TaskKindValues = ["Candidates", "BackgroundCheck", "Authenticate", "RansomDemand"] as const;
export type TaskKind = (typeof TaskKindValues)[number];

/** Work the engine owes a court in a later season: check results, candidate pitches, and so on. */
export interface PendingTask {
  id: string;
  kind: TaskKind;
  requester: Power;
  dueTurn: number;
  characterId: string | null;
  copyId: string | null;
  spend: number;
  other: Power | null;
  /** A ransom demand whose rumour has reached the court asked to pay: only then can it be paid. */
  announced: boolean;
}

export function newPendingTask(init: Partial<PendingTask> = {}): PendingTask {
  return {
    id: "",
    kind: "Candidates",
    requester: "Egypt",
    dueTurn: 0,
    characterId: null,
    copyId: null,
    spend: 0,
    other: null,
    announced: false,
    ...init,
  };
}

export const PendingTaskSchema: ObjSchema<PendingTask> = obj("PendingTask", newPendingTask, {
  id: S,
  kind: S,
  requester: S,
  dueTurn: I,
  characterId: S,
  copyId: S,
  spend: I,
  other: opt(S),
  announced: B,
});

export const InboxKindValues = ["Resolution", "Battle", "Audience", "EnvoyReport", "SpyReport", "Rumor", "CheckResult", "Candidates", "Catastrophe", "Notice", "Assay", "Authentication", "Tablet", "Rejected"] as const;
export type InboxKind = (typeof InboxKindValues)[number];

export interface InboxItem {
  turn: number;
  kind: InboxKind;
  title: string;
  body: string;
  subject: string | null;
}

export function newInboxItem(init: Partial<InboxItem> = {}): InboxItem {
  return {
    turn: 0,
    kind: "Resolution",
    title: "",
    body: "",
    subject: null,
    ...init,
  };
}

export const InboxItemSchema: ObjSchema<InboxItem> = obj("InboxItem", newInboxItem, {
  turn: I,
  kind: S,
  title: S,
  body: S,
  subject: S,
});

/** The three versions of a message, side by side: the gaps between them are the game. */
export interface MessageTrail {
  id: string;
  turn: number;
  from: Power;
  to: Power;
  envoyId: string;
  envoyName: string;
  greetingText: string;
  leaderLetter: string;
  mandate: string;
  goldStated: number;
  goldDelivered: number;
  goldFine: number;
  proposalText: string | null;
  audienceTurn: number | null;
  delivered: string;
  exchanges: Exchange[];
  outcomes: string[];
  reportTurn: number | null;
  report: string;
}

export function newMessageTrail(init: Partial<MessageTrail> = {}): MessageTrail {
  return {
    id: "",
    turn: 0,
    from: "Egypt",
    to: "Egypt",
    envoyId: "",
    envoyName: "",
    greetingText: "",
    leaderLetter: "",
    mandate: "",
    goldStated: 0,
    goldDelivered: 0,
    goldFine: 0,
    proposalText: null,
    audienceTurn: null,
    delivered: "",
    exchanges: [],
    outcomes: [],
    reportTurn: null,
    report: "",
    ...init,
  };
}

export const MessageTrailSchema: ObjSchema<MessageTrail> = obj("MessageTrail", newMessageTrail, {
  id: S,
  turn: I,
  from: S,
  to: S,
  envoyId: S,
  envoyName: S,
  greetingText: S,
  leaderLetter: S,
  mandate: S,
  goldStated: I,
  goldDelivered: I,
  goldFine: I,
  proposalText: S,
  audienceTurn: opt(I),
  delivered: S,
  exchanges: list(() => ExchangeSchema),
  outcomes: list(S),
  reportTurn: opt(I),
  report: S,
});

export interface Exchange {
  host: string;
  envoy: string;
}

export function newExchange(init: Partial<Exchange> = {}): Exchange {
  return {
    host: "",
    envoy: "",
    ...init,
  };
}

export const ExchangeSchema: ObjSchema<Exchange> = obj("Exchange", newExchange, {
  host: S,
  envoy: S,
});

export interface GameEvent {
  turn: number;
  kind: string;
  text: string;
  visibleTo: Power[];
  /** A success-criteria marker (sealed tablet, accusation, forgery...), if any. */
  signal: string | null;
}

export function newGameEvent(init: Partial<GameEvent> = {}): GameEvent {
  return {
    turn: 0,
    kind: "",
    text: "",
    visibleTo: [],
    signal: null,
    ...init,
  };
}

export const GameEventSchema: ObjSchema<GameEvent> = obj("GameEvent", newGameEvent, {
  turn: I,
  kind: S,
  text: S,
  visibleTo: list(S),
  signal: S,
});

export interface ScoreRow {
  turn: number;
  power: Power;
  strength: number;
  growth: number;
  provinces: number;
  units: number;
  gold: number;
}

export function newScoreRow(init: Partial<ScoreRow> = {}): ScoreRow {
  return {
    turn: 0,
    power: "Egypt",
    strength: 0,
    growth: 0,
    provinces: 0,
    units: 0,
    gold: 0,
    ...init,
  };
}

export const ScoreRowSchema: ObjSchema<ScoreRow> = obj("ScoreRow", newScoreRow, {
  turn: I,
  power: S,
  strength: I,
  growth: D,
  provinces: I,
  units: I,
  gold: I,
});

/** The outcome the engine records when the host seals the tablet the envoy carried: the only sealing on a mission. */
export const SealedOutcome = "the tablet was sealed by both kings";

export function isSealedAgreement(t: Tablet): boolean {
  return !t.forged && t.sealedTurn !== null && t.partner !== null && t.seals.length >= 2;
}
