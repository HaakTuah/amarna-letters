/**
 * Standing answers ("Minds follow what is at stake", built in item 6b): a king's own answers, given in advance in any of
 * its replies, for the envoys that arrive at its court. As a season's court begins, each envoy is matched to the first of
 * its host's answers that covers him, by what the court can read as he arrives (whose envoy, the gold his inventory states,
 * the tablet he brings to seal) and the answer's conditions, read as the host knows things then. An envoy who shows
 * tablets as evidence, or secretly serves the host, is never covered: those need the king. The engine answers a covered
 * envoy for nothing, in one exchange, worded by a phrasing call; he wakes nobody, and the king reads what was done in its
 * news. A hidden backstop bounds the gold they send back in a season.
 */
import { clamp, roundEven, toInt } from "../core/num.ts";
import { cmpNum, sortBy } from "../core/seq.ts";
import { eqIgnoreCase, isBlank, trim } from "../core/text.ts";
import { AnswerGoldShare, MaxAnswers, MaxAnswerSay, newAnswerBook, newStandingAnswer, type StandingAnswer, type StandingAnswerRequest } from "../model/answers.ts";
import { newHostReply, type HostReply } from "../model/exchanges.ts";
import type { Power } from "../model/power.ts";
import type { PendingAudience } from "../model/records.ts";
import { char, isAlive, ledger, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { conditionsText } from "../rules/conditions.ts";
import { idNumber, TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    keepAnswers(p: Power, requests: readonly StandingAnswerRequest[], cancel: readonly string[]): void;
    assignAnswers(): void;
    answerReply(a: PendingAudience, goldWeighed: number): HostReply;
    answerClauses(a: PendingAudience, goldWeighed: number): string[];
  }
}

const P = TurnEngine.prototype;

/** What a standing answer covers, in the words its king reads. */
export function answerText(x: StandingAnswer): string {
  const who = x.from === null ? "any court's envoy" : `an envoy of ${x.from}`;
  const what =
    x.brings === "Words"
      ? " who brings only words"
      : x.brings === "Gold"
        ? ` whose inventory states at least ${formatMoney(Math.max(1, x.minGold))} (and no tablet)`
        : x.brings === "Tablet"
          ? " who brings a tablet to seal"
          : "";
  const deeds: string[] = [];
  if (x.brings === "Tablet" || x.brings === "Anything") deeds.push(x.seal ? "seal his tablet" : "do not seal his tablet");
  if (x.goldBack > 0) deeds.push(`send back ${x.goldBack}% of the gold he brings`);
  const said = x.say.length > 0 ? `; say: "${x.say}"` : "";
  const when = x.conditions.length > 0 ? ` (${conditionsText(x.conditions)})` : "";
  return `${x.id}: ${who}${what}${when}: ${deeds.length > 0 ? deeds.join(", ") : "receive him"}${said}`;
}

/** Keeps a king's new standing answers (at most MaxAnswers in all) and cancels those named; refusals go to its news. */
P.keepAnswers = function (p, requests, cancel) {
  const S = this.s;
  if (requests.length === 0 && cancel.length === 0) return;
  let book = S.answers.tryGet(p);
  if (book === undefined) S.answers.set(p, (book = newAnswerBook()));
  const named = cancel.map((x) => trim(x)).filter((x) => x.length > 0);
  if (named.some((x) => eqIgnoreCase(x, "all"))) book.answers.length = 0;
  else {
    const unknown = named.filter((id) => {
      const before = book!.answers.length;
      book!.answers = book!.answers.filter((x) => !eqIgnoreCase(x.id, id));
      return book!.answers.length === before;
    });
    if (unknown.length > 0) notify(S, p, "Rejected", "Standing answers not cancelled", unknown.map((x) => `- ${x}: you have no standing answer ${x}`).join("\n"));
  }
  const refused: string[] = [];
  for (const r of requests) {
    const why =
      r.unreadable ??
      this.conditionProblem(r.conditions) ??
      (r.brings === "Gold" && r.minGold <= 0 ? "it names no amount of gold" : null) ??
      (book.answers.length >= MaxAnswers ? `you may keep at most ${MaxAnswers} standing answers` : null);
    if (why !== null) {
      refused.push(`${r.from ?? "any court"}: ${why}`);
      continue;
    }
    const say = trim(r.say);
    book.answers.push(
      newStandingAnswer({
        id: `a${++book.last}`,
        from: r.from,
        brings: r.brings,
        minGold: r.brings === "Gold" ? r.minGold : 0,
        conditions: [...r.conditions],
        seal: r.seal && (r.brings === "Tablet" || r.brings === "Anything"),
        goldBack: clamp(r.goldBack, 0, 100),
        say: say.length > MaxAnswerSay ? `${say.slice(0, MaxAnswerSay)}…` : say,
      }),
    );
  }
  if (refused.length > 0) notify(S, p, "Rejected", "Standing answers not kept", refused.map((x) => "- " + x).join("\n"));
};

/**
 * As the season's court begins: each envoy waiting at a court is matched to the first of its host's standing answers that
 * covers him, within the hidden backstop on gold. Call it once a season, before the wake check.
 */
P.assignAnswers = function () {
  const S = this.s;
  for (const a of S.audiences) {
    a.answer = null;
    a.answerGold = 0;
  }
  for (const [p, book] of S.answers) {
    if (book.answers.length === 0 || !isAlive(S, p)) continue;
    let room = toInt(Math.floor(ledger(S.treasuries.get(p)) * AnswerGoldShare));
    for (const a of sortBy(
      S.audiences.filter((x) => x.host === p),
      [(x: PendingAudience) => idNumber(x.id), cmpNum],
    )) {
      const d = a.dispatch;
      // Evidence shown, or an envoy who secretly serves the host: the king's own judgement, never a standing answer.
      if (d.copyIds.length > 0 || char(S, a.envoyId).secretMaster === p) continue;
      const tablet = d.proposalTabletId !== null;
      for (const x of book.answers) {
        if (x.from !== null && x.from !== a.from) continue;
        if (x.brings === "Words" && (d.gold > 0 || tablet)) continue;
        if (x.brings === "Gold" && (tablet || d.gold < Math.max(1, x.minGold))) continue;
        if (x.brings === "Tablet" && !tablet) continue;
        if (!this.conditionsHold(p, x.conditions)) continue;
        const gold = toInt(roundEven((d.gold * x.goldBack) / 100));
        if (gold > room) continue;
        room -= gold;
        a.answer = x.id;
        a.answerGold = gold;
        break;
      }
    }
  }
  // The views read for the conditions are of the season's beginning; orders read theirs afresh once audiences are done.
  this._viewsNow.clear();
};

/** The answer a covered envoy is given: one exchange, ending the audience, its words left to the phrasing call. */
P.answerReply = function (a, goldWeighed) {
  const x = this.s.answers.get(a.host).answers.find((y) => y.id === a.answer)!;
  return newHostReply({
    sealProposal: a.dispatch.proposalTabletId !== null && x.seal,
    goldBack: Math.min(a.answerGold, toInt(roundEven((goldWeighed * x.goldBack) / 100))),
    goldBackPurity: 100,
    end: true,
    byAnswer: x.id,
  });
};

/** What a covered envoy is told, clause by clause, for the phrasing call to word (and the plain words if it fails). */
P.answerClauses = function (a, goldWeighed) {
  const x = this.s.answers.get(a.host).answers.find((y) => y.id === a.answer)!;
  const r = this.answerReply(a, goldWeighed);
  const out = [`the king receives the envoy of ${a.from}`];
  if (goldWeighed > 0) out.push("he accepts the gift with thanks");
  if (a.dispatch.proposalTabletId !== null) out.push(r.sealProposal ? "he sets his seal on the tablet" : "he does not seal the tablet now");
  if (r.goldBack > 0) out.push(`he sends ${formatMoney(r.goldBack)} back with the envoy for his lord`);
  if (!isBlank(x.say)) out.push(`he says, in substance: ${x.say}`);
  return out;
};
