/**
 * The season brief ("The player's screen", build order item 18b, "Four questions, in order": what happened to me?): at most
 * six lines, most urgent first, of what this season brought the seat. A foreign army in its land or at its border, a
 * battle of its own, a letter or envoy waiting, a promise kept or broken, an errand done, gold or grain running short; the
 * world's other moves stay in the season's record. Drawn from the seat's own view alone, so it says only what the court
 * knows, and the one source of both the screen's brief and the model's request ("A model seat reads the same"): each line
 * names its place, and what answers it, for the screen to jump to.
 */
import { WorldMap } from "../model/map.ts";
import type { InboxItem } from "../model/records.ts";
import type { OrderOutcome } from "../model/outcomes.ts";
import { powerName, whose, type Power } from "../model/power.ts";
import type { SeatView, UnitView } from "../model/views.ts";
import { FeeDueTitle } from "../turn/court.ts";
import { formatMoney } from "./calendar.ts";
import { upper } from "./wording.ts";

/** What a line tells, in the order of urgency the brief keeps. */
export const BriefKindValues = ["Threat", "Battle", "Word", "Promise", "Errand", "Short"] as const;
export type BriefKind = (typeof BriefKindValues)[number];

/** What answers a line: the seat's troops, the season's record (its news), its court and servants, or its treasury. */
export const BriefAnswerValues = ["Troops", "News", "Court", "Treasury"] as const;
export type BriefAnswer = (typeof BriefAnswerValues)[number];

export interface BriefLine {
  kind: BriefKind;
  /** The line as the seat reads it, on the screen and in its request alike: names only, never an id or internal number. */
  text: string;
  /** The province it happened in, for the map to show, or null where it has no one place. */
  at: string | null;
  answer: BriefAnswer;
}

/** The most lines a brief holds; past it, the last says how many more wait in the season's record. */
export const MaxBrief = 6;

const name = (id: string): string => WorldMap.default.get(id).name;
const troops = (us: readonly UnitView[]): string => {
  const armies = us.filter((u) => u.kind === "Army").length;
  const fleets = us.length - armies;
  // "army", "2 armies"; mixed, each with its number: "4 armies and 1 fleet".
  const mixed = armies > 0 && fleets > 0;
  const one = (n: number, w: string, ws: string): string => (n === 0 ? "" : n === 1 ? (mixed ? `1 ${w}` : w) : `${n} ${ws}`);
  return [one(armies, "army", "armies"), one(fleets, "fleet", "fleets")].filter((x) => x !== "").join(" and ");
};
const places = (ids: readonly string[]): string => {
  const ns = [...new Set(ids)].map(name);
  return ns.length <= 1 ? (ns[0] ?? "") : `${ns.slice(0, -1).join(", ")} and ${ns[ns.length - 1]}`;
};
const kind = (o: OrderOutcome): string => (o.unitKind === "Army" ? "army" : "fleet");
/** " from Hatti" after a place taken, or nothing where the place bears its holder's name (Halab, of Halab). */
const from = (id: string, p: Power): string => (powerName(p).replace(/^the /u, "") === name(id) ? "" : ` from ${powerName(p)}`);

/** The season brief of a seat's view: at most {@link MaxBrief} lines, most urgent first. */
export function seasonBrief(v: SeatView): BriefLine[] {
  const me = v.power;
  const map = WorldMap.default;
  const mine = new Set([...v.owner.entries()].filter(([, o]) => o === me).map(([id]) => id));
  const lines: BriefLine[] = [];
  const add = (kind: BriefKind, text: string, at: string | null, answer: BriefAnswer): void => {
    lines.push({ kind, text, at, answer });
  };

  // A foreign army in its land, or at its border: its own cities under siege first, then troops in its land, then troops
  // that came next to it last season (those that merely stand there, in their own land or another's, are no news).
  for (const x of v.sieges.filter((x) => x.holder === me && x.besieger !== me))
    add("Threat", `${name(x.province)}, your city, is under siege by ${whose(x.besieger)} army.`, x.province, "Troops");
  const besieged = new Set(v.sieges.filter((x) => x.holder === me).map((x) => x.province));
  const foreign = v.units.filter((u) => u.power !== me && !besieged.has(u.province));
  const byPower = (us: readonly UnitView[]): Map<Power, UnitView[]> => {
    const out = new Map<Power, UnitView[]>();
    for (const u of us) out.set(u.power, [...(out.get(u.power) ?? []), u]);
    return out;
  };
  for (const [p, us] of byPower(foreign.filter((u) => mine.has(u.province))))
    add("Threat", `${upper(whose(p))} ${troops(us)} ${us.length === 1 ? "stands" : "stand"} in your land, in ${places(us.map((u) => u.province))}.`, us[0].province, "Troops");
  const arrived = new Set(v.lastSeason.filter((o) => o.power !== me && o.order === "move" && o.succeeded && o.target !== null).map((o) => `${o.power}|${o.target}`));
  const border = (u: UnitView): boolean => !mine.has(u.province) && arrived.has(`${u.power}|${u.province}`) && map.neighbors(u.province).some((n) => mine.has(n));
  for (const [p, us] of byPower(foreign.filter(border)))
    add("Threat", `${upper(whose(p))} ${troops(us)} came to your border, to ${places(us.map((u) => u.province))}.`, us[0].province, "Troops");

  // A battle of its own last season: its troops beaten or lost, its attacks, and attacks on it.
  for (const o of v.lastSeason) {
    if (o.power === me) {
      if (o.destroyed) add("Battle", `Your ${kind(o)} in ${name(o.province)} was destroyed.`, o.province, "Troops");
      else if (o.fellBack !== null) add("Battle", `Your ${kind(o)} was beaten from ${name(o.province)} and fell back to ${name(o.fellBack)}.`, o.fellBack, "Troops");
      else if (o.order === "move" && o.target !== null && !o.guest && o.targetOwner !== null && o.targetOwner !== me)
        add("Battle", o.succeeded ? `Your ${kind(o)} took ${name(o.target)}${from(o.target, o.targetOwner)}.` : `Your ${kind(o)}'s attack from ${name(o.province)} on ${name(o.target)} failed.`, o.target, "Troops");
    } else if (o.order === "move" && o.target !== null && !o.guest && o.targetOwner === me)
      add("Battle", o.succeeded ? `${upper(whose(o.power))} ${kind(o)} took ${name(o.target)} from you.` : `${upper(whose(o.power))} ${kind(o)} attacked ${name(o.target)} and was held off.`, o.target, "Troops");
  }

  // The season's news that waits on the king: a letter or envoy, a promise kept or broken, an errand done.
  for (const i of v.inbox) {
    const line = newsLine(i);
    if (line !== null) add(line.kind, line.text, null, line.answer);
  }

  // Gold or grain running short.
  const due = v.upkeep + v.worksUpkeep + v.fees;
  if (due > 0 && v.gold < due) add("Short", `Your treasury holds ${formatMoney(v.gold)}, less than a season's pay of your troops, works and servants (${formatMoney(due)}).`, null, "Treasury");
  const hungry = v.units.filter((u) => u.power === me && (u.hungry > 0 || u.unpaid > 0));
  if (hungry.length > 0) add("Short", `Your ${troops(hungry)} in ${places(hungry.map((u) => u.province))} went ${hungry.every((u) => u.unpaid > 0 && u.hungry === 0) ? "unpaid" : "hungry"} last season.`, hungry[0].province, "Troops");
  const unfed = v.provinces.filter((x) => mine.has(x.province) && x.fed < 1000);
  if (unfed.length > 0) add("Short", `Your people went short of grain last season in ${places(unfed.map((x) => x.province))}.`, unfed[0].province, "Treasury");

  // The same line twice is one line, with how many times ("Word from Haya, a spy's report (twice).").
  const merged: BriefLine[] = [];
  const times = new Map<string, number>();
  for (const l of lines) {
    const n = times.get(l.text) ?? 0;
    times.set(l.text, n + 1);
    if (n === 0) merged.push(l);
  }
  for (const l of merged) {
    const n = times.get(l.text)!;
    if (n > 1) l.text = `${l.text.replace(/\.$/u, "")} (${n === 2 ? "twice" : `${n} times`}).`;
  }
  const order = (k: BriefKind): number => BriefKindValues.indexOf(k);
  const sorted = merged.map((l, i) => [l, i] as const).sort((a, b) => order(a[0].kind) - order(b[0].kind) || a[1] - b[1]).map(([l]) => l);
  if (sorted.length <= MaxBrief) return sorted;
  const rest = sorted.length - (MaxBrief - 1);
  return [...sorted.slice(0, MaxBrief - 1), { kind: sorted[MaxBrief - 1].kind, text: `And ${rest} more this season, in the season's record.`, at: null, answer: "News" }];
}

/** A line of the season's news for the brief, by its kind and title, or null for what stays in the record. */
function newsLine(i: InboxItem): { kind: BriefKind; text: string; answer: BriefAnswer } | null {
  switch (i.kind) {
    case "Audience":
      return { kind: "Word", text: `${i.title.replace(/^Audience with /u, "")}, was received at your court.`, answer: "News" };
    case "EnvoyReport":
      return { kind: "Word", text: `${i.title} with his report.`, answer: "News" };
    case "SpyReport":
      return { kind: "Word", text: `${i.title}, a spy's report.`, answer: "News" };
    case "Tablet":
      return { kind: "Word", text: "A tablet you ordered is ready.", answer: "News" };
    case "Candidates":
      return i.title === "No candidates" ? null : { kind: "Errand", text: `${i.title}.`, answer: "Court" };
    case "Notice":
      if (PromiseTitles.has(i.title)) return { kind: "Promise", text: firstSentence(i.body), answer: i.title === FeeDueTitle ? "Court" : "Treasury" };
      if (ErrandTitles.has(i.title) || i.title.endsWith(" returns")) return { kind: "Errand", text: firstSentence(i.body), answer: "Court" };
      return null;
    default:
      return null;
  }
}

/** The notices of a promise kept or broken, the seat's own or another's to it: a debt repaid or past its season, a fee paid or due. */
const PromiseTitles: ReadonlySet<string> = new Set(["A debt repaid to you", "A debt repaid", "A debt past its season", FeeDueTitle, "A fee paid"]);

/** The notices of an errand done or ended: a servant home or gone, an envoy let go, and gold brought home. */
const ErrandTitles: ReadonlySet<string> = new Set(["Agent returns", "Gold brought home", "A servant leaves", "Envoy released"]);

/** A notice's first sentence, which names who and what: the rest stays in the season's record. */
function firstSentence(body: string): string {
  const end = body.search(/[.!?](\s|$)/u);
  return end < 0 ? `${body.trim()}.` : body.slice(0, end + 1).trim();
}
