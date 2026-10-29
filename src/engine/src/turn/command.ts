/**
 * Commanders (build order item 13, "Generals lead armies", "No commander, no mandate", "Army mandates", "Privileges"):
 * command of an army is a grant of authority, not a job. The king grants it to a person who stands at his court; the man
 * travels to the army and commands it from the season he reaches it; the king takes it back by sending word, which the
 * commander obeys when it reaches him, or refuses and keeps the army as his own band. What a commander does better is in
 * {@link CommandData}: his competence shapes the army's strength, its losses to winter and how it takes from the land, and
 * his greed what he keeps of the spoils. A mandate, the king's intent with limits, reaches the army with the realm's
 * couriers; the commander carries it out when no order of the king's reaches the army (the game's script commanders,
 * `bots/commander.ts`).
 */
import { cmpStr, sortBy } from "../core/seq.ts";
import { newBand } from "../model/bands.ts";
import { Uncommanded, mandateText, type CommandTraits, type Mandate } from "../model/command.ts";
import type { CommandOrder, MandateOrder, Order, RelieveOrder } from "../model/orders.ts";
import { remember, type Character } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import { findCharacter, logEvent, newId, notify, unitAt, type Unit } from "../model/state.ts";
import { newJourney } from "../model/records.ts";
import { courtOf, wordFromKing } from "../rules/court.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** The commander with the unit now (he has reached it), or null. */
    commanderOf(u: Unit): Character | null;
    /** Whether the king himself stands where the unit is, and so commands it directly. */
    kingWith(u: Unit): boolean;
    /** The traits the unit is commanded by: its commander's; the average where the king or nobody commands it. */
    commandOf(u: Unit): CommandTraits;
    grantCommand(p: Power, o: CommandOrder): void;
    relieveCommand(p: Power, o: RelieveOrder): void;
    setMandate(p: Power, o: MandateOrder): void;
    /**
     * As a season begins: word taking back a command reaches its commander, who steps down or refuses; a commander whose
     * army is gone goes home; each commander's place follows his army's.
     */
    commandSeason(): void;
    /** A commander leaves his army (`at` is where he stands) and walks to his king's court, free of the grant. */
    leaveCommand(c: Character, at: string): void;
    /** A commander keeps the army as his own (refusing his recall, or his kingdom fallen): it becomes his band. */
    armyToBand(u: Unit, c: Character, rose: string): void;
  }
}

/**
 * The minds of commanders on the spot (item 13): how a commander reads his army's mandate in a season no order of his
 * king's reaches it, giving the unit's order (or null to hold). The game's script commanders set it (`bots/commander.ts`);
 * left unset, an army with a mandate holds.
 */
export const CommanderMinds: { decide: ((e: TurnEngine, u: Unit, c: Character, m: Mandate) => Order | null) | null } = { decide: null };

const P = TurnEngine.prototype;

P.commanderOf = function (u) {
  if (u.commander === null || this.s.turn < u.commandFrom) return null;
  const c = findCharacter(this.s, u.commander);
  return c !== null && c.status !== "Dead" && c.duty === "Commanding" ? c : null;
};

P.kingWith = function (u) {
  return courtOf(this.s, this.map, u.power) === u.province;
};

P.commandOf = function (u) {
  const c = this.commanderOf(u);
  return c === null ? Uncommanded : { competence: c.traits.competence, loyalty: c.traits.loyalty, greed: c.traits.greed };
};

P.grantCommand = function (p, o) {
  const S = this.s;
  const u = unitAt(S, o.unit);
  const c = findCharacter(S, o.character);
  if (u === null || u.power !== p || c === null) return;
  // He sets out from the court with the grant, and commands from the season he reaches the army (at once where it stands
  // with the king: from next season).
  const seasons = Math.max(1, wordFromKing(S, this.map, p, u.province));
  u.commander = c.id;
  u.commandFrom = S.turn + (Number.isFinite(seasons) ? seasons : 1);
  u.relieveAt = null;
  c.duty = "Commanding";
  c.at = null;
  c.grantedBy = p;
  c.watchProvince = u.province;
  remember(c, S.turn, `The king of ${p} granted me the command of his ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name}.`);
  notify(S, p, "Resolution", "Command granted", `${c.name} set out to take command of your ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name}, and commands it from turn ${u.commandFrom}.`, c.id);
  logEvent(S, "command", `${p} granted ${c.name} the command of its ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name}.`, [p], "command");
};

P.relieveCommand = function (p, o) {
  const S = this.s;
  const u = unitAt(S, o.unit);
  if (u === null || u.power !== p || u.commander === null) return;
  const seasons = wordFromKing(S, this.map, p, u.province);
  u.relieveAt = S.turn + (Number.isFinite(seasons) ? Math.max(1, seasons) : 1);
  notify(S, p, "Resolution", "Command taken back", `Word that you take back the command of your ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name} is on its way; it reaches him in turn ${u.relieveAt}.`);
};

P.setMandate = function (p, o) {
  const S = this.s;
  const u = unitAt(S, o.unit);
  if (u === null || u.power !== p) return;
  const seasons = wordFromKing(S, this.map, p, u.province);
  u.mandate = o.mandate;
  u.mandateFrom = S.turn + (Number.isFinite(seasons) ? seasons : 1);
  notify(
    S,
    p,
    "Resolution",
    "Mandate sent",
    o.mandate === null
      ? `Your ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name} has no mandate now.`
      : `Your ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name} has its mandate from turn ${u.mandateFrom}: ${mandateText(o.mandate)}.`,
  );
};

P.commandSeason = function () {
  const S = this.s;
  for (const u of sortBy(S.units, [(u: Unit) => u.id, cmpStr])) {
    // A mandate whose last season has passed holds no more.
    if (u.mandate !== null && u.mandate.until !== null && u.mandate.until < S.turn) u.mandate = null;
    if (u.commander === null) continue;
    const c = findCharacter(S, u.commander);
    if (c === null || c.status === "Dead" || c.duty !== "Commanding") {
      u.commander = null;
      u.relieveAt = null;
      continue;
    }
    c.watchProvince = u.province;
    if (u.relieveAt === null || S.turn < u.relieveAt) continue;
    // Word of his recall reaches him: he steps down, or, disloyal and ambitious, keeps the army (first guess: loyalty
    // below 30 and ambition above 60); the king can enforce the recall only with troops.
    const t = c.traits;
    if (t.loyalty < 30 && t.ambition > 60 && u.kind === "Army") {
      notify(S, u.power, "Battle", "A commander refuses", `${c.name} refused to give up the command of your army in ${this.map.get(u.province).name}, and keeps its ${u.men} men as his own.`, c.id);
      logEvent(S, "defect", `${c.name} refused his recall by ${u.power} and kept the army in ${this.map.get(u.province).name} as his own.`, [u.power], "defect");
      this.armyToBand(u, c, "commander");
      continue;
    }
    u.commander = null;
    u.relieveAt = null;
    remember(c, S.turn, `I gave up the command of the army in ${this.map.get(u.province).name}, as the king of ${u.power} ordered.`);
    notify(S, u.power, "Resolution", "Command given up", `${c.name} gave up the command of your ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name} and is on the road to your court.`, c.id);
    this.leaveCommand(c, u.province);
  }
  // Commanders whose army is gone (destroyed, disbanded, given away, mutinied) go home.
  for (const c of sortBy(
    S.characters.filter((c) => c.duty === "Commanding" && c.status !== "Dead" && !S.units.some((u) => u.commander === c.id)),
    [(c: Character) => c.id, cmpStr],
  ))
    this.leaveCommand(c, c.watchProvince ?? courtOf(S, this.map, c.grantedBy ?? "Egypt"));
};

P.leaveCommand = function (c, at) {
  const S = this.s;
  const home = c.grantedBy ?? c.employer;
  c.grantedBy = null;
  c.watchProvince = null;
  const fallen = home === null || S.eliminated.includes(home);
  if (fallen || this.map.get(at).isSea) {
    // At sea he is landed at his king's court; with no king left he stays free where he was, at no court.
    c.duty = "None";
    c.at = fallen ? null : home;
    return;
  }
  c.duty = "Travelling";
  c.at = null;
  const j = newJourney({ id: newId(S, "j"), kind: "Travel", departTurn: S.turn, from: home, to: home, characterId: c.id });
  S.journeys.push(j);
  this.setOut(j, at, courtOf(S, this.map, home));
};

P.armyToBand = function (u, c, rose) {
  const S = this.s;
  const i = S.units.indexOf(u);
  if (i >= 0) S.units.splice(i, 1);
  const was = u.power;
  c.formerEmployer = c.employer ?? was;
  c.employer = null;
  c.contract = null;
  if (c.status === "Employed") c.status = "Free";
  c.duty = "Leading";
  c.at = null;
  c.grantedBy = null;
  c.watchProvince = u.province;
  // The men keep what they carry; a fleet's crews keep their ships and turn pirate.
  S.bands.push(newBand({ id: newId(S, "b"), leaderId: c.id, province: u.kind === "Fleet" ? (this.map.landProvinces.find((x) => x.waters === u.province)?.id ?? u.province) : u.province, men: u.men, ship: u.kind === "Fleet", since: S.turn, rose }));
  // Their savings go with them, as loose men's gold where they stand.
  if (!this.map.get(u.province).isSea) S.loot.set(u.province, S.loot.getOrDefault(u.province, 0) + u.savings);
  remember(c, S.turn, `I kept the ${u.kind === "Army" ? "army" : "fleet"} of ${was} in ${this.map.get(u.province).name} as my own band.`);
};
