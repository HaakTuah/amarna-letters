/**
 * Bands, chiefs and outlaws (build order item 11b): "Bands are a character's soldiers", "How many bands", "A head rises
 * where men lack one", "Pirates are bands at sea", "Turning outlaw" and "The way back".
 *
 * A band is men a chief gathered from a province's loose people. It robs its province's purse and stores and the
 * travellers on its roads (and, with a ship, the sea beside its coast), feeds and pays its men from what it takes, and
 * keeps only as many as it can pay: men join it while it has a surplus to pay them and leave when it is short, so no
 * number sets how many bands a land holds or how large they grow. A chief's share is his own gold. Its holder's armies
 * hunt it where they stand on his order or standing order. Everything is drawn from seeded streams ("Deterministic").
 */
import { Dict } from "../core/collections.ts";
import { clamp, idiv } from "../core/num.ts";
import type { Rng } from "../core/rng.ts";
import { cmpNum, sortBy, sum } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { BandData, bandCost, newBand, type Band } from "../model/bands.ts";
import { grainWorth, needOf, priceAt } from "../model/economy.ts";
import { LandData } from "../model/land.ts";
import { coverOf, gain, newCharacter, newFact, newTraits, remember, type Character } from "../model/people.ts";
import { AllPowers, land, type Power } from "../model/power.ts";
import { alive, huntCovers, huntNow, isAlive, logEvent, newId, notify, siegeOf } from "../model/state.ts";
import { Styles } from "../rules/cast.ts";
import { personaTemplate } from "../rules/personas.ts";
import { drawSkills } from "../rules/skills.ts";
import { chooseStrategy } from "../rules/strategy.ts";
import { TurnEngine, idNumber } from "./core.ts";
import { killsByChoice } from "./own-choices.ts";

/** How a head rose ("How he rose shapes who he is"): the circumstance leans his traits, since it picks the man. */
export type Rose = "crowd" | "mutiny" | "refugees" | "successor" | "split" | "outlaw";

declare module "./core.ts" {
  interface TurnEngine {
    bandsSeason(): Dict<Power, string[]>;
    chiefKills(b: Band, victim: Character, province: string): boolean;
    /**
     * Whether talk of a standing hunt over `target` has reached a chief at `at` (Haakon's answers to item 11b+: chiefs hear
     * of a standing hunt by talk like any news, from its king's capital at the pace of the roads).
     */
    huntHeard(at: string, target: string): boolean;
    /**
     * A traveller robbed and left alive names his robbers (Haakon's answers to item 11b+: every traveller is a witness):
     * word that the chief rode with the Habiru goes by the roads to the land's king and to the traveller's master.
     */
    robbersNamed(victim: Character, b: Band, province: string): void;
    bandOf(c: Character): Band | null;
    bandsAt(province: string): Band[];
    /** A head rises from `men` men in `province`: a new character leading them as a band. */
    headRises(province: string, men: number, rose: Rose, rng: Rng, court?: Power | null): Band;
    /** A band without its chief: one of its own takes over, or it melts back into the loose men. */
    leaderLost(b: Band, why: string): void;
    /** A chief gives up the road ("The way back"): his men go loose and he walks to the nearest court a free man. */
    wayBack(b: Band, why: string): void;
    /** What a band takes of a traveller or a cargo it robs, into its chief's purse (or, with no band, the loose men's). */
    robbedBy(province: string, gold: number): Band | null;
    /** The odds in a hundred that the bands working a province (or, at sea, its coasts' pirates) stop a traveller there. */
    bandOdds(province: string): number;
    /** A free person takes to the hills with the loose men of `province` ("Turning outlaw"). */
    turnOutlaw(c: Character, province: string): void;
  }
}

const P = TurnEngine.prototype;

P.bandOf = function (c) {
  return this.s.bands.find((b) => b.leaderId === c.id) ?? null;
};

P.bandsAt = function (province) {
  return this.s.bands.filter((b) => b.province === province);
};

P.bandOdds = function (province) {
  const Map = this.map;
  const prov = Map.get(province);
  const working = prov.isSea ? this.s.bands.filter((b) => b.ship && Map.get(b.province).waters === province) : this.bandsAt(province);
  const men = sum(working, (b) => b.men);
  if (men <= 0) return 0;
  const odds = (BandData.roadOdds * men) / (men + BandData.roadHalf);
  const holder = prov.isSea ? null : this.s.owner.getOrDefault(province, null);
  const policed = holder !== null && this.s.units.some((u) => u.province === province && u.power === holder);
  return policed ? (odds * LandData.policedPercent) / 100 : odds;
};

P.robbedBy = function (province, gold) {
  const S = this.s;
  const Map = this.map;
  const prov = Map.get(province);
  const working = prov.isSea ? S.bands.filter((b) => b.ship && Map.get(b.province).waters === province) : this.bandsAt(province);
  // The largest band there did it, if any: ties to the oldest.
  const b = sortBy(working, [(x: Band) => -x.men, cmpNum], [(x: Band) => idNumber(x.id), cmpNum])[0] ?? null;
  if (b !== null) {
    const chief = S.characters.find((c) => c.id === b.leaderId)!;
    gain(chief, gold, "Loot");
    b.take += gold;
  } else if (gold > 0 && !prov.isSea) S.loot.set(province, S.loot.getOrDefault(province, 0) + gold);
  else if (gold > 0) {
    // Lost at sea with no pirates: the storm's or the sea's, which nobody spends; the nearest coast's loose men find it.
    const coast = Map.coastsOf(province)[0];
    if (coast !== undefined) S.loot.set(coast.id, S.loot.getOrDefault(coast.id, 0) + gold);
  }
  return b;
};

/** The name of a man rising in `province`: its holder's style, else the nearest court's. */
function localStyle(engine: TurnEngine, province: string, court: Power | null): (typeof Styles)[number] {
  const S = engine.s;
  const holder = court ?? S.owner.getOrDefault(province, null);
  const by = holder ?? sortBy([...AllPowers], [(p: Power) => engine.map.hops(engine.courtAt(p), province), cmpNum])[0];
  return Styles.find((st) => st.court === by) ?? Styles[0];
}

P.headRises = function (province, men, rose, rng, court = null) {
  const S = this.s;
  const style = localStyle(this, province, court);
  const base = rng.pick(style.names);
  const name = S.characters.some((x) => x.name === base) ? `${base} of ${this.map.get(province).name}` : base;
  // The circumstance picks the man: a mutiny's leader or a crowd's chief is bold and ambitious, a fallen court's scribe careful.
  const lean = rose === "refugees" ? { courage: -15, ambition: 0, loyalty: 15 } : rose === "successor" || rose === "split" ? { courage: 10, ambition: 15, loyalty: -10 } : { courage: 20, ambition: 15, loyalty: -15 };
  const c = newCharacter({
    id: newId(S, "c"),
    name,
    origin: this.map.get(province).name,
    calling: rose === "refugees" ? "scribe of a fallen court" : rose === "mutiny" ? "soldier" : "chief of the loose men",
    traits: newTraits({
      loyalty: clamp(rng.range(10, 80) + lean.loyalty, 0, 100),
      greed: rng.range(20, 95),
      competence: Math.min(rng.range(20, 95), rng.range(20, 95)),
      ambition: clamp(rng.range(20, 90) + lean.ambition, 0, 100),
      courage: clamp(rng.range(20, 90) + lean.courage, 0, 100),
    }),
  });
  const how: Record<Rose, string> = {
    crowd: `Rose among the loose men of ${this.map.get(province).name} and gathered them into a band.`,
    mutiny: `Led the mutineers of a king's army in ${this.map.get(province).name} when it broke.`,
    refugees: `Led the refugees of the fallen court of ${land(court ?? "Egypt")} at ${this.map.get(province).name}.`,
    successor: `Took over a band in ${this.map.get(province).name} when its chief was lost.`,
    split: `Walked off from a band in ${this.map.get(province).name} with the men who followed him.`,
    outlaw: `Took to the hills with the loose men of ${this.map.get(province).name}.`,
  };
  c.facts.push(newFact({ id: newId(S, "f"), text: how[rose], secrecy: "Public", tag: "rose" }));
  c.facts.push(newFact({ id: newId(S, "f"), text: rose === "refugees" ? `Speaks the tongue of ${land(court ?? "Egypt")}, and knows something of its court.` : "Speaks the tongue of the land he rose in.", secrecy: "Public", tag: "tongue" }));
  c.facts.push(newFact({ id: newId(S, "f"), text: "Rode with the Habiru.", secrecy: "Hidden", tag: "outlaw" }));
  c.arrived = S.turn;
  c.status = "Free";
  c.seeking = false;
  drawSkills(S.seed, c);
  chooseStrategy(c);
  c.persona = personaTemplate(c);
  S.characters.push(c);
  const b = newBand({ id: newId(S, "b"), leaderId: c.id, province, men, since: S.turn, rose });
  this.lead(c, b);
  S.bands.push(b);
  logEvent(S, "band", `${c.name} ${rose === "crowd" ? "rose among the loose men" : rose === "mutiny" ? "led mutineers" : rose === "refugees" ? "led refugees" : rose === "successor" ? "took over a band" : "split from a band"} in ${this.map.get(province).name}, with ${men} men.`, [], `band-${rose}`);
  return b;
};

declare module "./core.ts" {
  interface TurnEngine {
    lead(c: Character, b: Band): void;
    chiefLeaves(c: Character, province: string, why: string): void;
    dies(c: Character, where: string, how: string): void;
  }
}

P.lead = function (c, b) {
  c.duty = "Leading";
  // A new band: nothing he chose for another one holds.
  c.chiefPlan = null;
  c.at = null;
  c.watchProvince = b.province;
  c.lendOffer = null;
  c.seeking = false;
};

P.turnOutlaw = function (c, province) {
  const S = this.s;
  const x = this.peopleOf(province);
  const men = Math.min(x.loose, Math.max(BandData.least, idiv(x.loose * BandData.startShare, 100)), BandData.startMost);
  if (men < BandData.least) return;
  x.loose -= men;
  this.looseLeave(province, 0);
  const why = `${c.waited} seasons without work, ${c.purse} shekels left`;
  remember(c, S.turn, `I took to the hills with the loose men of ${this.map.get(province).name}: ${why}.`);
  if (!c.facts.some((f) => f.tag === "outlaw")) c.facts.push(newFact({ id: newId(S, "f"), text: "Rode with the Habiru.", secrecy: "Hidden", tag: "outlaw" }));
  const b = newBand({ id: newId(S, "b"), leaderId: c.id, province, men, since: S.turn, rose: "outlaw" });
  this.lead(c, b);
  S.bands.push(b);
  logEvent(S, "band", `${c.name} turned outlaw in ${this.map.get(province).name}, gathering ${men} men (${why}).`, [], "band-outlaw");
};

P.leaderLost = function (b, why) {
  const S = this.s;
  const rng = this.r("successor", b.id);
  const i = S.bands.indexOf(b);
  if (i >= 0) S.bands.splice(i, 1);
  if (b.men >= BandData.least && rng.chance(Math.min(90, BandData.successorPercent + idiv(b.men, 10)) / 100)) {
    const nb = this.headRises(b.province, b.men, "successor", rng);
    nb.ship = b.ship;
    logEvent(S, "band", `The band in ${this.map.get(b.province).name} lost its chief (${why}) and follows one of its own.`, []);
    return;
  }
  this.peopleOf(b.province).loose += b.men;
  logEvent(S, "band", `The band in ${this.map.get(b.province).name} lost its chief (${why}) and melted back into the loose men.`, [], "band-melted");
};

P.wayBack = function (b, why) {
  const S = this.s;
  const c = S.characters.find((x) => x.id === b.leaderId)!;
  S.bands.splice(S.bands.indexOf(b), 1);
  this.peopleOf(b.province).loose += b.men;
  logEvent(S, "band", `${c.name} gave up the road in ${this.map.get(b.province).name} (${why}); his men went back to the loose.`, [], "way-back");
  this.chiefLeaves(c, b.province, why);
};

P.chiefLeaves = function (c, province, why) {
  const S = this.s;
  c.leftRoad = S.turn;
  c.duty = "None";
  c.watchProvince = null;
  c.seeking = true;
  c.waited = 0;
  remember(c, S.turn, `I left the road in ${this.map.get(province).name}: ${why}.`);
  const courts = sortBy(alive(S), [(p: Power) => this.travelTurnsBetween(province, this.courtAt(p)), cmpNum], [(p: Power) => AllPowers.indexOf(p), cmpNum]);
  if (courts.length === 0) return;
  const to = courts[0];
  if (this.courtAt(to) === province) {
    c.at = to;
    c.lastLife = null;
    this.meet(c, to);
    return;
  }
  this.startTravel(c, to, null, province);
};

/**
 * A character dies of what the world holds, never of age ("No age in this game"): the road, plague or famine. Its master
 * goes on believing what it believed until the rumour of the death arrives from where it died.
 */
P.dies = function (c, where, how) {
  const S = this.s;
  const employer = c.status === "Employed" ? c.employer : null;
  if (employer !== null) this.coverFor(c, employer, c.duty === "Travelling" || c.duty === "Leading" ? "None" : c.duty);
  c.diedWith ??= c.purse + (c.hoard?.gold ?? 0);
  c.status = "Dead";
  c.duty = "None";
  c.owed.clear();
  c.lendOffer = null;
  c.seeking = false;
  const name = this.map.get(where).name;
  remember(c, S.turn, `I died ${how} in ${name}.`);
  logEvent(S, "death", `${c.name} died ${how} in ${name}.`, [], "death");
  // A chief's band is without him at once: it takes no more loot in his name.
  const band = this.bandOf(c);
  if (band !== null) this.leaderLost(band, "he is dead");
  const from = S.owner.getOrDefault(where, null) ?? employer;
  if (from !== null) for (const heard of AllPowers.filter((p) => p === employer || coverOf(c, p) !== null)) this.rumor(heard, from, `It is said that ${c.name} died ${how} in ${name}.`, c.id, "Death");
};

/**
 * The season of the bands, in the people's season after the loose men robbed: chiefs rise from the crowds, the holders'
 * armies hunt the bands where they stand by order, each band robs, pays and feeds its men, grows or shrinks, splits, turns on its
 * chief, moves to richer land, buys a ship, or its chief gives up the road. Returns each holder's lines.
 */
P.bandsSeason = function () {
  const S = this.s;
  const Map = this.map;
  const lines = new Dict<Power, string[]>();
  const say = (p: Power | null, text: string): void => {
    if (p !== null && isAlive(S, p)) lines.set(p, [...lines.getOrDefault(p, []), text]);
  };
  const near = (prov: string): number => S.bands.filter((b) => b.province === prov || Map.neighbors(prov).includes(b.province)).length;
  const policed = (prov: string): boolean => {
    const holder = S.owner.getOrDefault(prov, null);
    return holder !== null && S.units.some((u) => u.province === prov && u.power === holder);
  };

  // A crowd of loose men in land policed too little raises a chief, more readily the larger it is, less where a band works.
  for (const prov of Map.landProvinces) {
    const x = this.peopleOf(prov.id);
    if (x.loose < BandData.crowd || policed(prov.id)) continue;
    const rng = this.r("heads", prov.id);
    const chance = Math.min(BandData.riseMost, 1 + idiv(x.loose - BandData.crowd, BandData.riseScale)) / (1 << Math.min(10, near(prov.id)));
    if (!rng.chance(chance / 100)) continue;
    const men = Math.min(BandData.startMost, idiv(x.loose * BandData.startShare, 100));
    x.loose -= men;
    this.looseLeave(prov.id, 0);
    const b = this.headRises(prov.id, men, "crowd", rng);
    say(S.owner.getOrDefault(prov.id, null), `A chief, ${S.characters.find((c) => c.id === b.leaderId)!.name}, has gathered ${men} loose men into a band in ${prov.name}.`);
  }

  for (const b of sortBy([...S.bands], [(x: Band) => idNumber(x.id), cmpNum])) {
    if (!S.bands.includes(b)) continue;
    const chief = S.characters.find((c) => c.id === b.leaderId) ?? null;
    if (chief === null || chief.status !== "Free" || chief.duty !== "Leading") {
      this.leaderLost(b, chief === null || chief.status === "Dead" ? "he is dead" : "he is gone");
      continue;
    }
    // A chief who decided last season (a model, in his own request) does as he chose; the script's traits decide the rest.
    const own = this.chiefDecides(b, chief);
    if (own === "gone") continue;
    const prov = Map.get(b.province);
    const holder = S.owner.getOrDefault(b.province, null);
    const rng = this.r("band", b.id);

    // Hunted (Haakon's answers to item 11b: only on its king's order, for this season or standing): the holder's army
    // standing in its province falls on it; it loses men, may lose its chief, and flees.
    const standing = holder === null ? null : huntNow(S, holder);
    const ordered = holder !== null && ((standing !== null && huntCovers(S, standing, b.province)) || S.huntNow.includes(`${holder}|${b.province}`));
    const hunters = ordered ? S.units.filter((u) => u.province === b.province && u.kind === "Army" && u.power === holder) : [];
    if (hunters.length > 0 && holder !== null) {
      const army = sum(hunters, (u) => u.men);
      const lost = Math.min(b.men, idiv(idiv(b.men * BandData.huntLoss, 100) * army, army + b.men) + 1);
      b.men -= lost;
      const hunter = sortBy(hunters, [(u) => idNumber(u.id), cmpNum])[0];
      hunter.men = Math.max(1, hunter.men - idiv(lost, 4));
      const taken = rng.chance(BandData.captureChief / 100);
      remember(chief, S.turn, `${land(holder)}'s army fell on my band in ${prov.name}: ${lost} of my men were lost.`);
      logEvent(S, "band", `${holder}'s army fell on ${chief.name}'s band in ${prov.name}: ${lost} men lost${taken ? ", and the chief taken" : ""}.`, [holder], "band-hunted");
      if (taken) {
        say(holder, `Your army in ${prov.name} fell on ${chief.name}'s band, killing or scattering ${lost} men, and took the chief captive: you may execute, question or release him (nobody would ransom him).`);
        chief.status = "Captured";
        chief.heldBy = holder;
        chief.at = holder;
        chief.duty = "None";
        chief.watchProvince = null;
        chief.intercepted = true;
        this.meet(chief, holder);
        this.leaderLost(b, "taken captive");
        continue;
      }
      say(holder, `Your army in ${prov.name} fell on ${chief.name}'s band, killing or scattering ${lost} men.`);
      const away = sortBy(
        Map.movesFrom("Army", b.province).filter((n) => !Map.get(n).isSea && !S.units.some((u) => u.province === n && u.kind === "Army")),
        [(n: string) => n, cmpStr],
      );
      // Haakon's answers to item 11b+: the hunted chief chooses where to flee, weighing where he would be hunted again: a
      // model chief where his own request said to go, if it is open to him; a script chief away from land he heard is
      // under a standing hunt, if he can.
      const plan = chief.chiefPlan;
      const safer = away.filter((n) => !this.huntHeard(b.province, n));
      if (plan !== null && plan.go !== null && away.includes(plan.go)) b.province = plan.go;
      else if (safer.length > 0) b.province = rng.pick(safer);
      else if (away.length > 0) b.province = rng.pick(away);
      chief.watchProvince = b.province;
      if (b.men < BandData.least) {
        this.wayBack(b, "his band was broken");
        continue;
      }
    }

    // It robs its province: organised men take more than the same number loose, halved where the holder's troops stand,
    // and only the countryside outside a besieged city's walls. A hired band would spare its master: no band is hired yet.
    const here = Map.get(b.province);
    const m = this.market(b.province);
    const rate = (of: number): number => {
      const t = idiv(of * BandData.robPermille * b.men, 1000 * (b.men + BandData.robHalf));
      return policed(b.province) ? idiv(t * LandData.policedPercent, 100) : t;
    };
    const besieged = siegeOf(S, b.province) !== null;
    const gold = besieged ? 0 : rate(m.purse);
    const grain = besieged ? 0 : rate(this.stores(b.province));
    const country = besieged ? rate(S.granary.getOrDefault(b.province, 0)) : 0;
    if (gold > 0) m.purse -= gold;
    if (grain > 0) this.takeFromStores(b.province, grain);
    if (country > 0) S.granary.set(b.province, S.granary.get(b.province) - country);
    const take = gold + grainWorth(grain + country) + b.take;
    if (gold + grain + country > 0) say(holder, `${chief.name}'s band robbed ${here.name}: ${gold} shekels from its people's purse${grain > 0 ? `, ${grain} measures from your stores` : ""}${country > 0 ? `, ${country} measures from the farmers' granaries` : ""}.`);
    // The grain it eats; what it robbed of gold, and on the roads, is the chief's, who pays his men from it.
    gain(chief, gold, "Loot");
    const cost = bandCost(b.men);
    const food = Math.ceil(cost / 2);
    const fed = Math.min(food, grainWorth(grain + country));
    const pay = cost - fed;
    // The grain it took beyond its food is sold where it stands, before the men are paid.
    const spare = grain + country - fed;
    if (spare > 0 && !prov.isSea) {
      m.stock += spare;
      const worth = Math.min(m.purse, idiv(spare * priceAt(m.stock, needOf(here)), 100));
      m.purse -= worth;
      gain(chief, worth, "Loot");
    }
    const paid = Math.min(pay, chief.purse);
    chief.purse -= paid;
    chief.earned.spent += paid;
    // Its men spend their share where they stand.
    this.spendAt(b.province, paid);
    b.cost = cost;
    const surplus = take - cost;
    b.take = 0;

    if (paid < pay) {
      // Short: men leave, and in the end turn on their chief, or a large band splits.
      b.short++;
      // As many leave as went unpaid, at most a share a season.
      const leave = Math.max(1, Math.min(idiv(b.men * BandData.leavePercent, 100), Math.ceil((b.men * (pay - paid)) / Math.max(1, pay))));
      if (b.men >= BandData.splitMen && rng.chance(0.5)) {
        const n = idiv(b.men * BandData.splitPercent, 100);
        b.men -= n;
        this.headRises(b.province, n, "split", rng);
        remember(chief, S.turn, `${n} of my men walked off behind one of their own in ${here.name}.`);
      } else {
        b.men -= leave;
        this.peopleOf(b.province).loose += leave;
      }
      // A large band long unpaid turns on its chief; a small one just drifts away from him.
      if (b.short >= BandData.shortMutiny && b.men >= BandData.splitMen) {
        // They take what he has and go their way, or follow one of their own.
        remember(chief, S.turn, `My men turned on me in ${here.name}: they had not been paid.`);
        const robbed = chief.purse;
        chief.purse = 0;
        chief.earned.spent += robbed;
        this.spendAt(b.province, robbed);
        S.bands.splice(S.bands.indexOf(b), 1);
        this.chiefLeaves(chief, b.province, "my men turned on me");
        S.bands.push(b);
        this.leaderLost(b, "his men turned on him");
        continue;
      }
    } else {
      b.short = 0;
      // Men join while it pays: as many of the loose here as its surplus, less the chief's share, could pay a season.
      const cut = BandData.chiefCut.least + idiv((BandData.chiefCut.most - BandData.chiefCut.least) * chief.traits.greed, 100);
      const spareGold = idiv(Math.max(0, surplus) * (100 - cut), 100);
      const could = idiv(spareGold * 1000, BandData.menCost);
      const x = this.peopleOf(b.province);
      const join = Math.min(x.loose, idiv(could * BandData.joinPercent, 100));
      if (join > 0) {
        x.loose -= join;
        b.men += join;
        this.looseLeave(b.province, 0);
      }
    }
    if (b.men < BandData.least) {
      this.wayBack(b, "too few men followed him");
      continue;
    }

    // The chief's choices, a script chief's by formula ("Bold or careful, one goal"): the way back, a ship, or richer land.
    if (own) continue;
    if (b.men <= BandData.wayBack && !chief.bold && rng.chance(0.5)) {
      this.wayBack(b, "his band had dwindled");
      continue;
    }
    if (chief.purse >= BandData.shipCost * 2 && chief.traits.courage >= 50) this.buyShip(b, chief);
    const pickings = (id: string): number => {
      const mk = this.market(id);
      const worth = mk.purse + grainWorth(this.stores(id)) + 1;
      const rivals = sum(
        S.bands.filter((o) => o !== b && o.province === id),
        (o) => o.men,
      );
      const guarded = S.units.some((u) => u.province === id && u.kind === "Army") ? (chief.bold ? 3 : 6) : 1;
      return idiv(worth * 1000, (rivals + b.men + BandData.robHalf) * guarded);
    };
    // A script chief keeps out of land he heard is under a standing hunt (Haakon's answers to item 11b+).
    const best = sortBy(
      Map.movesFrom("Army", b.province).filter((n) => !Map.get(n).isSea && !this.huntHeard(b.province, n)),
      [(n: string) => -pickings(n), cmpNum],
      [(n: string) => n, cmpStr],
    )[0];
    if (best !== undefined && pickings(best) * 10 > pickings(b.province) * 13) {
      b.province = best;
      chief.watchProvince = best;
      if (!Map.get(best).isCoastal) b.ship = false;
    }
  }

  // Bands in the same province compete for men: a weaker one's men go over to the one that pays them better.
  for (const prov of [...new Set(S.bands.map((b) => b.province))].sort(cmpStr)) {
    const here = sortBy(this.bandsAt(prov), [(b: Band) => -b.men, cmpNum], [(b: Band) => idNumber(b.id), cmpNum]);
    if (here.length < 2) continue;
    const top = here[0];
    for (const b of here.slice(1)) {
      if (b.short === 0 || top.short > 0) continue;
      const n = idiv(b.men * BandData.leavePercent, 100);
      b.men -= n;
      top.men += n;
    }
  }
  // The hunts ordered for this season are done.
  S.huntNow = [];
  return lines;
};

export const BandsTitle = "Bands";

declare module "./core.ts" {
  interface TurnEngine {
    /** Each season: the people standing where plague or famine strikes may die of it ("Natural losses"). */
    naturalLosses(): void;
  }
}

/** First guesses: the chance in a hundred a season that a person standing where plague strikes dies of it, or where the people starve. */
export const LossData = { plague: 5, famine: 2, starving: 500 } as const;

P.naturalLosses = function () {
  const S = this.s;
  for (const c of sortBy(
    S.characters.filter((c) => c.status !== "Dead"),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    // Envoys at an audience, travellers and captives under guard are left to their own perils.
    if (c.duty !== "None" && c.duty !== "Leading" && c.duty !== "SpyPosted") continue;
    const where = c.at !== null ? this.courtAt(c.at) : c.watchProvince;
    if (where === null) continue;
    const plague = S.catastrophes.some((x) => x.kind === "Plague" && x.startTurn <= S.turn && x.endTurn >= S.turn && (x.province === where || (x.province === null && S.owner.getOrDefault(where, null) === x.power)));
    const starving = S.fed.getOrDefault(where, 1000) < LossData.starving;
    const odds = (plague ? LossData.plague : 0) + (starving ? LossData.famine : 0);
    if (odds <= 0 || !this.r("natural-loss", c.id).chance(odds / 100)) continue;
    this.dies(c, where, plague ? "of the plague" : "of hunger");
  }
};

/**
 * Haakon's answers to item 11b: robbers choose whether to kill a traveller, with no fixed odds. A chief weighs the witness
 * (a king's servant would name him to his king, a free man to whoever pays for news) against being hunted for murder (the
 * land's king hunts bands, or has an army there or next door): a ruthless chief (disloyal or greedy) kills a witness when
 * nobody is hunting him there; a careful one never does. A model chief chooses in his own request (`own-choices.ts`).
 */
P.chiefKills = function (b, victim, province) {
  const S = this.s;
  const chief = S.characters.find((x) => x.id === b.leaderId) ?? null;
  if (chief === null) return false;
  // A chief who chose whom his band kills (a model, in his own request) is held to his choice.
  if (chief.chiefPlan !== null) return killsByChoice(chief.chiefPlan.kill, victim);
  const ruthless = chief.traits.loyalty < 40 || chief.traits.greed > 70;
  // Haakon's answers to item 11b+: every traveller is a witness who can name his robbers. The ruthless chief silences him
  // where he would not be hunted for the murder: no army of the land's king in or next to the province, and no standing
  // hunt over it that talk has brought him word of.
  const holder = S.owner.getOrDefault(province, null);
  const near = new Set([province, ...this.map.neighbors(province)]);
  const hunted = holder !== null && (S.units.some((u) => u.power === holder && u.kind === "Army" && near.has(u.province)) || this.huntHeard(b.province, province));
  return ruthless && !hunted;
};

P.robbersNamed = function (victim, b, province) {
  const S = this.s;
  const chief = S.characters.find((x) => x.id === b.leaderId) ?? null;
  if (chief === null) return;
  let f = chief.facts.find((x) => x.tag === "outlaw");
  if (f === undefined) chief.facts.push((f = newFact({ id: newId(S, "f"), text: "Rode with the Habiru.", secrecy: "Hidden", tag: "outlaw" })));
  const holder = this.map.get(province).isSea ? null : S.owner.getOrDefault(province, null);
  const from = holder ?? victim.employer;
  if (from === null || !isAlive(S, from)) return;
  const text = `${victim.name} was robbed in ${this.map.get(province).name} in season ${S.turn} by the band of ${chief.name}, and names him.`;
  logEvent(S, "band", `${victim.name} named ${chief.name} as his robber.`, [], "robbers-named");
  for (const to of [...new Set([holder, victim.employer])])
    if (to !== null && isAlive(S, to) && !f.knownBy.includes(to)) {
      this.rumor(to, from, text, chief.id, "Name", f.id);
      // The word sets out from where he was robbed, not from a capital.
      S.journeys[S.journeys.length - 1].arriveTurn = S.turn + this.travelTurnsBetween(province, this.courtAt(to));
    }
};

P.huntHeard = function (at, target) {
  const S = this.s;
  return S.hunts.some((h) => {
    if (!huntCovers(S, h, target) || !isAlive(S, h.power)) return false;
    const road = this.travelTurnsBetween(this.courtAt(h.power), at);
    // Heard of once its talk has come, until talk of its lifting comes.
    return S.turn >= h.since + road && (h.until === null || S.turn < h.until + road);
  });
};

