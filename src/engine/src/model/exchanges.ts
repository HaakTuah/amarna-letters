import { B, I, type ObjSchema, S, list, obj, opt } from "../core/json.ts";
import { type Order, OrderSchema } from "./orders.ts";
import { StandingAnswerRequestSchema, type StandingAnswerRequest } from "./answers.ts";
import type { Power } from "./power.ts";
import { type Clause, ClauseSchema } from "./clauses.ts";
import { type Exchange, ExchangeSchema, type HomeCargo, HomeCargoSchema, type SpyReport, SpyReportSchema, type TabletProposal, TabletProposalSchema } from "./records.ts";
import { type Authority, AuthoritySchema } from "./authority.ts";
import { type Skills, SkillsSchema } from "./people.ts";
import { type LifeChoice, LifeChoiceSchema, type LifeView, LifeViewSchema } from "./life.ts";
import { type CharacterView, CharacterViewSchema, type TabletView, TabletViewSchema, newCharacterView } from "./views.ts";

/** Text the engine needs written by a character or the narrator before it can be delivered. */
export const MindTaskValues = ["EnvoyReport", "Pitch", "CheckReport", "SpyReport", "SummarizeMemory", "Questioned", "Life"] as const;
export type MindTask = (typeof MindTaskValues)[number];

export interface MindRequest {
  id: string;
  task: MindTask;
  characterId: string;
  /**
   * The court the text is for: the lord a report goes to, the court a pitch is made to, the court that paid for a
   * background check. For a memory summary, which goes to nobody, the court the character belongs to (its employer's,
   * else the one it stands at); null for one with neither, which belongs to no court.
   */
  court: Power | null;
  trailId: string | null;
  taskId: string | null;
  cargo: HomeCargo | null;
  report: SpyReport | null;
  /** Facts the engine has already chosen to release (background checks), or the memories to summarize. */
  facts: string[];
  /**
   * For a pitch (item 10): names it could give instead of its own (one invented in its region's style, and one a court has
   * heard well of and never seen), and a king it could claim to serve as a false envoy at the court where it stands.
   */
  aliases: string[];
  envoyOf: Power | null;
  /** For a memory summary: how many of the oldest memories it replaces. */
  fold: number;
  /** Item 11a: for its own season ("Life"), what it knows of where it stands. */
  life: LifeView | null;
  /**
   * For a spy's report: the copies of tablets from the watched court's archive that came home with it, now in the court's archive.
   * For a captive questioned (item 10+b): the tablets it gave way on (tablet ids).
   */
  copyIds: string[];
}

export function newMindRequest(init: Partial<MindRequest> = {}): MindRequest {
  return {
    id: "",
    task: "EnvoyReport",
    characterId: "",
    court: null,
    trailId: null,
    taskId: null,
    cargo: null,
    report: null,
    facts: [],
    aliases: [],
    envoyOf: null,
    fold: 0,
    life: null,
    copyIds: [],
    ...init,
  };
}

export const MindRequestSchema: ObjSchema<MindRequest> = obj("MindRequest", newMindRequest, {
  id: S,
  task: S,
  characterId: S,
  court: opt(S),
  trailId: S,
  taskId: S,
  cargo: () => HomeCargoSchema,
  report: () => SpyReportSchema,
  facts: list(S),
  aliases: list(S),
  envoyOf: opt(S),
  fold: I,
  life: () => LifeViewSchema,
  copyIds: list(S),
});

export interface MindReply {
  text: string;
  /** Asking price for a pitch; gold skimmed on the way home for a report. */
  number: number;
  /**
   * For a report with gold kept on the way home: the envoy replaces the inventory tablet with one it forges, stating only
   * what is left (see {@link AudienceRecord.SwapInventory}).
   */
  swapInventory: boolean;
  /** For an envoy's report: the host's answer as the envoy reports it, in clauses (item 8). */
  clauses: Clause[];
  /**
   * For a pitch (item 10, "Declaring a name"): the name it gives the court, its own by default; another's, or an invented
   * one, is a lie the engine records. Null: its own.
   */
  name: string | null;
  /** For a pitch: the king it claims to serve, as a false envoy at the court where it stands; null if it seeks service. */
  claimsToServe: Power | null;
  /**
   * For a pitch (item 10+b, Haakon's answer of 28 October 2026): what it says it can do, its own choice from what it
   * believes of itself; null leaves it to the engine's formula (its belief, more for one who lies about himself).
   */
  claims: Skills | null;
  /**
   * For a captive questioned (item 10+b): it recites a tablet that never was instead of what it saw, a league of its master
   * with `league` (null: the engine draws the king) against its captor. Its words are `text`.
   */
  lies: boolean;
  league: Power | null;
  /** Item 11a: its own season's choices ("Life"); null leaves everything as it is. */
  life: LifeChoice | null;
}

export function newMindReply(init: Partial<MindReply> = {}): MindReply {
  return {
    clauses: [],
    text: "",
    number: 0,
    swapInventory: false,
    name: null,
    claimsToServe: null,
    claims: null,
    lies: false,
    league: null,
    life: null,
    ...init,
  };
}

export const MindReplySchema: ObjSchema<MindReply> = obj("MindReply", newMindReply, {
  clauses: list(() => ClauseSchema),
  text: S,
  number: I,
  swapInventory: B,
  name: opt(S),
  claimsToServe: opt(S),
  claims: opt(() => SkillsSchema),
  lies: B,
  league: opt(S),
  life: () => LifeChoiceSchema,
});

/** What the host replies at an audience. Every field but Speech is an action the engine checks. */
export interface HostReply {
  speech: string;
  bribe: number;
  bribeAsk: string;
  jobOffer: number;
  sealProposal: boolean;
  detain: boolean;
  goldBack: number;
  goldBackPurity: number;
  end: boolean;
  /**
   * Only at an audience held while the host's orders stand ({@link AudienceView.OrdersStand}): envoys of its own it
   * sends from the audience, as the letters of an orders reply (dispatch orders, or a letter that could not be read). They
   * go out with the season's orders and are checked first. Ignored at any other audience. The envoy before the host never
   * hears of them ({@link AsHeard}).
   */
  letters: Order[];
  /**
   * Only at an audience held while the host's orders stand: the host reopens its orders, and gives orders this season
   * after its audiences, as when anything else wakes it. Once chosen it holds for the season. Ignored at any other audience.
   */
  reopenOrders: boolean;
  /** Standing answers the host gives at its court (item 6b), kept as those of its orders; and those it cancels. */
  answers: StandingAnswerRequest[];
  cancelAnswers: string[];
  /** The id of the host's standing answer that gave this answer (the engine's, worded by a phrasing call), or null. */
  byAnswer: string | null;
  /**
   * The script king stood in because the seat's call failed (set by the runner and logged, so replays stay exact). At an
   * audience held while the host's orders stand, a stand-in reply decides nothing for the seat: its letters and its choice
   * are ignored, and the seat is asked for orders that season, since only the seat's own model may choose to let its orders
   * stand ({@link TurnEngine.CourtsHeld}).
   */
  fromFallback: boolean;
  /** The host's answer in clauses (item 8): in structured press its words are these, in the templates' words. */
  clauses: Clause[];
  /** In structured press: what the host asks a bribed envoy to tell its lord, in clauses (news only). */
  bribeClauses: Clause[];
  /**
   * A tablet of the host's own for the envoy to seal in its king's name (item 9): only an envoy that carries its king's
   * seal can. Its clauses are written from the host to the envoy's king. No sworn alliance: an envoy's seal never swears one.
   */
  counter: TabletProposal | null;
}

export function newHostReply(init: Partial<HostReply> = {}): HostReply {
  return {
    counter: null,
    bribeClauses: [],
    clauses: [],
    speech: "",
    bribe: 0,
    bribeAsk: "",
    jobOffer: 0,
    sealProposal: false,
    detain: false,
    goldBack: 0,
    goldBackPurity: 100,
    end: false,
    letters: [],
    reopenOrders: false,
    answers: [],
    cancelAnswers: [],
    byAnswer: null,
    fromFallback: false,
    ...init,
  };
}

export const HostReplySchema: ObjSchema<HostReply> = obj("HostReply", newHostReply, {
  counter: opt(() => TabletProposalSchema),
  bribeClauses: list(() => ClauseSchema),
  clauses: list(() => ClauseSchema),
  speech: S,
  bribe: I,
  bribeAsk: S,
  jobOffer: I,
  sealProposal: B,
  detain: B,
  goldBack: I,
  goldBackPurity: I,
  end: B,
  letters: list(() => OrderSchema),
  reopenOrders: B,
  answers: list(() => StandingAnswerRequestSchema),
  cancelAnswers: list(S),
  byAnswer: opt(S),
  fromFallback: B,
});

/** The envoy's answer. Accepting a bribe or a job are explicit actions, not words. */
export interface EnvoyReaction {
  speech: string;
  acceptBribe: boolean;
  acceptJob: boolean;
  commitments: string;
  /** The envoy seals the host's tablet in its king's name (item 9): only with its king's seal. */
  sealCounter: boolean;
}

export function newEnvoyReaction(init: Partial<EnvoyReaction> = {}): EnvoyReaction {
  return {
    speech: "",
    acceptBribe: false,
    acceptJob: false,
    commitments: "",
    sealCounter: false,
    ...init,
  };
}

export const EnvoyReactionSchema: ObjSchema<EnvoyReaction> = obj("EnvoyReaction", newEnvoyReaction, {
  speech: S,
  acceptBribe: B,
  acceptJob: B,
  commitments: S,
  sealCounter: B,
});

export interface AudienceRound {
  host: HostReply;
  envoy: EnvoyReaction;
}

export function newAudienceRound(init: Partial<AudienceRound> = {}): AudienceRound {
  return {
    host: newHostReply(),
    envoy: newEnvoyReaction(),
    ...init,
  };
}

export const AudienceRoundSchema: ObjSchema<AudienceRound> = obj("AudienceRound", newAudienceRound, {
  host: () => HostReplySchema,
  envoy: () => EnvoyReactionSchema,
});

/** A whole audience as it happened, handed back to the engine to apply. */
export interface AudienceRecord {
  audienceId: string;
  delivered: string;
  skim: number;
  /**
   * The envoy that kept some of the gold replaced the inventory tablet with one it forged, stating only what the host's
   * weighers find. It takes the forger's skill ({@link GameConfig.ForgeMinCompetence}): without it the envoy dares not
   * hand the forgery over and the true inventory goes to the host. Ignored when it kept nothing; refused when it kept
   * it all (a forgery stating nothing hides nothing), and the true inventory goes.
   */
  swapInventory: boolean;
  rounds: AudienceRound[];
  /** The clauses the envoy recited (item 8). */
  clauses: Clause[];
}

export function newAudienceRecord(init: Partial<AudienceRecord> = {}): AudienceRecord {
  return {
    clauses: [],
    audienceId: "",
    delivered: "",
    skim: 0,
    swapInventory: false,
    rounds: [],
    ...init,
  };
}

export const AudienceRecordSchema: ObjSchema<AudienceRecord> = obj("AudienceRecord", newAudienceRecord, {
  clauses: list(() => ClauseSchema),
  audienceId: S,
  delivered: S,
  skim: I,
  swapInventory: B,
  rounds: list(() => AudienceRoundSchema),
});

/** What the host sees during an audience. */
export interface AudienceView {
  audienceId: string;
  turn: number;
  round: number;
  maxRounds: number;
  from: Power;
  host: Power;
  envoy: CharacterView;
  greeting: string;
  greetingDeviations: string[];
  spoken: string;
  /**
   * What the inventory tablet states: what was sent, or, if the envoy swapped it, what its forgery states.
   */
  goldStated: number;
  goldWeighed: number;
  proposal: TabletView | null;
  /**
   * The host chose to seal the {@link Proposal} at an earlier exchange of this audience: it is sealed when the audience ends.
   */
  proposalSealed: boolean;
  copiesShown: TabletView[];
  soFar: Exchange[];
  /**
   * Gold the host named in an earlier exchange to send home with the envoy (the latest amount named), or 0.
   */
  goldBackNamed: number;
  /** A gift the envoy accepted in an earlier exchange, or 0. An envoy takes one gift per audience. */
  giftAccepted: number;
  /** Only when the envoy secretly serves the host: what the envoy was really told. */
  secretMandate: string | null;
  secretLetter: string | null;
  /**
   * The host sleeps and was woken for its audiences only ({@link SleepState.HoldsCourt}): its orders stand unless it
   * reopens them, and it may send letters from the audience ({@link HostReply.Letters}, {@link HostReply.ReopenOrders}).
   */
  ordersStand: boolean;
  /** With {@link OrdersStand}: the host chose at an earlier exchange this season to reopen its orders. */
  reopenChosen: boolean;
  /**
   * With {@link OrdersStand}: the letters it has sent from its audiences this season so far (a later one for the same person replaces it).
   */
  lettersSent: Order[];
  /** The clauses the envoy recited, which a script king reads (item 8). In structured press they are the letter. */
  clauses: Clause[];
  /** The gold came with an inventory tablet (item 8). Without one there is nothing to weigh it against. */
  inventory: boolean;
  /**
   * The envoy carries its king's seal (item 9) and has not yet sealed a tablet of the host's at this audience: it may seal
   * one the host offers ({@link HostReply.counter}).
   */
  sealCarried: boolean;
  /** The envoy showed its credentials (item 9): its mandate's words and the limits of its seal; null when hidden. */
  credentials: Authority | null;
  shownMandate: string | null;
}

export function newAudienceView(init: Partial<AudienceView> = {}): AudienceView {
  return {
    sealCarried: false,
    credentials: null,
    shownMandate: null,
    inventory: true,
    clauses: [],
    audienceId: "",
    turn: 0,
    round: 0,
    maxRounds: 0,
    from: "Egypt",
    host: "Egypt",
    envoy: newCharacterView(),
    greeting: "",
    greetingDeviations: [],
    spoken: "",
    goldStated: 0,
    goldWeighed: 0,
    proposal: null,
    proposalSealed: false,
    copiesShown: [],
    soFar: [],
    goldBackNamed: 0,
    giftAccepted: 0,
    secretMandate: null,
    secretLetter: null,
    ordersStand: false,
    reopenChosen: false,
    lettersSent: [],
    ...init,
  };
}

export const AudienceViewSchema: ObjSchema<AudienceView> = obj("AudienceView", newAudienceView, {
  sealCarried: B,
  credentials: opt(() => AuthoritySchema),
  shownMandate: opt(S),
  inventory: B,
  clauses: list(() => ClauseSchema),
  audienceId: S,
  turn: I,
  round: I,
  maxRounds: I,
  from: S,
  host: S,
  envoy: () => CharacterViewSchema,
  greeting: S,
  greetingDeviations: list(S),
  spoken: S,
  goldStated: I,
  goldWeighed: I,
  proposal: () => TabletViewSchema,
  proposalSealed: B,
  copiesShown: list(() => TabletViewSchema),
  soFar: list(() => ExchangeSchema),
  goldBackNamed: I,
  giftAccepted: I,
  secretMandate: S,
  secretLetter: S,
  ordersStand: B,
  reopenChosen: B,
  lettersSent: list(() => OrderSchema),
});

/** The court a report, a pitch or a background check is for: every such request names one. */
export function requestFor(r: MindRequest): Power {
  if (r.court === null) throw new Error(`A ${r.task} request must name the court it is for.`);
  return r.court;
}

/**
 * The reply as the envoy before the host meets it: what the host says and does to it. The letters the host sends and its
 * choice to reopen its orders are the host's own business, so they are left out.
 */
export function asHeard(h: HostReply): HostReply {
  return newHostReply({
    speech: h.speech,
    bribe: h.bribe,
    bribeAsk: h.bribeAsk,
    jobOffer: h.jobOffer,
    sealProposal: h.sealProposal,
    detain: h.detain,
    goldBack: h.goldBack,
    goldBackPurity: h.goldBackPurity,
    end: h.end,
    // What it says in clauses (item 8), and a tablet of its own it offers the envoy to seal (item 9).
    clauses: h.clauses.map((c) => ({ ...c })),
    counter: h.counter === null ? null : { ...h.counter, clauses: h.counter.clauses.map((c) => ({ ...c })) },
  });
}
