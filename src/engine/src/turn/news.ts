/**
 * News travels with people (build order item 11b): "Characters as sellers of news", and "reputation from losses abroad",
 * the talk of which courts lose their people abroad or put others' to death, which characters hear where they stand and
 * pass on to those they meet there.
 */
import { cmpNum, sortBy } from "../core/seq.ts";
import type { BuyNewsOrder } from "../model/orders.ts";
import type { LossAbroad } from "../model/records.ts";
import { gain, hiddenAt, newNewsHeld, remember, type Character } from "../model/people.ts";
import { land, type Power } from "../model/power.ts";
import { char, isAlive, logEvent, newKnown, notify, ownedBy } from "../model/state.ts";
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
    for (const f of S.payFacts) if (S.turn - f.turn <= HeardData.seasons && f.heardAt.getOrDefault(court, Number.MAX_SAFE_INTEGER) <= S.turn) hearPay(c, f.id);
    // A free person notes what it sees of the court, to sell elsewhere, once every few seasons.
    if (c.status !== "Free" || hiddenAt(c, court)) continue;
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
  // People standing at the same court pass on what they heard of losses abroad.
  for (const [, here] of present.entries()) {
    if (here.length < 2) continue;
    const all = [...new Set(here.flatMap((c) => c.heard))];
    for (const c of here) for (const k of all) hear(c, k);
    const paid = [...new Set(here.flatMap((c) => c.heardPay))];
    for (const c of here) for (const k of paid) hearPay(c, k);
  }
  foldOldPay(S, HeardData.seasons);
};

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
  notify(S, p, "SpyReport", `News of ${o.court} from ${c.name}`, `${c.name} sold you what they saw at the court of ${o.court} in season ${n.turn} (${S.turn - n.turn} seasons ago), for ${formatMoney(n.price)}: ${n.lines.join(" ")} A seller's word: it may be stale, and a greedy seller may make more of it than he saw.`, c.id);
  logEvent(S, "news-sold", `${c.name} sold ${p} news of ${o.court}${n.honest ? "" : ", made out larger than he saw"}.`, [p], "news-sold");
};
