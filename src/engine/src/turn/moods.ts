/**
 * The mood of the land as each court hears it (build order item 17++, part C; "Who holds what, and the mood of the land"
 * under Interface): the reads each source brings, each known from the season it reaches the court. Governors, spies,
 * envoys and scribes add theirs where they report (unrest.ts, intel.ts, envoys-home.ts, counts.ts); here are the words
 * themselves, the court's own eyes in its city and travellers' talk of the land near it. Model: `model/moods.ts`.
 */
import { cmpStr } from "../core/seq.ts";
import { newMoodRead, pruneMoodReads, type MoodRead } from "../model/moods.ts";
import { type Power } from "../model/power.ts";
import { alive, isAlive } from "../model/state.ts";
import { moodWords } from "../model/unrest.ts";
import { TurnEngine } from "./core.ts";
import { seatOf, wordHomeAt } from "../rules/court.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** A province's mood in words, as anyone living among its people hears it ("quiet", "uneasy", "restless", "near revolt"). */
    moodOf(province: string): string;
    /** The season word sent now from a province of a king's reaches his court, `extra` seasons later besides (as `tell`). */
    heardAt(p: Power, province: string, extra?: number): number;
    /** A court learns a province's mood, in the season `known`. */
    readMood(r: Partial<MoodRead> & Pick<MoodRead, "power" | "province" | "mood" | "source">): void;
    /** Each season, travellers' talk of the land near each court, heard a season later. */
    travellersTalk(): void;
    /** As each season begins, each court sees its own city's mood for itself; old reads are dropped. */
    courtsSee(): void;
  }
}

const P = TurnEngine.prototype;

/** The mood words from the calmest to the worst. */
const Steps = ["quiet", "uneasy", "restless", "near revolt"];

/**
 * The first guesses of travellers' talk (item 18 tunes them): it tells of the provinces within `hops` of a court's city
 * of which the court has heard nothing seen in the last `fresh` seasons, a season after (`late`).
 */
export const TalkData = { hops: 2, fresh: 3, late: 1 };

P.moodOf = function (province) {
  return moodWords(this.s.restless.getOrDefault(province, 0), this.revoltAt(province));
};

P.heardAt = function (p, province, extra = 0) {
  const S = this.s;
  // By the one clock of the road from there (wordHomeAt, bug #616), as the province's report is; a notice with no road
  // home is delivered as one from near.
  const more = Number.isFinite(extra) ? extra : 0;
  const at = this.map.exists(province) ? wordHomeAt(S, this.map, seatOf(S, this.map, p), province, S.turn, more) : more === 0 ? S.turn : S.turn + 1 + more;
  return at === S.turn || !Number.isFinite(at) ? S.turn + S.deliveryOffset : at;
};

P.readMood = function (r) {
  this.s.moodReads.push(newMoodRead({ seen: this.s.turn, known: this.s.turn, ...r }));
};

/**
 * Travellers bring talk of the land near the court: of a held province within reach of its city, of which it heard
 * nothing lately, the worst mood of that province and the held land beside it, blurred (talk never tells how near a
 * revolt is: "near revolt" comes as "restless").
 */
P.travellersTalk = function () {
  const S = this.s;
  const map = this.map;
  for (const p of alive(S)) {
    const near = new Set([this.courtAt(p)]);
    let ring = [...near];
    for (let h = 0; h < TalkData.hops; h++) {
      ring = ring.flatMap((x) => map.neighbors(x)).filter((x) => !near.has(x) && !map.get(x).isSea);
      for (const x of ring) near.add(x);
    }
    const heard = new Set(S.moodReads.filter((r) => r.power === p && r.seen > S.turn - TalkData.fresh).map((r) => r.province));
    for (const x of [...near].sort(cmpStr)) {
      if (heard.has(x) || S.owner.getOrDefault(x, null) === null) continue;
      const region = [x, ...map.neighbors(x)].filter((y) => !map.get(y).isSea && S.owner.getOrDefault(y, null) !== null);
      const worst = Math.min(2, Math.max(...region.map((y) => Steps.indexOf(this.moodOf(y)))));
      this.readMood({ power: p, province: x, mood: Steps[worst], known: S.turn + TalkData.late, source: "travellers" });
    }
  }
};

P.courtsSee = function () {
  const S = this.s;
  pruneMoodReads(S, (p) => isAlive(S, p));
  for (const p of alive(S)) {
    const court = this.courtAt(p);
    if (S.owner.getOrDefault(court, null) === p) this.readMood({ power: p, province: court, mood: this.moodOf(court), source: "court" });
  }
};
