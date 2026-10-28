/**
 * Walls and sieges (Build order item 5, the siege package; question 5 of `docs/rounds/2026-10-18-sleep-and-simulation.md`,
 * plan steps 1 to 9). Walls set how long a city holds out, not how many armies a field battle needs: combat resolves as
 * always, and a move that wins its way into a walled province its mover does not hold either storms the walls (its
 * strength beats their level and the defenders it beat together) and takes the province at once, or stands inside and
 * takes nothing. An army standing within walls may then besiege the city: each season it holds there the city is worn down
 * a step, two with an uncut support. Since item 9+a the walls price the storm, not the clock ("How long a siege lasts"):
 * the city eats from its market and stores (townsEat in economy.ts), refilled only by ships of its king's while its waters
 * are open (item 9+b), and surrenders once it
 * cannot feed its people, or when the wear reaches EconomyData.breachPerLevel seasons for each level of its walls; either
 * way its walls fall a level.
 */
import { Dict, HSet } from "../core/collections.ts";
import { clamp, roundEven, toInt } from "../core/num.ts";
import { cmpNum, count, distinct, sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { groundText, isIslandWater, waterSeasons } from "../model/geography.ts";
import { StartWalls } from "../model/map.ts";
import { EconomyData } from "../model/economy.ts";
import type { Dispatch, HomeCargo } from "../model/records.ts";
import { newLossAbroad, newTabletCopy } from "../model/records.ts";
import type { FortifyOrder } from "../model/orders.ts";
import { stormed, strengthWords, type Assault } from "../model/outcomes.ts";
import { LandData, menAvailable } from "../model/land.ts";
import { remember, type Character } from "../model/people.ts";
import { AllPowers, cmpPower, land, type Power } from "../model/power.ts";
import { isAlive, logEvent, newGoldLot, newId, newSiege, notify, siegeOf, unitAt, wallsOf, type Siege } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import type { ValidationResult } from "../rules/validator.ts";
import { Views } from "../rules/views.ts";
import { removeAll } from "./resolve.ts";
import { TurnEngine } from "./core.ts";
import { learn } from "../rules/skills.ts";
import { openToSea } from "./trade.ts";

/** The notice of the season's sieges: those a court presses, and those of its cities. */
export const SiegesTitle = "Sieges";

/** The notice to a besieger whose troops caught an envoy at the city it besieges. */
export const EnvoyCaughtTitle = "An envoy is caught";

declare module "./core.ts" {
  interface TurnEngine {
    fortify(p: Power, f: FortifyOrder): void;
    lowerWalls(province: string): void;
    liftSiegesOf(unitId: string): void;
    liftLostSieges(): void;
    stands(x: Siege): boolean;
    sieges(valid: Dict<Power, ValidationResult>): void;
    capitalSiege(p: Power): [Siege, number] | null;
    tightness(x: Siege): number;
    caughtByBesiegers(c: Character, tightness: number): boolean;
    intercept(c: Character, lord: Power, siege: Siege, leaving: boolean, dispatch: Dispatch | null, cargo: HomeCargo | null, due: number): void;
    seize(c: Character, lord: Power, captor: Power, dispatch: Dispatch | null, cargo: HomeCargo | null, source: string): string[];
    surrender(x: Siege, owner: Power | null, tell: (p: Power | null, line: string) => void, how: "hunger" | "thirst" | "breach"): void;
    assaultText(a: Assault): string;
    ownWallsText(a: Assault): string;
  }
}

const P = TurnEngine.prototype;

/**
 * Walls strengthened (FortifyOrder): a level higher at the end of the season, paid now, unless the province was lost in
 * movement, is besieged, or has foreign troops within it after movement, which others brought about (a scheduled order
 * then wakes its seat).
 */
P.fortify = function (p, f) {
  const S = this.s;
  const name = this.map.get(f.province).name;
  const within = unitAt(S, f.province);
  const why =
    S.owner.getOrDefault(f.province, null) !== p
      ? "you no longer held it after movement"
      : siegeOf(S, f.province) !== null
        ? "it was besieged"
        : within !== null && within.power !== p
          ? "foreign troops stood within it after movement"
          : wallsOf(S, f.province) >= S.config.maxWalls
            ? "its walls stood as high as walls go"
            : null;
  if (why !== null) {
    this.failed(p, f, "Walls not strengthened", `The walls of ${name} were not strengthened: ${why}. No gold was paid.`, why, true);
    return;
  }
  const level = wallsOf(S, f.province) + 1;
  if (!this.pay(p, S.config.fortifyCost * level, `the walls of ${name}`, f, "they were not strengthened")) return;
  // The builders are the province's own people: their pay goes into its purse (item 9+a, "What fills a people's purse").
  this.spendAt(f.province, S.config.fortifyCost * level);
  S.walls.set(f.province, level);
  // The corvée: the province's men build them, away from its next harvest (item 10+a).
  S.corvee.set(f.province, S.corvee.getOrDefault(f.province, 0) + Math.min(LandData.builders, menAvailable(S, f.province)));
  const above = level - (StartWalls.get(f.province) ?? 0);
  notify(
    S,
    p,
    "Resolution",
    "Walls strengthened",
    `The walls of ${name} stand at level ${level} now` + (above > 0 ? `; the ${above} level${above === 1 ? "" : "s"} above its old walls cost ${formatMoney(above * S.config.wallUpkeep)} a season.` : "."),
  );
  logEvent(S, "fortify", `${p} strengthened the walls of ${name} to level ${level}.`, AllPowers.filter((x) => x === p || Views.sight(S, this.map, x).has(f.province)), "fortify");
};

/** The walls of a province fall a level (to none from level 1). */
P.lowerWalls = function (province) {
  const level = wallsOf(this.s, province) - 1;
  if (level > 0) this.s.walls.set(province, level);
  else this.s.walls.delete(province);
};

/** A unit that is gone lifts any siege it pressed. */
P.liftSiegesOf = function (unitId) {
  removeAll(this.s.sieges, (x) => x.unitId === unitId);
};

/** Sieges whose army no longer stands in the city for its king, or whose city its besieger now holds, are over. */
P.liftLostSieges = function () {
  removeAll(this.s.sieges, (x) => !this.stands(x));
};

/** Whether a siege still stands: its army is in the city, still its king's, and the city's walls are another's. */
P.stands = function (x) {
  const S = this.s;
  return S.units.some((u) => u.id === x.unitId && u.power === x.power && u.province === x.province) && S.owner.getOrDefault(x.province, null) !== x.power && wallsOf(S, x.province) > 0;
};

/**
 * After movement: sieges whose army left or was destroyed are lifted, and their progress lost; each besiege order whose
 * army still stands within the walls begins a siege; each siege whose army held there this season (it was ordered to hold
 * or besiege, or given no order) wears the city down a step, two if a support to hold was given to the army and not cut;
 * and a city worn down to the level of its walls surrenders to the besieger, its walls a level lower. Each court reads the
 * season's sieges, its own and those of its cities, in one notice.
 */
P.sieges = function (valid) {
  const S = this.s;
  const Map = this.map;
  const news = new Dict<Power, string[]>();
  const tell = (p: Power | null, line: string): void => {
    if (p === null || !isAlive(S, p)) return;
    let lines = news.tryGet(p);
    if (!lines) news.set(p, (lines = []));
    lines.push(line);
  };

  for (const x of [...S.sieges]) {
    if (this.stands(x)) continue;
    S.sieges.splice(S.sieges.indexOf(x), 1);
    const name = Map.get(x.province).name;
    const owner = S.owner.getOrDefault(x.province, null);
    const unit = S.units.find((u) => u.id === x.unitId) ?? null;
    const why =
      unit === null || unit.power !== x.power
        ? "the besieging army is gone"
        : unit.province !== x.province
          ? "the besieging army marched out"
          : owner === x.power
            ? `${name} is now ${x.power}'s`
            : `the walls of ${name} are down`;
    tell(x.power, `Your siege of ${name} is lifted: ${why}. A new siege starts again from the beginning.`);
    if (owner !== x.power) tell(owner, `${x.power}'s siege of your city of ${name} is lifted: ${why}.`);
    logEvent(S, "siege", `${x.power}'s siege of ${name} was lifted.`, parties(x.power, owner));
  }

  for (const p of AllPowers.filter((p) => valid.has(p)))
    for (const b of valid.get(p).accepted) {
      if (b.type !== "besiege") continue;
      // An army destroyed this season besieges nothing; one already besieging presses on below.
      const unit = unitAt(S, b.unit);
      if (unit === null || unit.power !== p || S.sieges.some((x) => x.unitId === unit.id)) continue;
      const owner = S.owner.getOrDefault(b.unit, null);
      if (owner === p || wallsOf(S, b.unit) <= 0) continue;
      S.sieges.push(newSiege({ province: b.unit, power: p, unitId: unit.id, since: S.turn }));
      logEvent(S, "siege", `${p} laid siege to ${Map.get(b.unit).name}${owner !== null ? `, held by ${owner}` : ""}.`, parties(p, owner), "siege-begun");
    }

  for (const x of sortBy(S.sieges, [(x: Siege) => x.since, cmpNum], [(x: Siege) => x.province, cmpStr])) {
    const name = Map.get(x.province).name;
    const owner = S.owner.getOrDefault(x.province, null);
    const walls = wallsOf(S, x.province);
    // Walls price the storm, not the clock (item 9+a): they are breached after this much wear.
    const breach = walls * EconomyData.breachPerLevel;
    const begun = x.since === S.turn;
    // Stores and mouths are the clock: a city that could not feed its mouths as the season began surrenders.
    if (!begun && S.starving.includes(x.province)) {
      this.surrender(x, owner, tell, "hunger");
      continue;
    }
    // And water (item 10+b, "Water too"; by the water dossier since 11a+): a city that has drunk its cisterns dry holds no longer, whatever its food; an
    // island without water of its own runs dry once its besieger's fleet holds its waters.
    const island = isIslandWater(x.province);
    if (island) x.blockaded = openToSea(this, x.province) ? 0 : x.blockaded + 1;
    const drinking = island ? (x.blockaded > 0 ? waterSeasons(x.province) : Infinity) : waterSeasons(x.province);
    if (!begun && (island ? x.blockaded > drinking : S.turn - x.since >= drinking)) {
      this.surrender(x, owner, tell, "thirst");
      continue;
    }
    // Only an army that held there presses the siege: one that tried to march out, or gave a support or convoy, did not.
    const order = this._unitOrdersNow.tryGet(x.province);
    if (!(order === undefined || order.type === "hold" || order.type === "besiege")) {
      tell(x.power, `Your army in ${x.province} did not hold there, so the siege of ${name} (walls ${walls}) did not advance: it stands at ${x.progress} of ${breach}.`);
      tell(owner, `${x.power}'s army besieging your city of ${name} did not press the siege this season: it stands at ${x.progress} of ${breach}.`);
      continue;
    }
    const supported = this._battle?.holdSupported.has(x.province) === true;
    // A coastal city is supplied by sea unless a fleet of its besieger holds its waters (build order item 7a, "Finer seas").
    const waters = Map.get(x.province).waters;
    const blockaded = waters !== null && S.units.some((u) => u.province === waters && u.kind === "Fleet" && u.power === x.power);
    const supplied = waters !== null && !blockaded && S.config.seaSupply > 0;
    const steps = Math.max(0, (supported ? 2 : 1) - (supplied ? S.config.seaSupply : 0));
    if (waters !== null && S.config.seaSupply > 0) logEvent(S, "siege", `${name} was ${supplied ? "supplied by sea" : "blockaded"} while besieged by ${x.power}.`, parties(x.power, owner), supplied ? "sea-supplied" : "blockade");
    if (steps === 0) {
      tell(x.power, `Your siege of ${name} (walls ${walls}) did not advance: no fleet of yours holds ${Map.get(waters!).name}, so the city was supplied by sea and not worn down; it still eats from its stores. It stands at ${x.progress} of ${breach}.`);
      tell(owner, `${x.power}'s army besieges your city of ${name} (walls ${walls}), but no fleet of ${x.power}'s holds ${Map.get(waters!).name}: the city was supplied by sea and was not worn down. It stands at ${x.progress} of ${breach}. The city yields you nothing while it is besieged and eats from its market and stores; while its waters are open, your ships can bring it grain (order ship), and merchants' ships may sell it grain at what its market pays.`);
      continue;
    }
    x.progress += steps;
    if (x.progress >= breach) {
      this.surrender(x, owner, tell, "breach");
      continue;
    }
    const how =
      (steps === 2 ? "two steps, with a support" : supported ? "a step, with a support" : "a step") +
      (supplied ? ", though the city was supplied by sea" : blockaded && S.config.seaSupply > 0 ? ", with its harbour blockaded" : "");
    // Its water, as anyone who knows the place knows it (item 10+b).
    const water =
      drinking === Infinity
        ? isIslandWater(x.province)
          ? " Its water comes by boat while its waters are open."
          : " Its water never fails."
        : ` Its water lasts ${Math.max(0, island ? drinking - x.blockaded + 1 : x.since + drinking - S.turn)} more season(s) of siege.`;
    tell(
      x.power,
      `${begun ? "Your siege of" : "The siege of"} ${name} (walls ${walls}${owner !== null ? `, held by ${owner}` : ", a free city"}) ${begun ? "has begun, and it " : ""}wore the city down ${how}: it stands at ${x.progress} of ${breach}. The walls are breached and the city falls when that reaches ${breach}, if your army holds there, or sooner when its food runs out: a besieged city eats from its market and stores, and surrenders once it cannot feed its people.${water}`,
    );
    tell(
      owner,
      `${x.power}'s army ${begun ? "has laid siege to" : "besieges"} your city of ${name} (walls ${walls}) and wore it down ${how}: it stands at ${x.progress} of ${breach}. The city yields you nothing while it is besieged and eats from its market and stores; it surrenders when its food runs out or the wear reaches ${breach}, unless the besieging army is driven out or leaves.${water}`,
    );
  }

  for (const [p, lines] of sortBy(news.entries(), [([k]: [Power, string[]]) => k, cmpPower])) notify(S, p, "Battle", SiegesTitle, lines.map((l) => "- " + l).join("\n"));
};

/**
 * The siege of a king's own capital, if one is under way, with its tightness: the besieger's units in the city and next
 * to it (any kind of link), from 1 to 3.
 */
P.capitalSiege = function (p) {
  const S = this.s;
  const capital = this.map.capital(p).id;
  const siege = siegeOf(S, capital);
  if (S.owner.getOrDefault(capital, null) !== p || siege === null) return null;
  return [siege, this.tightness(siege)];
};

/** A siege's tightness: the besieger's units in the city and next to it, from 1 to 3. */
P.tightness = function (x) {
  const near = new HSet([...this.map.neighbors(x.province), x.province]);
  return clamp(
    count(this.s.units, (u) => u.power === x.power && near.has(u.province)),
    1,
    3,
  );
};

/**
 * The besiegers' roll for an envoy slipping out of, or into, its king's besieged capital: a chance in percent of 20 × the
 * tightness − its skill ÷ 4, between 5 and 75 (first guesses: question 5, plan step 12).
 */
P.caughtByBesiegers = function (c, tightness) {
  const S = this.s;
  const chanceAt = (skill: number): number => clamp(S.config.siegeCatchPerUnit * tightness - Math.trunc(skill / 4), S.config.siegeCatchMin, S.config.siegeCatchMax) / 100.0;
  const caught = this.r("siege-envoy", c.id).chance(chanceAt(c.skills.stealth));
  // Slipping past the besiegers, or not, is an outcome the envoy learns from (item 10, "Seeing oneself").
  learn(c, "stealth", !caught, (b) => 1 - chanceAt(b));
  return caught;
};

/**
 * An envoy caught by the besiegers of its king's capital, leaving with a letter or coming home with what it brings: it is
 * the besieger's captive (who may execute, ransom or release it, not turn it). The besieger reads the letter and the
 * mandate, takes the gold and keeps the tablets it carried; its king goes on believing it on its way, and hears only, a
 * season after it was due, that it has not returned.
 */
P.intercept = function (c, lord, siege, leaving, dispatch, cargo, due) {
  const S = this.s;
  const besieger = siege.power;
  const city = this.map.get(siege.province).name;
  // What its king believed of it a moment before: on its way out, or on the road home.
  this.coverFor(c, lord, leaving ? "EnvoyOutbound" : "EnvoyHomebound");
  this.meet(c, besieger);
  this.outcome(c, besieger, `Was caught by the besiegers of ${city} (season ${S.turn}).`, false);
  c.status = "Captured";
  c.heldBy = besieger;
  c.at = besieger;
  c.duty = "None";
  c.missionTarget = null;
  c.watchProvince = null;
  c.intercepted = true;
  const trail = this.trail(dispatch?.trailId ?? cargo?.trailId ?? null);
  trail?.outcomes.push(`caught ${leaving ? "leaving" : "coming home to"} ${city} by ${besieger}'s besiegers`);
  const lines = this.seize(c, lord, besieger, dispatch, cargo, `taken from ${c.name}, envoy of ${lord}, caught at ${city}`);
  const said =
    dispatch !== null
      ? `leaving the city for the court of ${trail?.to ?? ""}. The letter he was to speak: "${dispatch.letter}"` + (dispatch.mandate.length > 0 ? ` His mandate: "${dispatch.mandate}"` : "")
      : `coming home to the city from the court of ${trail?.to ?? "abroad"}.`;
  notify(
    S,
    besieger,
    "Notice",
    EnvoyCaughtTitle,
    `Your troops besieging ${city} caught ${c.name}, envoy of ${lord}, ${said} ${lines.join(" ")} He is your captive: you may execute, ransom or release him.`.replaceAll("  ", " "),
    c.id,
  );
  remember(c, S.turn, `${land(besieger)}'s besiegers caught me ${leaving ? "slipping out of" : "slipping back into"} ${city}.`);
  logEvent(S, "siege", `${besieger}'s besiegers caught ${c.name}, envoy of ${lord}, ${leaving ? "leaving" : "coming home to"} ${city}.`, [besieger], "envoy-caught");
  // The talk of the court that holds it, for envoys and spies there to carry home: whose envoy, plainly.
  S.losses.push(newLossAbroad({ turn: S.turn, kind: "Captured", characterId: c.id, court: besieger, master: lord }));
  this.overdue(lord, c, trail?.to ?? besieger, due);
};

/** The besieger and, if the city has one, its holder: who reads of a siege in the record. */
function parties(besieger: Power, owner: Power | null): Power[] {
  return owner !== null ? [besieger, owner] : [besieger];
}

/** A besieged city surrenders to its besieger, starved or its walls breached, its walls a level lower. */
P.surrender = function (x, owner, tell, how) {
  const S = this.s;
  const prov = x.province;
  const name = this.map.get(prov).name;
  const seasons = S.turn - x.since + 1;
  S.sieges.splice(S.sieges.indexOf(x), 1);
  this.lowerWalls(prov);
  this.setOwner(prov, x.power);
  this.takenByForce(prov, x.power);
  this.sack(prov, x.power, false);
  // The siege's dead and the runaways among the townspeople (item 10+a).
  this.killSettled(prov, LandData.stormDead * 10, LandData.stormDead * 10);
  const w = wallsOf(S, prov);
  const left = w > 0 ? `walls ${w}` : "no walls";
  const why = how === "hunger" ? "its food gone" : how === "thirst" ? "its water gone" : "its walls breached";
  if (how === "hunger") logEvent(S, "siege", `${name} was starved into surrender by ${x.power}.`, parties(x.power, owner), "siege-starved");
  if (how === "thirst") logEvent(S, "siege", `${name} ran out of water and surrendered to ${x.power}.`, parties(x.power, owner), "siege-thirst");
  tell(x.power, `${name} surrendered to you after a siege of ${seasons} season${seasons === 1 ? "" : "s"}, ${why}: it is yours, with its walls a level lower (${left}).`);
  if (owner !== null) {
    notify(S, owner, "Battle", "Land lost", `${name} has surrendered to ${x.power} after a siege of ${seasons} season${seasons === 1 ? "" : "s"}, ${why}.`);
    logEvent(S, "conquest", `${x.power} took ${name} from ${owner}.`, [x.power, owner]);
  }
  notify(S, x.power, "Battle", "Land taken", `${name} is now yours.`);
  logEvent(
    S,
    "siege",
    `${name} surrendered to ${x.power} after a siege of ${seasons} season${seasons === 1 ? "" : "s"}.`,
    AllPowers.filter((p) => p === x.power || p === owner || Views.sight(S, this.map, p).has(prov)),
    "siege-won",
  );
  // A court's capital holds its archive: whoever takes it gains a copy of every tablet in it.
  this.takeArchive(x.power, prov);
};

/** What a king reads of his own move that got within walls he does not hold: whether it stormed them, with the strengths. */
P.assaultText = function (a) {
  const strengths = `strength ${strengthWords(a.strength)} against walls ${strengthWords(a.walls)} and defenders ${strengthWords(a.defenders)}${groundShare(a)}`;
  if (stormed(a)) return `it stormed the walls of ${a.province} (${strengths}), and ${a.province} is yours`;
  if (a.kind === "Fleet") return `your fleet stands within the walls of ${a.province} (walls ${strengthWords(a.walls)}), but a fleet can neither storm walls nor besiege them, so it takes nothing`;
  return `it got within the walls of ${a.province} but did not storm them (${strengths}): your army stands inside and takes nothing; besiege the city to wear it down`;
};

/** The ground's share of the defenders' strength in an assault on walls, if it had one (", 1 of it for the rough ground of lukka"). */
function groundShare(a: Assault): string {
  return a.ground !== null ? `, ${strengthWords(a.groundBonus)} of it for ${groundText(a.ground)}` : "";
}

/**
 * What a king reads of an assault on a walled city of his own, among his own lines: who came from where, his side of it
 * (the walls and the defenders), the strengths, and what came of it.
 */
P.ownWallsText = function (a) {
  const who = `${a.power}'s ${a.kind === "Army" ? "army" : "fleet"} from ${a.from}`;
  const strengths = `its strength ${strengthWords(a.strength)} against your walls ${strengthWords(a.walls)} and defenders ${strengthWords(a.defenders)}${groundShare(a)}`;
  const name = this.map.get(a.province).name;
  return stormed(a)
    ? `Your walled city of ${name}: ${who} stormed the walls (${strengths}): ${name} is taken.`
    : `Your walled city of ${name}: ${who} got within the walls but did not storm them (${strengths}): it stands inside, and ${name} stays yours unless a siege wears it down.`;
};

/**
 * What a captor takes from an envoy it catches, besieging a city or on the road: the gold it carried, into its treasury
 * at its fine weight, and the tablets (the one to be sealed, those shown as evidence, those brought home) into its
 * archive. Returns the lines that tell the captor.
 */
P.seize = function (c, lord, captor, dispatch, cargo, source) {
  const S = this.s;
  const lines: string[] = [];
  const gold = dispatch?.gold ?? cargo?.gold ?? 0;
  const purity = dispatch?.purityPercent ?? cargo?.purityPercent ?? 100;
  if (gold > 0) {
    const fine = toInt(roundEven((gold * purity) / 100.0));
    S.treasuries.get(captor).gold += fine;
    S.treasuries.get(captor).lots.push(newGoldLot({ id: newId(S, "g"), from: lord, stated: gold, face: gold, true: fine, arrivedTurn: S.turn + S.deliveryOffset }));
    lines.push(`He carried ${formatMoney(gold)} of gold, which your troops took.`);
  }
  // The tablets it carried: the one it was to have sealed, those shown as evidence, those it brought home.
  const tablets: string[] = [];
  if (dispatch !== null && dispatch.proposalTabletId !== null) tablets.push(dispatch.proposalTabletId);
  for (const copyId of dispatch?.copyIds ?? []) {
    const shown = S.copies.find((k) => k.id === copyId);
    if (shown !== undefined) tablets.push(shown.tabletId);
  }
  tablets.push(...(cargo?.copyIds ?? []));
  const held = new HSet(S.copies.filter((k) => k.holder === captor).map((k) => k.tabletId));
  for (const id of distinct(tablets).filter((x) => held.add(x)))
    S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: id, holder: captor, acquiredTurn: S.turn, source }));
  if (tablets.length > 0) lines.push("The tablets he carried are in your archive now.");
  return lines;
};
