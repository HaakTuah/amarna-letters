/**
 * News travels with people (build order item 11b): "Characters as sellers of news", and "reputation from losses abroad",
 * the talk of which courts lose their people abroad or put others' to death, which characters hear where they stand and
 * pass on to those they meet there.
 */
import { cmpNum, sortBy } from "../core/seq.ts";
import type { BuyNewsOrder } from "../model/orders.ts";
import type { LossAbroad } from "../model/records.ts";
import { gain, hiddenAt, newFact, newNewsHeld, remember, type Character } from "../model/people.ts";
import { land, type Power } from "../model/power.ts";
import { char, isAlive, logEvent, newId, newKnown, notify, ownedBy } from "../model/state.ts";
import { Dict } from "../core/collections.ts";
import { formatMoney } from "../rules/calendar.ts";
import { NewsData, newsOffered } from "../rules/news.ts";
import { Views } from "../rules/views.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { foldOldPay, hearPay } from "./jobs.ts";

/** How many losses abroad a person keeps in mind, newest last; and how long one is talked of, in seasons. */
export const HeardData = { keep: 40, seasons: 12 } as const;

declare module "./core.ts" {
  interface TurnEngine {
    /** Each season: free people standing at a court note its news, and everyone there hears and passes on the talk of losses. */
    newsSeason(): void;
    buyNewsOrder(p: Power, o: BuyNewsOrder): void;
  }
}

const P = TurnEngine.prototype;

/** A loss abroad as people talk of it: what befell whom, at which court, and whose servant it was ("-" if unknown). */
export const lossKey = (l: LossAbroad): string => `${l.kind}|${l.court}|${l.master ?? "-"}|${l.characterId}`;

P.newsSeason = function () {
  const S = this.s;
  const Map = this.map;
  const present = new Dict<Power, Character[]>();
  for (const c of sortBy(
    S.characters.filter((c) => c.status !== "Dead" && c.at !== null && c.heldBy === null && isAlive(S, c.at)),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    const court = c.at!;
    present.set(court, [...present.getOrDefault(court, []), c]);
    // The talk of the court where it stands: whose people it holds or put to death, and (Haakon's answers to item 11a) the
    // promises to pay kept and broken whose word has reached it.
    for (const l of S.losses) if (l.court === court && S.turn - l.turn <= HeardData.seasons) hear(c, lossKey(l));
    for (const f of S.payFacts) if (S.turn - f.turn <= HeardData.seasons && f.heardAt.getOrDefault(court, Number.MAX_SAFE_INTEGER) <= S.turn) hearPay(S, c, f.id, f.turn);
    // A person notes what it sees of the court, to sell elsewhere, once every few seasons (Haakon's answers to item 11b:
    // anyone may sell what he knows): a free person, a servant abroad, and a servant at its master's court only if it is
    // one who would sell its master's secrets (greedy and disloyal).
    if (c.status === "Captured" || hiddenAt(c, court)) continue;
    if (c.status === "Employed" && c.employer === court && !sellsSecrets(c)) continue;
    const had = c.news.find((n) => n.court === court) ?? null;
    if (had !== null && S.turn - had.turn < 2) continue;
    const rng = this.r("news", c.id);
    const skill = c.skills.gather;
    const lines: string[] = [];
    const near = new Set(ownedBy(S, court).flatMap((x) => [x, ...Map.neighbors(x)]));
    for (const u of sortBy(
      S.units.filter((u) => near.has(u.province)),
      [(u) => idNumber(u.id), cmpNum],
    ))
      if (rng.chance(0.3 + skill / 200)) lines.push(`${u.power} had ${u.kind === "Army" ? "an army" : "a fleet"} in ${Map.get(u.province).name}.`);
    // A greedy, disloyal seller makes the treasury out to be larger than he saw ("may exaggerate").
    const honest = !(c.traits.greed > 70 && c.traits.loyalty < 40);
    if (rng.chance(skill / 150)) {
      const g = S.treasuries.get(court).gold * (honest ? 1 : 1.5);
      lines.push(`The treasury of ${court} was said to hold some ${formatMoney(Math.max(0, Math.round(g / 50) * 50))}.`);
    }
    lines.push(...this.lossesHeard(c, court, skill / 100, 1));
    if (this.capitalSiege(court) !== null) lines.push(`${land(court)}'s capital was besieged.`);
    if (lines.length === 0) continue;
    c.news = [...c.news.filter((n) => n.court !== court), newNewsHeld({ court, turn: S.turn, lines, honest })].slice(-NewsData.keep);
  }
  // People standing at the same court pass on what they heard of losses abroad, and of promises kept or broken.
  const turnOf = new globalThis.Map(S.payFacts.map((f) => [f.id, f.turn]));
  for (const [, here] of present.entries()) {
    if (here.length < 2) continue;
    const all = [...new Set(here.flatMap((c) => c.heard))];
    for (const c of here) for (const k of all) hear(c, k);
    const paid = [...new Set(here.flatMap((c) => c.heardPay))];
    for (const c of here) for (const k of paid) hearPay(S, c, k, turnOf.get(k) ?? 0);
  }
  foldOldPay(S, HeardData.seasons);
};

/** A servant who would sell its master's secrets: greedy and disloyal. */
export const sellsSecrets = (c: Character): boolean => c.traits.greed > 70 && c.traits.loyalty < 40;

function hear(c: Character, key: string): void {
  if (c.heard.includes(key)) return;
  c.heard.push(key);
  if (c.heard.length > HeardData.keep) c.heard.splice(0, c.heard.length - HeardData.keep);
}

P.buyNewsOrder = function (p, o) {
  const S = this.s;
  const c = char(S, o.character);
  const n = newsOffered(S, c, p).find((x) => x.court === o.court) ?? null;
  if (n === null || hiddenAt(c, p)) {
    this.failed(p, o, "News not bought", `${c.name} no longer offers you news of ${o.court}.`, "the news was no longer offered", false, c.id);
    return;
  }
  if (!this.pay(p, n.price, `${c.name}'s news of ${o.court}`, o, "none was bought")) return;
  gain(c, n.price, "News");
  remember(c, S.turn, `I sold ${p} my news of ${o.court} for ${formatMoney(n.price)}.`);
  // Who held the court's land when the seller stood there comes with it, as a spy's report brings it (as of then).
  let book = S.known.tryGet(p);
  if (book === undefined) S.known.set(p, (book = new Dict()));
  for (const prov of ownedBy(S, o.court)) {
    const had = book.tryGet(prov);
    if (had !== undefined && had.turn >= n.turn) continue;
    book.set(prov, newKnown({ owner: Views.ownerAt(S, this.map, prov, n.turn), turn: n.turn, source: c.name }));
  }
  // A servant selling its master's secrets does it at its real cost if caught: its master may hear of it.
  if (c.employer === o.court && c.status === "Employed" && this.r("secrets-caught", `${c.id}|${S.turn}`).chance(NewsData.secretsCaught / 100)) {
    // Word of it goes from the buyer's court by the roads (Everything travels): its master knows when it arrives.
    const f = newFact({ id: newId(S, "f"), text: `Sold the secrets of ${land(o.court)}, whom they served, to ${land(p)} (season ${S.turn}).`, secrecy: "Hidden", tag: "sold-secrets", knownBy: [] });
    c.facts.push(f);
    this.rumor(o.court, p, f.text, c.id, "Name", f.id);
    logEvent(S, "secrets-sold", `${c.name} was caught selling ${o.court}'s secrets to ${p}.`, [], "secrets-caught");
  }
  // Haakon's answers to item 11b+ ("Reports"): what a servant's errand asked for belongs in his report under the job, in his
  // own words; selling it, to his master or to anyone his master hears of, is evidence of a broken job, his master's to act
  // on and to tell others. The engine judges no report: it records only the sale.
  const k = c.contract;
  const errand = k?.errand ?? null;
  if (c.status === "Employed" && c.employer !== null && k !== null && errand !== null && errand.what !== "stay" && errand.where === o.court && n.turn >= k.startTurn) {
    const master = c.employer;
    const f = newFact({ id: newId(S, "f"), text: `Sold to ${land(p)} what their errand to ${land(o.court)} for ${land(master)} asked of them (season ${S.turn}).`, secrecy: "Hidden", tag: "sold-report", knownBy: [] });
    c.facts.push(f);
    if (p === master) {
      f.knownBy.push(master);
      notify(S, master, "Notice", "Sold what belonged in a report", `What ${c.name} sold you of ${o.court} is what their errand there asked of them, which belongs in their report under the job. It is evidence of a broken job: yours to act on (withhold the rest of the fee, dismiss them) and to tell others.`, c.id);
    } else if (this.r("report-sold", `${c.id}|${S.turn}`).chance(NewsData.secretsCaught / 100)) this.rumor(master, p, f.text, c.id, "Name", f.id);
    logEvent(S, "report-sold", `${c.name} sold ${p} what their errand to ${o.court} asked of them.`, [], "report-sold");
  }
  notify(S, p, "SpyReport", `News of ${o.court} from ${c.name}`, `${c.name} sold you what they saw at the court of ${o.court} in season ${n.turn} (${S.turn - n.turn} seasons ago), for ${formatMoney(n.price)}: ${n.lines.join(" ")} A seller's word: it may be stale, and a greedy seller may make more of it than he saw.`, c.id);
  logEvent(S, "news-sold", `${c.name} sold ${p} news of ${o.court}${n.honest ? "" : ", made out larger than he saw"}.`, [p], "news-sold");
};
