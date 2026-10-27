/**
 * One contract for every seat: humans, language-model leaders and script bots receive the same view and return the same
 * structured decisions. The engine never knows who sits in a seat.
 */
import {
  B,
  I,
  S,
  newGameConfig,
  obj,
  type AudienceView,
  type Character,
  type Dispatch,
  type EnvoyReaction,
  type Exchange,
  type GameEvent,
  type HostReply,
  type MessageTrail,
  type MindReply,
  type MindRequest,
  type ObjSchema,
  type Power,
  type ScoreRow,
  type SeatView,
  type TurnSubmission,
} from "@amarna/engine";

export interface ISeat {
  readonly label: string;
  /** Whether this seat may sleep when the game allows it (model and file seats). Script and human seats play every season. */
  readonly canSleep?: boolean;
  decide(view: SeatView, signal?: AbortSignal): Promise<TurnSubmission>;
  hostAudience(view: AudienceView, court: SeatView, signal?: AbortSignal): Promise<HostReply>;
  /**
   * A seat that settles everything waiting at its court in one call ("One call per wake-up" under "Minds follow what is at
   * stake"): one exchange of every audience still open, in the order given. An answer it leaves out (null) is answered by
   * the stand-in. Model and file kings have it; script and human seats answer each audience in turn.
   */
  holdCourt?(views: AudienceView[], court: SeatView, signal?: AbortSignal): Promise<(HostReply | null)[]>;
  /**
   * Words what one of its standing answers decided, in a phrasing call to a small model (in full press words are always a
   * model's): from the clauses decided and the king's voice, without its record. A seat without it, or whose call fails,
   * has the clauses read out as they are.
   */
  phrase?(req: PhraseRequest, signal?: AbortSignal): Promise<string>;
}

/** What a phrasing call words: a standing answer's clauses, for the envoy of a court. */
export interface PhraseRequest {
  key: string;
  turn: number;
  host: Power;
  from: Power;
  envoy: string;
  clauses: string[];
}

/** A standing answer's words when no phrasing call makes them: the clauses, as the king's scribe records them. */
export function plainWords(clauses: readonly string[]): string {
  const text = clauses.join("; ");
  return text.length === 0 ? "" : text[0].toUpperCase() + text.slice(1) + ".";
}

/** A character's voice: envoys, spies and candidates. The engine keeps the authoritative copy. */
export interface ICharacterMind {
  readonly label: string;
  /** Who plays this character, as labelled, when the minds leave some characters to another (the script). */
  authorFor?(c: Character): string;
  present(ctx: EnvoyContext, signal?: AbortSignal): Promise<PresentResult>;
  react(ctx: EnvoyContext, host: HostReply, signal?: AbortSignal): Promise<EnvoyReaction>;
  /** Envoy reports, recruitment pitches and spy reports. */
  write(ctx: MindContext, signal?: AbortSignal): Promise<MindReply>;
}

/** The narrator only phrases: it receives facts the engine has already released. */
export interface INarrator {
  readonly label: string;
  persona(c: Character, signal?: AbortSignal): Promise<string>;
  checkReport(ctx: CheckContext, signal?: AbortSignal): Promise<string>;
  chronicle(ctx: ChronicleContext, signal?: AbortSignal): Promise<string>;
}

export interface PresentResult {
  speech: string;
  skim: number;
  /** With gold kept: replace the inventory tablet with one the envoy forges, stating only what the host's weighers find. */
  swapInventory: boolean;
}

export function newPresentResult(init: Partial<PresentResult> = {}): PresentResult {
  return { speech: "", skim: 0, swapInventory: false, ...init };
}

export const PresentResultSchema: ObjSchema<PresentResult> = obj("PresentResult", newPresentResult, { speech: S, skim: I, swapInventory: B });

/** What an envoy has in front of it at a foreign court. */
export interface EnvoyContext {
  self: Character;
  sender: Power;
  host: Power;
  dispatch: Dispatch;
  turn: number;
  seed: number;
  round: number;
  maxRounds: number;
  soFar: Exchange[];
  /**
   * It accepted the host's gift at an earlier exchange of this audience: an envoy takes one gift per audience, so a later
   * gift is not given, and a model envoy is not asked whether to take it.
   */
  giftTaken: boolean;
  delivered: string;
  skim: number;
  /** The back pay its employer owes it, paid when it is back at his court; lost if it goes over to another. */
  backPay: number;
  /** Whether its employer looks doomed, from public facts (Views.looksDoomed): back pay owed by a doomed court may never be paid. */
  employerDoomed: boolean;
  /** The skill it takes to fake a seal (GameConfig.forgeMinCompetence): a script envoy weighs its own against it. */
  forgeMinCompetence: number;
}

export function newEnvoyContext(init: Pick<EnvoyContext, "self" | "sender" | "host" | "dispatch" | "turn" | "seed"> & Partial<EnvoyContext>): EnvoyContext {
  return {
    round: 0,
    maxRounds: 0,
    soFar: [],
    giftTaken: false,
    delivered: "",
    skim: 0,
    backPay: 0,
    employerDoomed: false,
    forgeMinCompetence: newGameConfig().forgeMinCompetence,
    ...init,
  };
}

export interface MindContext {
  request: MindRequest;
  self: Character;
  turn: number;
  seed: number;
  trail: MessageTrail | null;
  /** For pitches: what the character asks by default (the engine's base price). */
  basePrice: number;
  /** For pitches: how many courts are looking for people right now. */
  demand: number;
  /** For an envoy's report with gold: the skill it takes to fake a seal (see EnvoyContext.forgeMinCompetence). */
  forgeMinCompetence: number;
}

export function newMindContext(init: Pick<MindContext, "request" | "self" | "turn" | "seed"> & Partial<MindContext>): MindContext {
  return { trail: null, basePrice: 0, demand: 0, forgeMinCompetence: newGameConfig().forgeMinCompetence, ...init };
}

export interface CheckContext {
  subject: Character;
  court: Power;
  facts: string[];
  turn: number;
}

export interface ChronicleContext {
  power: Power;
  known: GameEvent[];
  scores: ScoreRow[];
  winners: string[];
  lastTurn: number;
}
