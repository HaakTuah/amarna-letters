import { B, I, type ObjSchema, S, list, obj, opt } from "../core/json.ts";
import { type Condition, ConditionSchema } from "./conditions.ts";
import type { Power } from "./power.ts";

/**
 * Standing answers ("Minds follow what is at stake", built in item 6b): a king's own answers given in advance for what
 * arrives at its court, in the engine's vocabulary, as an envoy carries a mandate. The engine carries them out for nothing,
 * worded by a phrasing call, and they never wake the king.
 */
export const AnswerBringsValues = ["Anything", "Words", "Gold", "Tablet"] as const;
export type AnswerBrings =
  /** Any envoy of the court named. */
  | "Anything"
  /** An envoy who brings only words: no gold and no tablet to seal. */
  | "Words"
  /** An envoy whose inventory states at least {@link StandingAnswer.minGold} shekels, and who brings no tablet to seal. */
  | "Gold"
  /** An envoy who brings a tablet to seal. */
  | "Tablet";

/** A standing answer as a king gives it. */
export interface StandingAnswerRequest {
  /** Whose envoys it answers; null for any court's. */
  from: Power | null;
  brings: AnswerBrings;
  minGold: number;
  conditions: Condition[];
  /** For an envoy with a tablet: seal it (false: decline it for now). */
  seal: boolean;
  /** The share, in percent, of the gold the envoy brings that goes back with him to his king (100: a gift of like value). */
  goldBack: number;
  /** The gist of what the king says, in its own words, for the phrasing call (at most MaxAnswerSay characters). */
  say: string;
  /** Why the reply could not be read: refused with this reason. */
  unreadable: string | null;
}

export function newStandingAnswerRequest(init: Partial<StandingAnswerRequest> = {}): StandingAnswerRequest {
  return { from: null, brings: "Anything", minGold: 0, conditions: [], seal: false, goldBack: 0, say: "", unreadable: null, ...init };
}

export const StandingAnswerRequestSchema: ObjSchema<StandingAnswerRequest> = obj("StandingAnswerRequest", newStandingAnswerRequest, {
  from: opt(S),
  brings: S,
  minGold: I,
  conditions: list(() => ConditionSchema),
  seal: B,
  goldBack: I,
  say: S,
  unreadable: S,
});

/** A standing answer a king keeps until it cancels it: "a1", "a2", ... for this king, shown in its view. */
export interface StandingAnswer {
  id: string;
  from: Power | null;
  brings: AnswerBrings;
  minGold: number;
  conditions: Condition[];
  seal: boolean;
  goldBack: number;
  say: string;
}

export function newStandingAnswer(init: Partial<StandingAnswer> = {}): StandingAnswer {
  return { id: "", from: null, brings: "Anything", minGold: 0, conditions: [], seal: false, goldBack: 0, say: "", ...init };
}

export const StandingAnswerSchema: ObjSchema<StandingAnswer> = obj("StandingAnswer", newStandingAnswer, {
  id: S,
  from: opt(S),
  brings: S,
  minGold: I,
  conditions: list(() => ConditionSchema),
  seal: B,
  goldBack: I,
  say: S,
});

/** A king's standing answers. A king that never gave one has none ({@link GameState.answers}). */
export interface AnswerBook {
  answers: StandingAnswer[];
  /** The number of the last standing answer it was given, for the next id. */
  last: number;
}

export function newAnswerBook(init: Partial<AnswerBook> = {}): AnswerBook {
  return { answers: [], last: 0, ...init };
}

export const AnswerBookSchema: ObjSchema<AnswerBook> = obj("AnswerBook", newAnswerBook, {
  answers: list(() => StandingAnswerSchema),
  last: I,
});

/** The most standing answers a king may keep at once. */
export const MaxAnswers = 8;
/** The longest gist a standing answer keeps for its words. */
export const MaxAnswerSay = 300;
/**
 * The hidden backstop: standing answers together send back at most this share of the king's treasury, as the season
 * begins, in one season. An envoy whose answer would go past it is not covered, and the king receives him itself.
 */
export const AnswerGoldShare = 0.25;
