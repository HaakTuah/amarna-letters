/**
 * Raiders from beyond the map (build order item 17++++a; War, "Pirates are bands at sea"). Crews and bands based beyond
 * the map's edge come through its doors, by sea in the sailing season or over the edge lands, as often as the season,
 * the sea and the policing of the coast they reach allow; they are bands like any other (`turn/bands.ts`): they rob,
 * take ships at sea, are hunted, hired or paid off; they carry off captives, and go home through their door with their
 * spoils, or melt away into the land's loose men. The data is `model/raiders.ts` and the doors' `raids`.
 */
import { idiv } from "../core/num.ts";
import type { Rng } from "../core/rng.ts";
import { BandData, bandCost, chiefAsks, newBand, type Band } from "../model/bands.ts";
import { grainWorth } from "../model/economy.ts";
import { Doors, type Beyond, type Door } from "../model/doors.ts";
import { WinterSeason, seasonOfTurn } from "../model/map.ts";
import { gain, newCharacter, newFact, newTraits, remember, type Character } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import { RaiderData, raidersHome } from "../model/raiders.ts";
import type { PayOffOrder } from "../model/orders.ts";
import { findCharacter, isAlive, logEvent, newId } from "../model/state.ts";
import { UnrestData } from "../model/unrest.ts";
import { policedShare } from "../model/works.ts";
import { personaTemplate } from "../rules/personas.ts";
import { drawSkills } from "../rules/skills.ts";
import { chooseStrategy } from "../rules/strategy.ts";
import { doorTongues } from "../rules/tongues.ts";
import { formatMoney } from "../rules/calendar.ts";
import { TurnEngine, idNumber } from "./core.ts";
import { share, shift } from "./people.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** Raiders come through the doors this season, each landing told to its holder as word from there reaches him. */
    raidersCome(): void;
    /** A band's captives go free where it stands, as the land's loose men: when it melts, enlists or becomes a realm's army. */
    freeCaptives(b: Band): void;
    /** The chance in a hundred that raiders come through `door` onto `landing` this season. */
    raidChance(door: Door, landing: string): number;
    /** A band based beyond the map goes home through its door, with its men, captives and its chief's purse. */
    goHome(b: Band, why: string): void;
    /** Whether a band based beyond the map can go home from where it stands: a crew of a sea door from any coast, a band over land from its door. */
    canGoHome(b: Band): boolean;
    /** A band based beyond the map carries off people where it robbed (`RaiderData.captivesPercent` of its men). */
    carryOff(b: Band, chief: Character): number;
    /** A script raider chief's own choice, before the formula every chief follows: home, or towards his door. True if he made one. */
    raiderChooses(b: Band, chief: Character): boolean;
    /**
     * Whether a script chief's band may move to `to`: out of land whose king paid it to keep out, if he keeps his word, and
     * a raider within reach of home.
     */
    bandMayGo(b: Band, to: string): boolean;
    /**
     * Whether a script chief keeps his word to the king who paid him off, while its term holds: if he is more loyal than
     * greedy (a first guess). While he keeps it, he turns home or keeps out of that king's land, and robs none of it, its
     * roads included. A model chief who chose his band's season himself is never bound by it.
     */
    keepsWord(b: Band): boolean;
    /** A king's offer to the chief of a band to leave his land (`pay_off`): taken by the chief's own formula, or refused. */
    payOffBand(p: Power, o: PayOffOrder): void;
  }
}

const P = TurnEngine.prototype;

/** What a coast holds worth taking: its people's purse and its stores, as a band reckons it. */
function worth(e: TurnEngine, id: string): number {
  return e.market(id).purse + grainWorth(e.stores(id)) + 1;
}

P.raidChance = function (door, landing) {
  const S = this.s;
  const winter = seasonOfTurn(S.turn) === WinterSeason;
  if (door.raids <= 0 || (winter && door.bySea)) return 0;
  let chance = (RaiderData.most * door.raids) / 100;
  if (winter) chance = (chance * RaiderData.winterLand) / 100;
  // The policing of the coast: its holder's troops and police there, and at sea his fleet on the waters off it.
  chance = (chance * policedShare(S, landing)) / 100;
  const waters = this.map.get(landing).waters;
  const holder = S.owner.getOrDefault(landing, null);
  if (door.bySea && waters !== null && holder !== null && S.units.some((u) => u.kind === "Fleet" && u.province === waters && u.power === holder)) chance = (chance * RaiderData.fleetPercent) / 100;
  return chance;
};

P.raidersCome = function () {
  const S = this.s;
  for (const door of Doors) {
    const peoples = door.beyond.filter((b) => (b.raids?.weight ?? 0) > 0);
    if (door.raids <= 0 || peoples.length === 0) continue;
    const rng = this.r("raiders", door.id);
    // They make for the richest of the door's coasts that are least guarded, as far as they know them: a raider hears where
    // the pickings are, and where the king's troops and police are not.
    const landing = rng.weighted(door.provinces, (id) => Math.max(1, Math.floor((worth(this, id) * policedShare(S, id)) / 100)));
    if (!rng.chance(this.raidChance(door, landing) / 100)) continue;
    const beyond = rng.weighted(peoples, (b) => b.raids!.weight);
    const men = door.bySea ? rng.range(1, RaiderData.ships) * BandData.shipMen : rng.range(RaiderData.landMen.least, RaiderData.landMen.most);
    const chief = this.raiderChief(rng, door, beyond, landing);
    const b = newBand({ id: newId(S, "b"), leaderId: chief.id, province: landing, men, ship: door.bySea, since: S.turn, rose: "raider", from: beyond.land });
    this.lead(chief, b);
    S.bands.push(b);
    const where = this.map.get(landing).name;
    logEvent(S, "band", `${men} ${beyond.raids!.who} under ${chief.name} came through ${door.name} to ${where}.`, [], "raiders-came");
    const holder = S.owner.getOrDefault(landing, null);
    if (holder !== null && isAlive(S, holder)) this.tell(holder, landing, "Notice", "Raiders", `${men} ${beyond.raids!.who} under ${chief.name} have come through ${door.name} to ${where}${door.bySea ? " in their ships" : ""}.`);
  }
};

declare module "./core.ts" {
  interface TurnEngine {
    /** The chief of a raid: one who went home through this door before, leading the next himself, or a new man of the land beyond. */
    raiderChief(rng: Rng, door: Door, beyond: Beyond, landing: string): Character;
  }
}

P.raiderChief = function (rng, door, beyond, landing) {
  const S = this.s;
  // A chief who keeps his word to the king who paid him off lands nowhere in that king's land while the term holds.
  const keeps = (c: Character): boolean => c.paidOffBy !== "" && S.turn <= c.paidOffUntil && c.traits.loyalty >= c.traits.greed && S.owner.getOrDefault(landing, null) === c.paidOffBy;
  const back = S.characters.filter((c) => c.duty === "Abroad" && c.status === "Free" && raidersHome(c.origin)?.door === door && !keeps(c));
  if (back.length > 0 && rng.chance(RaiderData.returnPercent / 100)) {
    const c = rng.pick(back);
    remember(c, S.turn, `I came back through ${door.name} to ${this.map.get(landing).name} at the head of a raid.`);
    return c;
  }
  const base = rng.pick(beyond.names);
  const c = newCharacter({
    id: newId(S, "c"),
    name: S.characters.some((x) => x.name === base) ? `${base} the younger` : base,
    origin: beyond.land,
    calling: "raider",
    // A man who leads a raid across the sea or the mountains is bold and greedy, and owes the map's kings nothing.
    traits: newTraits({ loyalty: rng.range(5, 50), greed: rng.range(40, 95), competence: Math.min(rng.range(20, 95), rng.range(20, 95)), ambition: rng.range(30, 90), courage: rng.range(55, 95) }),
  });
  c.purse = c.earned.savings = rng.range(RaiderData.purse.least, RaiderData.purse.most);
  const add = (text: string, secrecy: "Public" | "Hidden", tag: string): void => {
    c.facts.push(newFact({ id: newId(S, "f"), text, secrecy, tag }));
  };
  add(`Came from ${beyond.land}, ${beyond.people}.`, "Public", "origin");
  add(`Came by ${door.name} to ${this.map.get(landing).name} at the head of a raid.`, "Public", "door");
  add(`Speaks ${beyond.tongue}, and nothing of the map's.`, "Public", "tongue");
  c.marked = beyond.later ? "first recorded later" : beyond.invented ? "invented name" : null;
  c.arrived = S.turn;
  c.status = "Free";
  drawSkills(S.seed, c);
  doorTongues(S.seed, c, beyond.land, false, landing);
  chooseStrategy(c);
  c.persona = personaTemplate(c);
  S.characters.push(c);
  return c;
};

P.freeCaptives = function (b) {
  this.peopleOf(b.province).loose += b.captives;
  b.captives = 0;
};

P.canGoHome = function (b) {
  const home = raidersHome(b.from);
  if (home === null) return false;
  return b.ship && home.door.bySea ? this.map.get(b.province).isCoastal : home.door.provinces.includes(b.province);
};

P.goHome = function (b, why) {
  const S = this.s;
  const c = findCharacter(S, b.leaderId)!;
  const home = raidersHome(b.from)!;
  S.bands.splice(S.bands.indexOf(b), 1);
  const where = this.map.get(b.province).name;
  const took = b.captives > 0 ? `, carrying off ${b.captives} people` : "";
  c.duty = "Abroad";
  c.watchProvince = null;
  c.at = null;
  c.chiefPlan = null;
  c.seeking = false;
  remember(c, S.turn, `I went home to ${b.from} from ${where} with ${b.men} men${took} and ${c.purse} shekels: ${why}.`);
  logEvent(S, "band", `${c.name}'s ${home.beyond.raids?.who ?? "raiders"} went home from ${where} through ${home.door.name} (${why})${took}.`, [], "raiders-home");
  const holder = S.owner.getOrDefault(b.province, null);
  // Word of it reaches the land's king from where they left, at the pace of his reports from there.
  if (holder !== null && isAlive(S, holder)) this.tell(holder, b.province, "Notice", "Raiders gone home", `The ${home.beyond.raids?.who ?? "raiders"} under ${c.name} have left ${where} for home beyond ${home.door.name}${took}.`);
};

P.carryOff = function (b, chief) {
  const x = this.peopleOf(b.province);
  const [n, men] = share(x, Math.min(idiv(b.men * RaiderData.captivesPercent, 100), idiv(x.settled, 100)));
  if (n <= 0) return 0;
  shift(x, -n, -men);
  b.captives += n;
  // Its people remember the men who took their own away, as they remember a sack (item 17++).
  this.take(b.province, chief.id, Math.max(1, idiv(n * UnrestData.taken, Math.max(1, x.settled))));
  return n;
};

P.raiderChooses = function (b, chief) {
  const S = this.s;
  const home = raidersHome(b.from);
  if (home === null) return false;
  const content = chief.purse >= bandCost(b.men) * RaiderData.spoils;
  // A crew sails home before the winter closes the sea; a band over land turns home when it has its fill or has stayed long.
  // Paid off by the king whose land it stands in, a chief who keeps his word turns home.
  const paid = paidOffBy(this, b) !== null && S.owner.getOrDefault(b.province, null) === paidOffBy(this, b);
  const turn = paid || (b.ship ? seasonOfTurn(S.turn + 1) === WinterSeason || content : content || S.turn - b.since >= RaiderData.stay || b.short > 0);
  if (!turn) return false;
  if (this.canGoHome(b)) {
    this.goHome(b, paid ? `he was paid to go by ${chief.paidOffBy}` : content ? "his men had their fill of spoils" : b.ship ? "the sailing season was ending" : "it was time to go home");
    return true;
  }
  // Towards the door, by the land next door nearest it, through the land of a king who paid it to go too.
  const steps = (id: string): number => Math.min(...home.door.provinces.map((d) => this.map.hops(id, d)));
  const next = this.map
    .movesFrom("Army", b.province)
    .filter((n) => !this.map.get(n).isSea)
    .sort((a, c) => steps(a) - steps(c) || (a < c ? -1 : 1))[0];
  if (next === undefined || steps(next) >= steps(b.province)) return false;
  b.province = next;
  chief.watchProvince = next;
  return true;
};

P.keepsWord = function (b) {
  const chief = findCharacter(this.s, b.leaderId);
  // A model chief who decided his band's season himself is bound by no formula: he keeps his word or not by his own choice.
  const own = chief !== null && chief.chiefPlan !== null && chief.chiefPlan.turn >= this.s.turn - 1;
  return chief !== null && !own && chief.paidOffBy !== "" && this.s.turn <= chief.paidOffUntil && chief.traits.loyalty >= chief.traits.greed;
};

/** The king whose land a band spares while its chief keeps his word to him, or null. */
export function paidOffBy(e: TurnEngine, b: Band): string | null {
  return e.keepsWord(b) ? findCharacter(e.s, b.leaderId)!.paidOffBy : null;
}

P.bandMayGo = function (b, to) {
  const S = this.s;
  const spares = paidOffBy(this, b);
  if (spares !== null && S.owner.getOrDefault(to, null) === spares) return false;
  const home = raidersHome(b.from);
  if (home === null) return true;
  // A crew keeps to the coasts where its ship is; a band over land keeps within reach of its door.
  if (b.ship && home.door.bySea) return this.map.get(to).isCoastal;
  return Math.min(...home.door.provinces.map((d) => this.map.hops(to, d))) <= RaiderData.reach;
};

P.payOffBand = function (p, o) {
  const S = this.s;
  const b: Band | undefined = [...S.bands.filter((x) => x.province === o.province)].sort((a, c) => c.men - a.men || idNumber(a.id) - idNumber(c.id))[0];
  if (b === undefined) return;
  // The offer needs its carrier there once the season's moves are done: an army of the payer's, with its commander or the king.
  const here = S.units.filter((u) => u.province === o.province && u.power === p && u.kind === "Army");
  if (!here.some((u) => this.seatAt(p) === o.province || (u.commander !== null && S.turn >= u.commandFrom))) {
    this.tell(p, o.province, "Rejected", "Offer not carried", `No army of yours stood in ${this.map.get(o.province).name} with its commander or with you once the season's moves were done, so nobody carried your offer to the band there. No gold was paid.`);
    return;
  }
  const chief = findCharacter(S, b.leaderId);
  if (chief === null || chief.status !== "Free" || chief.duty !== "Leading") return;
  const name = this.map.get(o.province).name;
  const refuse = (why: string): void => {
    this.tell(p, o.province, "Rejected", "Offer refused", `${chief.name}, chief of the band in ${name}, would not leave your land for ${formatMoney(o.fee)}${why}. No gold was paid.`);
    logEvent(S, "band", `${chief.name}'s band in ${name} refused ${p}'s offer to pay it off.`, [p], "band-pay-refused");
  };
  // A raider's way out is home; any other band's, the land next door that is not the payer's, the richest it hears of.
  const raider = b.from !== "";
  const out = raider ? null : this.map.movesFrom("Army", b.province).filter((n) => !this.map.get(n).isSea && S.owner.getOrDefault(n, null) !== p).sort((a, c) => worth(this, c) - worth(this, a) || (a < c ? -1 : 1))[0];
  if (!raider && out === undefined) return refuse(": he has nowhere to go outside it");
  // A chief who has taken one king's gold to leave takes no other's while that term holds: the best offer, heard first, binds him.
  if (chief.paidOffBy !== "" && S.turn <= chief.paidOffUntil) return refuse(": he has taken another king's gold already");
  // He takes it if it pays what he asks for the seasons he gives up here (a script chief's formula, as for an enlistment);
  // a raider weighs at least the rest of his raid: to the winter for a crew, to the end of his stay for a band over land.
  const left = !raider ? 0 : b.ship ? 1 + ((WinterSeason - seasonOfTurn(S.turn + 1) + 3) % 3) : Math.max(1, RaiderData.stay - (S.turn - b.since));
  if (o.fee < chiefAsks(b, chief.traits.greed, Math.max(o.term, left))) return refuse(` over ${o.term === 1 ? "a season" : `${o.term} seasons`}`);
  if (!this.pay(p, o.fee, `the band of ${chief.name} in ${name}`, o, "it was not paid off")) return;
  gain(chief, o.fee, "Fees");
  chief.paidOffBy = p;
  chief.paidOffUntil = S.turn + o.term;
  remember(chief, S.turn, `I took ${o.fee} shekels from the king of ${p} to take my band out of his land for ${o.term} seasons.`);
  logEvent(S, "band", `${chief.name}'s band in ${name} was paid off by ${p}.`, [p], "band-paid-off");
  if (raider && this.canGoHome(b)) {
    this.goHome(b, `he was paid to go by ${p}`);
    this.tell(p, o.province, "Resolution", "Raiders paid off", `${chief.name} took your ${formatMoney(o.fee)} and went home from ${name} with his men.`);
    return;
  }
  if (out !== null && out !== undefined) {
    b.province = out;
    chief.watchProvince = out;
    if (!this.map.get(out).isCoastal) b.ship = false;
  }
  this.tell(p, o.province, "Resolution", "A band paid off", `${chief.name} took your ${formatMoney(o.fee)}: his band ${raider ? "says it will turn home" : `left ${name} for ${this.map.get(out!).name}`}, and he says he will keep out of your land until turn ${chief.paidOffUntil}.`);
};
