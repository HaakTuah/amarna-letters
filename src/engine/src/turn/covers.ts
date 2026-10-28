/**
 * Covers: news of a court's people abroad reaches it only by rumour or when they return. A servant who is caught,
 * detained, goes over to the host, is put to death or is let go keeps appearing to its master as it was, its job as the
 * master agreed it, until word comes. The rest of a fee falls due only when the servant is back with its job done (item
 * 11a), so the treasury betrays nothing either way. Each court that served the character keeps its own cover: an envoy that went
 * over to a host is covered for its old master, and again for its new one if something happens to it on the new master's
 * errand.
 */
import { coverOf, factsKnownTo, hiddenAt, newCover, type Character, type Duty } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import type { Journey } from "../model/records.ts";
import { findCharacter, isAlive } from "../model/state.ts";
import type { CharacterView } from "../model/views.ts";
import { Views } from "../rules/views.ts";
import { removeAll } from "./resolve.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    coverFor(c: Character, master: Power, believed: Duty, duty?: string | null, where?: string | null, seen?: CharacterView | null, factIds?: string[] | null, timing?: string | null): void;
    newsArrives(j: Journey): void;
    coversAtCourt(): void;
    restOf(c: Character, p: Power): number;
  }
}

const P = TurnEngine.prototype;

/**
 * Freezes what `master` sees of `c` before something happens abroad that it cannot see. An existing cover for that
 * master is kept: it still believes the older story. `duty`: the duty the master would see next in the normal course (an
 * envoy whose audience ended is on the road home), or null for what it sees now. `seen`: what the master saw, if taken
 * before the event began to change the character. `factIds`: the facts the master knew, if taken before the event added
 * any. `timing`: with `duty`, when the master would see it set out and due back in the normal course.
 */
P.coverFor = function (c, master, believed, duty = null, where = null, seen = null, factIds = null, timing = null) {
  const S = this.s;
  if (coverOf(c, master) !== null || !isAlive(S, master)) return;
  const view = seen ?? Views.character(S, c, master);
  if (!view.ours) return;
  c.covers.push(
    newCover({
      for: master,
      since: S.turn,
      believed,
      heldAt: view.status === "captured" ? c.heldBy : null,
      dutyText: duty ?? view.duty,
      whereText: where ?? view.where,
      timingText: timing ?? (duty === null ? view.timing : ""),
      fee: view.fee ?? c.contract?.fee ?? 0,
      advance: view.advance ?? c.contract?.advance ?? 0,
      startTurn: view.contractFrom ?? c.contract?.startTurn ?? S.turn,
      contractUntil: view.contractUntil,
      noticePrice: view.noticePrice,
      leavesTurn: view.leavesTurn,
      factIds: factIds ?? factsKnownTo(c, master).map((f) => f.id),
    }),
  );
};

/** A rumour about one of the receiving court's own people: the news it carries ends what the court believed. */
P.newsArrives = function (j) {
  const c = findCharacter(this.s, j.characterId);
  if (c === null) return;
  const cover = coverOf(c, j.to);
  if (cover === null) return;
  // Word that the servant has not returned: unless it is held in the court's service as the word says, the
  // court now believes just that (an envoy that went over to the host, a captive, one let go late, one dead).
  if (j.news === "Overdue" && !(c.employer === j.to && c.status === "Employed" && c.duty === "Detained")) {
    cover.believed = "Detained";
    cover.heldAt = null;
    cover.dutyText = `has not returned from ${cover.recalled && c.missionTarget === null && c.watchProvince !== null ? c.watchProvince : j.from}`;
    cover.whereText = "unknown";
    cover.timingText = "";
    return;
  }
  c.covers.splice(c.covers.indexOf(cover), 1);
};

/**
 * A servant who stands at a court that held a cover for it (home, or sent there by someone else) is seen there as it is;
 * word that it has not returned, if still on the road, is not sent. Not one posted there as another court's spy: it
 * watches in secret, so the court does not see it, and goes on believing what it believed.
 */
P.coversAtCourt = function () {
  const S = this.s;
  for (const c of S.characters) {
    const at = c.at;
    if (at === null || hiddenAt(c, at)) continue;
    const cover = coverOf(c, at);
    if (cover === null) continue;
    c.covers.splice(c.covers.indexOf(cover), 1);
    removeAll(S.journeys, (j) => j.kind === "Rumor" && j.news === "Overdue" && j.characterId === c.id && j.to === at);
  }
};

/**
 * The rest of a character's fee a court will owe when its job is done, as it reckons it (item 11a): what it believes of a
 * covered servant, else its job, a captive's included.
 */
P.restOf = function (c, p) {
  const k = coverOf(c, p);
  if (k !== null) return Math.max(0, k.fee - k.advance);
  const j = c.contract;
  return c.employer === p && (c.status === "Employed" || c.status === "Captured") && j !== null ? Math.max(0, j.fee - j.advance) : 0;
};
