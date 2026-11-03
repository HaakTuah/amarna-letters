/** The season's resolution (phase 4 of TurnEngine): movement, land changing hands, transfers, levies, the end. */
import { endSieges } from "../model/sieges-ended.ts";
import { Dict, HSet } from "../core/collections.ts";
import { idiv, roundTo, fmt } from "../core/num.ts";
import { BandData } from "../model/bands.ts";
import { shift } from "./people.ts";
import { cmpNum, cmpStr, count, desc, distinct, max, sortBy } from "../core/seq.ts";
import { describe } from "../model/order-reading.ts";
import { newTurnSubmission, type TurnSubmission } from "../model/submission.ts";
import { type CourtOrder, type CommandOrder, type EnlistOrder, type CrownOrder, type GovernOrder, type UnseatOrder, type MandateOrder, type RelieveOrder, type SupplyOrder, type UpkeepOrder, type CedeProvinceOrder, type FoldOrder, type GiftUnitOrder, type Order, type RaiseOrder, type RepudiateOrder, type RevokeOrder, type GrantOrder, type RoadsOrder, type SallyOrder, type SupportOrder, type TollOrder, type DemandOrder, type CensusOrder, type AnswerOrder, type BuildOrder, type RazeOrder, type WelcomeOrder, type DeportOrder, type ReturnRunawaysOrder, type ExpelOrder } from "../model/orders.ts";
import { stormed as assaultStormed, strengthWords } from "../model/outcomes.ts";
import { newFact } from "../model/people.ts";
import { AllPowers, cmpPower, king, land, type Power } from "../model/power.ts";
import { isSealedAgreement } from "../model/records.ts";
import { alive, isAlive, logEvent, newId, newKingdomFall, newUnit, notify, ownedBy, unitAt, unitLabel, wallsOf, type Unit } from "../model/state.ts";
import { newScoreRow } from "../model/records.ts";
import { OneKingdomLeft } from "../rules/ending.ts";
import { groundText } from "../model/geography.ts";
import { forMen, LandData, levySize, menAvailable, menOf, shareOfFull } from "../model/land.ts";
import { Adjudicator } from "../rules/adjudicator.ts";
import { commandStrength } from "../model/command.ts";
import { formatMoney } from "../rules/calendar.ts";
import { finalScore, strength as scoringStrength, standingOf, type FinalScore } from "../rules/scoring.ts";
import { OrderValidator, type ValidationResult } from "../rules/validator.ts";
import { Views } from "../rules/views.ts";
import { KingdomFallsTitle, TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    resolve(submissions: Dict<Power, TurnSubmission>): Dict<Power, ValidationResult>;
    resolveSeason(submissions: Dict<Power, TurnSubmission>): Dict<Power, ValidationResult>;
    resolveMovement(unitOrders: [Power, Order][]): void;
    updateOwnership(): void;
    /** A remnant marches to the troops of its own side next to it and joins them (item 17++). */
    foldUnit(p: Power, o: FoldOrder): void;
    resolveTransfers(cessions: [Power, CedeProvinceOrder][], gifts: [Power, GiftUnitOrder][]): void;
    raise(p: Power, r: RaiseOrder): void;
    capitalsTaken(): void;
    /** `ceded`: the king ceded his capital by agreement (item 11d) rather than losing it. */
    fall(p: Power, conqueror: Power | null, taker: Power | null, ceded?: boolean): void;
    strength(p: Power): number;
    landYield(p: Power): number;
    growth(p: Power): number;
    /** The final score of each living power, highest first, with its size and performance beside it (item 11e). */
    finalScores(): FinalScore[];
    endOfTurn(): void;
    decideWinners(): void;
  }
}

/** The courts of the kings falling this season, while their falls are reckoned. */
const fallingCourts = new WeakMap<TurnEngine, Set<string>>();

/** The seasons abroad after which a servant's long years at a foreign court become part of its past (item 10). */
export const LongAbroad = 12;

const P = TurnEngine.prototype;

/** Resolves the season from every seat's secret orders. Seats with no submission hold. */
P.resolve = function (submissions) {
  this.s.deliveryOffset = 1;
  try {
    return this.resolveSeason(submissions);
  } finally {
    this.s.deliveryOffset = 0;
  }
};

P.resolveSeason = function (submissions) {
  const S = this.s;
  const validator = new OrderValidator(S, this.map);
  const valid = new Dict<Power, ValidationResult>();
  this._stealing.clear();
  this._scheduledNow.clear();
  this._standingNow.clear();
  this._firedNow.clear();
  this._mandatedNow.clear();
  this._marchNow.clear();
  this._cededNow.clear();
  // Each living court remembers the walls as it saw them when it gave its orders (its view's), for when it no longer sees them.
  for (const p of alive(S)) S.wallsSeen.set(p, Views.wallsKnown(S, this.map, p));
  // And who held the land it saw (item 7b): elsewhere it knows only what word and its travellers bring.
  this.seeLand();
  // Each seat's season before its standing orders fire; then the standing orders, any seat's, that answer this season's moves.
  // Item 13: orders for places beyond the season's reach set out with couriers; those arriving now join the season's.
  const seasons = new Dict(alive(S).map((p) => [p, this.planSeason(p, this.sendOrders(p, submissions.tryGet(p) ?? newTurnSubmission()))] as const));
  const fires = this.standingFires(seasons, validator);
  for (const p of alive(S)) {
    const sub = this.compose(p, seasons.get(p), fires.tryGet(p) ?? []);
    const v = validator.validate(p, sub);
    valid.set(p, v);
    if (v.rejected.length > 0)
      notify(S, p, "Rejected", "Orders that could not be carried out", v.rejected.map((r) => `- ${describe(r.order)}: ${r.reason}`).join("\n"));
    this.afterValidation(p, sub, v);
  }

  // A kingdom that falls with its capital this season gives no more orders after the moves: only the living's run.
  const all = <T extends Order>(is: (o: Order) => o is T): [Power, T][] => {
    const out: [Power, T][] = [];
    for (const p of AllPowers) {
      const v = valid.tryGet(p);
      if (!v || !isAlive(S, p)) continue;
      for (const o of v.accepted) if (is(o)) out.push([p, o]);
    }
    return out;
  };
  const any = (o: Order): o is Order => true;

  // Item 13: command granted and taken back, and mandates sent, before the moves, to the units where they stand as the king names them.
  for (const [p, o] of all((o): o is RelieveOrder => o.type === "relieve")) this.relieveCommand(p, o);
  for (const [p, o] of all((o): o is SupplyOrder => o.type === "supply")) this.setSupply(p, o);
  // Item 17+: pay and food held back or given, for the units the king saw where he named them, before they move.
  for (const [p, o] of all((o): o is UpkeepOrder => o.type === "upkeep")) this.setUpkeep(p, o);
  for (const [p, o] of all((o): o is CommandOrder => o.type === "command")) this.grantCommand(p, o);
  for (const [p, o] of all((o): o is MandateOrder => o.type === "mandate")) this.setMandate(p, o);
  for (const [p, o] of all((o): o is UnseatOrder => o.type === "unseat")) this.unseatGovernor(p, o);
  for (const [p, o] of all((o): o is GovernOrder => o.type === "govern")) this.grantGovernorship(p, o);
  for (const [p, o] of all((o): o is CrownOrder => o.type === "crown")) this.grantCrown(p, o);
  this.resolveMovement(all(any).filter(([, o]) => o.type === "hold" || o.type === "move" || o.type === "support" || o.type === "convoy" || o.type === "besiege" || o.type === "sally"));
  // Supports that keep a promise made in a letter's clauses (item 8).
  this.promisesKept(all((o): o is SupportOrder => o.type === "support"));
  // A scheduled move that failed is tried again next season, or ends its unit's march.
  this.marches(valid);
  // Sieges are lifted, begun and pressed, and cities worn down surrender; then land changes hands where troops stand.
  this.sieges(valid);
  this.updateOwnership();
  // Item 13: kings on the road with their courts go on (setting out from next season).
  this.kingsTravel();
  for (const [p, o] of all((o): o is CourtOrder => o.type === "court")) this.setOutCourt(p, o);
  // A kingdom falls with its capital: its land passes to whoever took it, and its orders for the rest of the season lapse.
  this.capitalsTaken();
  // Item 13+: the parts of fallen kingdoms that word of the fall has reached come apart.
  this.fallsSpread();
  this.resolveTransfers(
    all((o): o is CedeProvinceOrder => o.type === "cede"),
    all((o): o is GiftUnitOrder => o.type === "giftUnit"),
  );
  // Item 15: what kings keep and build, armies razing what stands, then the season's upkeep, decay, projects and repairs.
  for (const [p, o] of all((o): o is BuildOrder => o.type === "build")) this.setWorks(p, o);
  for (const [p, o] of all((o): o is RazeOrder => o.type === "raze")) this.raze(p, o);
  this.worksSeason();
  // Item 17++: remnants folded into the troops next to them, once the season's moves are done.
  for (const [p, o] of all((o): o is FoldOrder => o.type === "fold")) this.foldUnit(p, o);
  for (const [p, d] of all((o) => o.type === "disband")) {
    const unit = (d as Extract<Order, { type: "disband" }>).unit;
    const u = unitAt(S, unit);
    if (u !== null && u.power === p) {
      const savings = u.savings;
      // Men settled as colonists where the unit stands, in a province of the king's own (item 10+a).
      const asked = (d as Extract<Order, { type: "disband" }>).settle === true && !this.map.get(u.province).isSea;
      const settle = asked && S.owner.getOrDefault(u.province, null) === p;
      const where = u.province;
      const home = this.disbandUnit(u, settle);
      const text = `${unitLabel(u)} was disbanded` + (home !== "" ? `: ${home}` : "") + (savings > 0 ? `; their savings, ${formatMoney(savings)}, went into the purse of ${this.map.get(u.home).name}.` : ".");
      // Settling asked on land lost out of the king's sight (bug #467): the men go home, and word of it comes by the road.
      if (asked && !settle) this.tell(p, where, "Resolution", "Disbanded", `${text} Its men could not settle as colonists in ${this.map.get(where).name}: you no longer held it.`);
      else this.tell(p, where, "Resolution", "Disbanded", text);
    }
    // The unit moved by the seat's own orders, or was destroyed (which wakes the seat by itself).
    else this.failed(p, d, "Disband failed", `No unit of yours stood in ${this.map.get(unit).name} after movement, so none was disbanded.`, "the unit is gone", false);
  }
  for (const [p, r] of all((o): o is RaiseOrder => o.type === "raise")) this.raise(p, r);
  // Item 13: bands enlisted where an army of their new master stands with them.
  for (const [p, o] of all((o): o is EnlistOrder => o.type === "enlist")) this.enlistBand(p, o);
  // Item 13: governors raise their own levies where foreign troops threaten their provinces.
  this.governorsLevy();
  // The season's trades at the markets, grain handed to towns, and caravans setting out (item 9+a).
  this.settleMarkets(all((o): o is Order => o.type === "sell" || o.type === "purchase" || o.type === "feed" || o.type === "caravan" || o.type === "trade" || o.type === "ship"));
  // Scheduled orders that waited for a levy's unit that was not raised are dropped.
  this.unraisedLevies();

  this.resolveCourt(all(any));
  // A new claim to the rank of Great King becomes established once most kings have long called its king brother (item 8).
  this.recognise();
  this.resolveIntelligence(all(any));
  // False names seen through this season (item 10).
  this.impostors();
  for (const [p, o] of all((o): o is RoadsOrder => o.type === "roads")) this.roads(p, o);
  // Tolls (item 9+b) stand from next season.
  for (const [p, o] of all((o): o is TollOrder => o.type === "toll")) this.setToll(p, o);
  for (const [p, o] of all((o): o is DemandOrder => o.type === "demand")) this.setDemand(p, o);
  for (const [p, o] of all((o): o is CensusOrder => o.type === "census")) this.sendCensus(p, o);
  for (const [p, o] of all((o): o is AnswerOrder => o.type === "answer")) this.answerProvince(p, o);
  // People in a king's hands (item 10+b): runaways sent back first, then the loose settled, deportation, mouths put out.
  for (const [p, o] of all((o): o is ReturnRunawaysOrder => o.type === "returnRunaways")) this.returnRunaways(p, o);
  for (const [p, o] of all((o): o is WelcomeOrder => o.type === "welcome")) this.welcome(p, o);
  for (const [p, o] of all((o): o is DeportOrder => o.type === "deport")) this.deport(p, o);
  for (const [p, o] of all((o): o is ExpelOrder => o.type === "expel")) this.expel(p, o);
  // Grants revoked and tablets repudiated (item 9) take effect from next season: guests still there then take the land.
  for (const [p, o] of all((o): o is RevokeOrder => o.type === "revoke")) this.revokeGrants(p, o);
  // Passage and basing granted by order (item 11a+) stand from next season.
  for (const [p, o] of all((o): o is GrantOrder => o.type === "grant")) this.grantByOrder(p, o);
  for (const [p, o] of all((o): o is RepudiateOrder => o.type === "repudiate")) this.repudiate(p, o);
  this.coversAtCourt();

  this.worldEvents();
  this.endOfTurn();
  return valid;
};

P.resolveMovement = function (unitOrders) {
  const S = this.s;
  const Map = this.map;
  const byProvince = new Dict<string, Order>();
  for (const [, o] of unitOrders) {
    const at = o.type === "hold" || o.type === "move" || o.type === "support" || o.type === "convoy" || o.type === "besiege" ? o.unit : null;
    if (at !== null) byProvince.set(at, o);
  }

  // Walls sally only for their holder: an order for a city lost out of its king's sight (bug #467) finds it so, and word comes home.
  const sallies: SallyOrder[] = [];
  for (const [p, o] of unitOrders) {
    if (o.type !== "sally") continue;
    if (S.owner.getOrDefault(o.city, null) === p) sallies.push(o);
    else this.lostOrder(p, o, o.city, "Order failed", `The walls of ${Map.get(o.city).name} did not sally: you no longer held the city.`, "you no longer held the city");
  }
  // Winter closes nothing (item 9): a crossing it makes dangerous costs troops after the moves (winterCrossings).
  // Each army and fleet crosses its connection at its own pace (item 13): one that cannot make it this season marches on.
  const marching = this.paceMoves(byProvince);
  const adjudicator = new Adjudicator(Map, true, S.config.terrainDefence);
  const result = adjudicator.run(S.units, byProvince, S.owner, S.walls, sallies, (p, mover) => this.guestAt(p, mover), (p, mover) => this.resistance(p, mover), (u) => commandStrength(this.commandOf(u)));
  this._battle = result;
  this._unitOrdersNow = byProvince;
  // Whose land each move went into, before it changes hands: troops entering a sleeping king's land wake him.
  for (const o of result.outcomes.filter((o) => o.order === "move" && o.target !== null)) {
    o.targetOwner = S.owner.getOrDefault(o.target!, null);
    // Into land its holder opened to it on a sealed tablet (item 9): a guest, not an attack.
    o.guest = this.guestAt(o.target!, o.power);
  }
  // The record of wars: the first season each king's troops got into another's land (a guest's entry is none).
  for (const o of result.outcomes.filter((o) => o.order === "move" && o.succeeded && o.targetOwner !== null && o.targetOwner !== o.power && !o.guest)) {
    let by = S.invaded.tryGet(o.targetOwner!);
    if (!by) S.invaded.set(o.targetOwner!, (by = new Dict()));
    by.tryAdd(o.power, S.turn);
  }

  // Which provinces could each power see before the moves? Battles there are reported to it.
  const sightBefore = new Dict(AllPowers.map((p) => [p, Views.sight(S, Map, p)] as const));

  for (const [supporter, supported, province] of result.givenSupports) {
    if (supported === null || supported === supporter) continue;
    const other = supported;
    const owner = S.owner.getOrDefault(province, null);
    // Who the support was given against: the king whose land the move went into, or, for a unit
    // supported where it stands, the king who attacked it there.
    const holding = unitAt(S, province)?.power === other;
    const attacker = holding
      ? (result.outcomes.filter((x) => x.order === "move" && x.target === province && x.power !== other && x.power !== supporter).map((x) => x.power as Power | null)[0] ?? null)
      : null;
    const against = owner !== null && owner !== other && owner !== supporter ? owner : attacker;
    logEvent(
      S,
      "support",
      `${supporter} supported ${other} at ${Map.get(province).name}` + (owner !== null && owner !== other ? ` (held by ${owner})` : attacker !== null ? ` against ${attacker}` : "") + ".",
      [supporter, other],
      against !== null ? `foreign-support:${against}` : "foreign-support",
    );
  }

  // What the battles cost (item 13): men on both sides; a unit beaten from its place falls back, or is destroyed.
  const gone = this.battles(result, sightBefore);
  this.marchesDone(result, byProvince, marching);
  for (const id of result.dislodgedUnitIds) {
    const u = S.units.find((x) => x.id === id)!;
    const to = gone.includes(u) ? null : result.newPositions.tryGet(id);
    for (const o of result.outcomes)
      if (o.province === u.province && o.power === u.power && o.destroyed) {
        o.destroyed = to === undefined || to === null;
        o.fellBack = to ?? null;
      }
    for (const l of result.lines) if (l.province === u.province && l.power === u.power && l.text.endsWith(" is dislodged")) l.text = l.text.replace(/ is dislodged$/, to === undefined || to === null ? " is destroyed" : ` falls back to ${Map.get(to).name}`);
  }
  for (const u of gone) {
    S.units.splice(S.units.indexOf(u), 1);
    result.newPositions.delete(u.id);
    // Some of its men die, and the rest run and turn loose where it fell (item 10+a).
    this.unitDestroyed(u);
    logEvent(S, "battle", `${u.power}'s ${unitLabel(u)} was destroyed.`, [...AllPowers.filter((p) => sightBefore.get(p).has(u.province)), u.power]);
  }
  // Moves the people of a land held off (item 10+a).
  for (const l of result.lines.filter((x) => x.failure?.stop === "Resisted"))
    logEvent(S, "resisted", `The people of ${Map.get(l.failure!.province).name} held off ${l.power}'s troops.`, [...AllPowers.filter((p) => sightBefore.get(p).has(l.failure!.province)), ...(l.power !== null ? [l.power] : [])], "resisted");
  const lostToWinter = this.winterCrossings(result.newPositions);
  this._movedNow.clear();
  for (const [id, prov] of result.newPositions) if (S.units.find((x) => x.id === id)?.province !== prov) this._movedNow.add(id);
  for (const [id, prov] of result.newPositions) S.units.find((x) => x.id === id)!.province = prov;
  this.loseToWinter(lostToWinter, sightBefore);
  // Walls stormed: the stormers break in, its walls a level lower (updateOwnership); whom it obeys is the season's rule.
  for (const a of result.assaults.filter((a) => assaultStormed(a)))
    logEvent(
      S,
      "storm",
      `${a.power} stormed the walls of ${Map.get(a.province).name}${a.owner !== null ? `, held by ${a.owner}` : ""}.`,
      [...AllPowers.filter((p) => sightBefore.get(p).has(a.province)), a.power],
      "storm",
    );
  // The ground at work: a unit that held only because of it, and an attack that beat a unit it helped.
  for (const g of result.groundFights.filter((g) => g.won || g.decided)) {
    const kind = g.defenderKind === "Army" ? "army" : "fleet";
    logEvent(
      S,
      "terrain",
      g.won
        ? `${g.attacker}'s attack from ${Map.get(g.from).name} drove ${g.defender}'s ${kind} from ${Map.get(g.to).name} in spite of ${groundText(g.ground)} (strength ${strengthWords(g.strength)} against ${strengthWords(g.against)}).`
        : `${g.defender}'s ${kind} in ${Map.get(g.to).name} held against ${g.attacker}'s attack from ${Map.get(g.from).name} by ${groundText(g.ground)} (strength ${strengthWords(g.strength)} against ${strengthWords(g.against)}).`,
      distinct([...AllPowers.filter((p) => sightBefore.get(p).has(g.to)), g.attacker, g.defender]),
      g.won ? "terrain-beaten" : "terrain-held",
    );
  }

  // Armies carried by sea that came ashore (build order item 7a: they land only where no enemy fleet holds the waters).
  for (const o of result.outcomes.filter((o) => o.order === "move" && o.unitKind === "Army" && o.succeeded && o.target !== null && !Map.canMove("Army", o.province, o.target)))
    logEvent(S, "landing", `${o.power}'s army landed in ${Map.get(o.target!).name} from the sea.`, distinct([...AllPowers.filter((p) => sightBefore.get(p).has(o.target!)), o.power]), "landing");

  this.movementNews(result, sightBefore, byProvince, sallies, unitOrders, adjudicator);
};

/**
 * Walls stormed (item 17++, "Whom a province obeys": conquest is force tipping it, and the season's rule alone decides
 * whom a province obeys): a unit that stormed walls this season breaks in, the walls a level lower, killing townspeople
 * and sending more running (item 10+a); from then on its men stand within them and weigh in full with the people there.
 * Troops before walls they did not storm stand outside them, at its gates, and weigh as troops next door do; a guest by
 * passage or basing takes nothing.
 */
P.updateOwnership = function () {
  const S = this.s;
  const stormed = new HSet(this._battle?.assaults.filter((a) => assaultStormed(a)).map((a) => a.province) ?? []);
  for (const u of S.units) {
    if (!stormed.has(u.province) || this.map.get(u.province).isSea || wallsOf(S, u.province) <= 0) continue;
    if (S.owner.getOrDefault(u.province, null) === u.power || !isAlive(S, u.power) || this.guestOf(u) !== null) continue;
    if ((S.breached.tryGet(u.province) ?? null) === u.power) continue;
    this.lowerWalls(u.province);
    this.killSettled(u.province, LandData.stormDead * 10, LandData.stormDead * 10);
    S.breached.set(u.province, u.power);
    notify(S, u.power, "Battle", "Walls stormed", `Your troops stormed the walls of ${this.map.get(u.province).name} and stand within them.`);
  }
};

P.foldUnit = function (p, o) {
  const S = this.s;
  const u = unitAt(S, o.unit);
  const into = unitAt(S, o.into);
  if (u === null || u.power !== p || into === null || into.power !== p || into.kind !== u.kind) {
    this.failed(p, o, "Fold failed", `The troops in ${this.map.get(o.unit).name} did not join those in ${this.map.get(o.into).name}: ${u === null || u.power !== p ? "they were gone after movement" : "none of yours stood there after movement"}.`, "the troops were gone", false);
    return;
  }
  // Men, food and savings go with them: nothing appears or vanishes.
  into.men += u.men;
  into.food += u.food;
  into.savings += u.savings;
  into.chest += u.chest;
  // Their ledgers join, each by its men (item 17++).
  const book = S.armies.tryGet(u.id);
  const joined = S.armies.tryGet(into.id);
  const whole = Math.max(1, into.men);
  const actors = new Set([...(book?.keys() ?? []), ...(joined?.keys() ?? [])]);
  for (const a of sortBy([...actors], [(x: string) => x, cmpStr])) {
    const v = idiv((book?.getOrDefault(a, 0) ?? 0) * u.men + (joined?.getOrDefault(a, 0) ?? 0) * (into.men - u.men), whole);
    this.armyEntry(into, a, v - (joined?.getOrDefault(a, 0) ?? 0));
  }
  S.armies.delete(u.id);
  S.units.splice(S.units.indexOf(u), 1);
  this.liftSiegesOf(u.id);
  logEvent(S, "fold", `${p}'s troops in ${this.map.get(o.unit).name} joined those in ${this.map.get(into.province).name}.`, [p], "fold");
  notify(S, p, "Resolution", "Troops joined", `${unitLabel(u)} marched to ${this.map.get(into.province).name} and joined the troops there, ${into.men} men strong now.`);
};

P.resolveTransfers = function (cessions, gifts) {
  const S = this.s;
  const Map = this.map;
  // A capital is ceded last, after the gifts of troops, so that a king ceding his realm may give his troops first.
  const capitals: [Power, CedeProvinceOrder][] = [];
  for (const [p, c] of cessions) {
    if (c.province === this.courtAt(p)) {
      capitals.push([p, c]);
      continue;
    }
    const name = Map.get(c.province).name;
    // The validator refuses a second cession of one province, so land no longer held was lost in movement, or before it
    // out of the king's sight (bug #467): either way word of it comes home by the road.
    if (S.owner.getOrDefault(c.province, null) !== p) {
      this.lostOrder(p, c, c.province, "Cession failed", `${name} was not ceded to ${c.to}: you no longer held it after movement.`, "you no longer held it");
      continue;
    }
    const u = unitAt(S, c.province);
    if (u !== null && u.power === p) {
      this.failed(p, c, "Cession failed", `${name} was not ceded to ${c.to}: your own troops still stood in it after movement.`, "your own troops stood there", false);
      continue;
    }
    // Item 17++ ("taken up, never thrust on anyone"): a treaty gives the receiver the claim, never the province, unless his
    // troops already stand in it, which is his taking it up.
    if (!S.units.some((x) => x.power === c.to && x.kind === "Army" && x.province === c.province)) {
      this.cededClaim(p, c.to, c.province);
      continue;
    }
    this.setOwner(c.province, c.to);
    this._cededNow.set(c.province, c.to);
    this.tell(p, c.province, "Resolution", "Land ceded", `${Map.get(c.province).name} now belongs to ${c.to}: his troops stand in it.`);
    notify(S, c.to, "Resolution", "Land received", `${p} has ceded ${Map.get(c.province).name} to you, and your troops there hold it.`);
    logEvent(S, "cession", `${p} ceded ${Map.get(c.province).name} to ${c.to}.`, this.nearOf(c.province, p, c.to));
    // A capital ceded is a capital taken: its archive lies in the city.
    this.takeArchive(c.to, c.province);
  }
  for (const [p, g] of gifts) {
    const u = unitAt(S, g.unit);
    if (u === null || u.power !== p) {
      this.failed(p, g, "Gift of troops failed", `No unit of yours stood in ${Map.get(g.unit).name} after movement, so none was given to ${g.to}.`, "the unit is gone", false);
      continue;
    }
    u.power = g.to;
    notify(S, p, "Resolution", "Troops given", `${unitLabel(u)} now serves ${g.to}.`);
    notify(S, g.to, "Resolution", "Troops received", `${p} has placed ${unitLabel(u)} under your command.`);
    logEvent(S, "gift-unit", `${p} gave ${unitLabel(u)} to ${g.to}.`, [p, g.to]);
  }
  // A king who cedes his own capital this season can receive none: whichever were reckoned first would decide it.
  const ceding = new Set(capitals.map(([p]) => p));
  for (const [p, c] of capitals) {
    if (ceding.has(c.to)) this.failed(p, c, "Cession failed", `${Map.get(c.province).name} was not ceded to ${c.to}: ${c.to} ceded its own capital the same season.`, "the receiver ceded its own realm", true);
    else this.realmCeded(p, c);
  }
};

P.raise = function (p, r) {
  const S = this.s;
  const prov = this.map.get(r.province);
  const kind = r.kind.toLowerCase();
  // In the rulebook's words: only in a province of your homeland that you still hold and that is empty after movement.
  // Land the king itself ceded this season was not lost in movement: the notice says which.
  const to = this._cededNow.tryGet(prov.id);
  const why =
    S.owner.getOrDefault(prov.id, null) === p
      ? unitAt(S, prov.id) !== null
        ? `${prov.name} was not empty after movement`
        : null
      : to !== undefined
        ? `you ceded ${prov.name} to ${to} last season, before the levy`
        : `you no longer held ${prov.name} after movement`;
  if (why !== null) {
    const text = `No ${kind} was raised in ${prov.name}: ${why}. No gold was paid.`;
    // Only land lost in movement is others' doing, and its word comes home by the road (bug #467): a province the seat
    // still holds that is not empty holds its own unit (any other troops there would have taken it), and a cession is its own.
    if (S.owner.getOrDefault(prov.id, null) !== p && !this._cededNow.has(prov.id)) this.lostOrder(p, r, prov.id, "Levy failed", text, why);
    else this.tell(p, prov.id, "Rejected", "Levy failed", text);
    return;
  }
  // Sized by the men the province has (item 11a+): a full levy where it can, else every man at home; its price, pay and
  // food are in proportion.
  // Item 17++: a share of the men at home, less what the province hides of it; an amount, the men asked.
  const men = levySize(S, prov.id, r.kind, r.share != null ? idiv(idiv(menAvailable(S, prov.id) * r.share, 100) * (100 - this.hiddenIn(prov.id)), 100) : (r.men ?? null));
  if (men <= 0) {
    // A share that came to fewer than a levy's least is told as that, never as a land without men.
    const short = r.share != null && menAvailable(S, prov.id) >= LandData.levyLeast;
    const why = short ? `the share you asked of its men came to fewer than a levy takes (${LandData.levyLeast} at least); ask a larger share or a number of men` : `it has too few men of fighting age left (${LandData.levyLeast} at least are needed)`;
    // Its notice and a sleeping seat's wake come by the road from a far province (bug #517).
    this.lostOrder(p, r, prov.id, "Levy failed", `No ${kind} was raised in ${prov.name}: ${why}. No gold was paid.`, short ? "the share asked came to fewer men than a levy takes" : "too few men of fighting age");
    return;
  }
  const cost = forMen(r.kind === "Army" ? S.config.armyCost : S.config.fleetCost, r.kind, men);
  if (!this.pay(p, cost, `a new ${kind} in ${prov.name}`, r, "none was raised")) return;
  // The levy's gold pays the province's own men and smiths: it goes into its people's purse (item 9+a).
  this.spendAt(prov.id, cost);
  // Its men come from the province's men of fighting age (item 10+a).
  this.levyMen(prov.id, men);
  const u = newUnit({ id: newId(S, "u"), power: p, kind: r.kind, province: prov.id, home: prov.id, men });
  S.units.push(u);
  this.tell(p, prov.id, "Resolution", "Levy raised", `A new ${kind} stands in ${prov.name}${men !== menOf(r.kind) ? `, ${men} men strong${men < (r.men ?? menOf(r.kind)) ? ": all the men of fighting age the province had to give" : ""}, so it counts for ${strengthWords(shareOfFull(r.kind, men))} of a full ${kind} in battle, and costs and eats in proportion` : ""}.`);
  if (r.share != null) logEvent(S, "levy", `${p} raised a ${kind} in ${prov.name} by a share of its men.`, this.nearOf(prov.id, p), "levy-share");
  this.levyRaised(p, u);
};

/**
 * A kingdom falls with its capital: a king whose capital another power holds after the moves has fallen, and his kingdom
 * with him. His remaining land passes to the power that took the capital, every troop of his disbands, his sieges are
 * lifted, and his debts die with him ({@link TurnEngine.fall}). The kingdoms that fall in one season are found first, so
 * one fall revives nobody. If a capital's taker falls in the same season, the land passes on with his own to whoever took
 * his capital, and so on down the chain; a ring of kings who took each other's capitals leaves it free. Every heir is
 * found before any land passes, so the order the falls are reckoned in changes nothing.
 */
P.capitalsTaken = function () {
  const S = this.s;
  // Item 13: the capital is wherever the king is; he is taken where he stands, or on the road.
  const taken = this.kingsTaken();
  const fallen = alive(S).filter((p) => taken.has(p));
  const takers = new Dict(fallen.map((p) => [p, taken.get(p) ?? null] as const));
  const heir = (p: Power): Power | null => {
    const passed = new HSet<Power>([p]);
    let next = takers.get(p);
    while (next !== null && takers.has(next)) {
      if (!passed.add(next)) return null;
      next = takers.get(next);
    }
    return next !== null && isAlive(S, next) ? next : null;
  };
  const heirs = new Dict(fallen.map((p) => [p, heir(p)] as const));
  // A capital taken by a king who falls too passes on down the chain with his own.
  fallingCourts.set(this, new Set(fallen.map((p) => this.courtAt(p))));
  for (const p of fallen) this.fall(p, heirs.get(p), takers.get(p));
  fallingCourts.delete(this);
};

/**
 * A kingdom's fall: what passes with it, and what goes with it. `conqueror` is the power its land passes to; `taker` the
 * one holding its capital after the moves, the same unless the taker fell too.
 */
P.fall = function (p, conqueror, taker, ceded = false) {
  const S = this.s;
  // Item 13: the capital is wherever the king was.
  const capital = this.map.get(this.courtAt(p));
  const landHeld = ownedBy(S, p);
  // Item 13 ("A kingdom falls with its capital", revised 27 October 2026): the realm comes apart province by province. The
  // capital passes at once to whoever holds it; since item 13+ the rest comes apart only as word of the fall reaches each
  // part (fallsSpread, turn/falls.ts), life there going on as before until then. A capital ceded by sealed tablet (item
  // 11d) passes whole with its land, as agreed.
  const passes = (id: string): boolean => ceded || id === capital.id || (fallingCourts.get(this)?.has(id) ?? false);
  const passed: string[] = [];
  for (const id of landHeld) {
    if (!passes(id)) continue;
    this.setOwner(id, conqueror);
    if (conqueror !== null) passed.push(id);
    // A siege the conqueror pressed against land that is now his is over.
    if (conqueror !== null) endSieges(S, this.map, (x) => x.province === id && x.power === conqueror);
  }
  const apart = landHeld.filter((x) => !passes(x));
  S.falls.push(newKingdomFall({ power: p, turn: S.turn, conqueror, capital: capital.id, land: passed }));
  S.eliminated.push(p);
  // A fallen court claims no name (item 17+).
  this.syncNames();
  this.endSleep(p);
  // Its court's journey and its couriers on the road end with it.
  S.kingRoads = S.kingRoads.filter((r) => r.power !== p);
  S.couriers = S.couriers.filter((x) => x.power !== p);
  // Item 13: its armies in the field are their commanders' to decide once word of the fall reaches them (item 13+,
  // fallsSpread); a kingdom ceded whole disbands its troops at once.
  if (ceded) for (const u of sortBy(S.units.filter((u) => u.power === p), [(u: Unit) => u.id, cmpStr])) this.disbandUnit(u);
  // Item 11b: its court's refugees at the fallen capital may raise a head of their own, carrying its tongue ("A fallen
  // court's people"): the loose there, or, with too few, the townsfolk who fled their homes.
  const heads = this.r("refugees", p);
  if (heads.chance(BandData.refugeesHead / 100)) {
    const x = this.peopleOf(capital.id);
    const men = Math.min(BandData.startMost, Math.max(BandData.least, idiv(x.loose * BandData.startShare, 100)));
    if (x.loose >= men) {
      x.loose -= men;
      this.looseLeave(capital.id, 0);
    } else shift(x, -Math.min(men, x.settled), -Math.min(x.men, idiv(men, 2)));
    this.headRises(capital.id, men, "refugees", heads, p);
  }
  // What a fallen kingdom believed, and what it owed, go with it: fees it owed are lost, and its debts die with it (item 11a).
  for (const c of S.characters) {
    c.covers = removeAll(c.covers, (k) => k.for === p);
    c.owed.delete(p);
  }
  this.debtsDie(p);
  // Nobody is left to hold its prisoners: they are let go, and walk home as if released.
  for (const c of S.characters.filter((c) => c.heldBy === p)) {
    if (c.status === "Captured") this.releaseCaptive(p, c);
    else if (c.duty === "Detained") this.letEnvoyGo(p, c, null);
  }
  // Item 13+: a governor or commander far off serves on until word of the fall reaches him (fallsSpread).
  for (const c of S.characters.filter((c) => c.employer === p && (ceded || (c.duty !== "Governing" && c.duty !== "Commanding")))) {
    c.formerEmployer = p;
    c.employer = null;
    c.contract = null;
    if (c.status === "Employed") c.status = "Free";
    // A risen power's ruler (item 13+) has fallen with it, and lives on as a free man where he is.
    if (c.duty === "Ruling") c.duty = "None";
  }
  const who = ceded ? `its king ceded its capital, ${capital.name}, to ${taker}` : taker !== null ? `${taker} took its capital, ${capital.name}` : `its capital, ${capital.name}, was taken`;
  // Word of the fall travels (item 7b): a court that sees the capital hears at once, the rest when word reaches them.
  const seeing = alive(S).filter((x) => x === conqueror || Views.sight(S, this.map, x).has(capital.id));
  const parts = conqueror === null ? "" : ceded ? `, and its land passes to ${conqueror}` : `, and ${conqueror} holds it${passed.length > 0 ? ` with ${passed.map((x) => this.map.get(x).name).join(", ")}` : ""}`;
  logEvent(S, "fall", `The kingdom of ${land(p)} has fallen: ${who}${parts}${!ceded && apart.length > 0 ? `; the rest of it comes apart as word of the fall reaches it` : ""}.`, [p, ...seeing], null);
  for (const other of alive(S).filter((x) => x !== conqueror)) {
    const text = `Word spreads that the kingdom of ${land(p)} is no more: ${who}.`;
    if (seeing.includes(other)) {
      S.fallsHeard.set(other, [...(S.fallsHeard.tryGet(other) ?? []), p]);
      this.syncNames();
      notify(S, other, "Rumor", "A kingdom falls", text);
    } else this.word(p, other, "KingdomFalls", text);
  }
  if (conqueror !== null) S.fallsHeard.set(conqueror, [...(S.fallsHeard.tryGet(conqueror) ?? []), p]);
  // The fallen claim nothing, as each court that has heard of the fall knows (item 17+).
  this.syncNames();
  if (conqueror !== null) {
    const winner = conqueror;
    const rest = passed.filter((x) => x !== capital.id).map((x) => this.map.get(x).name);
    const gone = apart.map((x) => this.map.get(x).name);
    const yours =
      (rest.length === 0 ? "none of his other land is yours" : ceded ? `his land is yours: ${rest.join(", ")}` : `of his land you hold ${rest.join(", ")}, where your troops stand`) +
      (gone.length === 0
        ? "."
        : `; the rest, ${gone.join(", ")}, comes apart as word of the fall reaches it by road: where your troops stand then it is yours, held by force; a governor there rules his province in his own name, and the rest falls lawless.`);
    notify(
      S,
      winner,
      "Battle",
      KingdomFallsTitle,
      ceded
        ? `${king(p).charAt(0).toUpperCase() + king(p).slice(1)} has ceded ${capital.name} to you, and with it the kingdom of ${land(p)}: his troops have disbanded, and ${yours}`
        : taker === winner
        ? `With ${capital.name} you took the kingdom of ${land(p)}: its king has fallen, his armies are their own commanders' or disband as word reaches them, and ${yours}`
        : `${taker} took ${capital.name}, the capital of ${land(p)}, but fell himself in the same season, and the kingdom of ${land(p)} passes to you with his: its king has fallen, his armies are their own commanders' or disband as word reaches them, and ${yours}`,
    );
  }
};

/** List.RemoveAll, in place: the same array, without the items that match. */
export function removeAll<T>(list: T[], match: (x: T) => boolean): T[] {
  let w = 0;
  for (let i = 0; i < list.length; i++) if (!match(list[i])) list[w++] = list[i];
  list.length = w;
  return list;
}

// ---------------------------------------------------------------- scoring and the end

/** The score: the wealth of the realm, its true gold counted (item 9+a); since item 11a nothing owed is subtracted. */
P.strength = function (p) {
  return scoringStrength(this.s.config, this.landYield(p), this.s.treasuries.get(p).gold, this.holdings(p));
};

/** The worth a season of the land a power holds at reference prices, each province counted as far as it obeys him. */
P.landYield = function (p) {
  return this.landWorth(p);
};

P.growth = function (p) {
  const start = this.s.startStrength.getOrDefault(p, 0);
  return start <= 0 || !isAlive(this.s, p) ? 0 : this.strength(p) / start;
};

P.endOfTurn = function () {
  const S = this.s;
  // Item 13: where each unit stood this season, for the reports its king's couriers bring.
  this.keepTrails();
  for (const p of AllPowers)
    S.scores.push(
      newScoreRow({
        turn: S.turn,
        power: p,
        strength: isAlive(S, p) ? this.strength(p) : 0,
        growth: roundTo(this.growth(p), 4),
        provinces: ownedBy(S, p).length,
        units: count(S.units, (u) => u.power === p),
        gold: S.treasuries.get(p).gold,
      }),
    );

  for (const c of S.characters.filter((c) => c.at !== null && c.employer !== null && c.at !== c.employer)) {
    c.turnsAbroad++;
    // Long years abroad become part of a character's past (item 10, "a past made in play"), known to both courts.
    if (c.turnsAbroad === LongAbroad && c.status !== "Dead")
      c.facts.push(newFact({ id: newId(S, "f"), text: `Spent three years and more at the court of ${land(c.at!)}.`, secrecy: "Hidden", tag: "abroad", knownBy: [c.employer!, c.at!] }));
  }

  let reason: string | null = null;
  if (alive(S).length <= 1) reason = OneKingdomLeft;
  // The last season was drawn in secret at the start (rules/ending.ts); an open age has none.
  else if (S.finalSeason !== null && S.turn >= S.finalSeason) reason = S.finalByCap ? "the age has run its course" : "the gods have ended the age";

  if (reason !== null) {
    S.ended = true;
    S.endReason = reason;
    this.decideWinners();
    // The score that decides, with size and performance beside it (item 11e): every placement counts.
    const placings = this.finalScores().map((x, i) => `${i + 1}. ${x.power} ${fmt(x.score, "0.00")} (size ${fmt(x.size, "0.00")}, performance ${fmt(x.performance, "0.00")})`);
    logEvent(S, "end", `The game ends after turn ${S.turn}: ${reason}. Winner: ${S.winners.join(" and ")}. Final scores: ${placings.join("; ")}.`);
    return;
  }
  S.turn++;
  // Item 17++, part C: each court sees its own city's mood as the new season begins.
  this.courtsSee();
};

P.finalScores = function () {
  const S = this.s;
  const living = alive(S);
  // Size: the realm's wealth as a share of the largest living realm's. Performance: where its growth ranks among its own
  // starting position's results ("One scoreboard for every power", item 11e).
  const largest = Math.max(1, ...living.map((p) => this.strength(p)));
  const rows = living.map((p) => {
    const size = Math.max(0, this.strength(p)) / largest;
    const performance = standingOf(p, this.growth(p)) / 2;
    return { power: p, score: finalScore(S.config.sizeWeight, size, performance), size, performance };
  });
  return sortBy(rows, [(x: FinalScore) => x.score, desc(cmpNum)], [(x: FinalScore) => x.power, cmpPower]);
};

P.decideWinners = function () {
  const S = this.s;
  const living = alive(S);
  const scores = this.finalScores();
  const score = new Dict(scores.map((x) => [x.power, x.score] as const));
  if (scores.length === 0) {
    S.winners = [];
    return;
  }
  const best = scores[0].power;

  if (S.config.sharedVictory) {
    let bestPair: [Power, Power, number] | null = null;
    for (const t of S.tablets.filter((t) => t.allianceOath && isSealedAgreement(t))) {
      const a = t.proposedBy;
      const b = t.partner!;
      if (!isAlive(S, a) || !isAlive(S, b)) continue;
      // The pair's score together: each partner's, weighed by its starting strength.
      const start = S.startStrength.get(a) + S.startStrength.get(b);
      const combined = (score.get(a) * S.startStrength.get(a) + score.get(b) * S.startStrength.get(b)) / start;
      const others = living.filter((p) => p !== a && p !== b).map((p) => score.get(p));
      const rivals = others.length === 0 ? 0 : max(others, (x) => x);
      if (combined > rivals && (bestPair === null || combined > bestPair[2])) bestPair = [a, b, combined];
    }
    if (bestPair !== null) {
      S.winners = [bestPair[0], bestPair[1]];
      logEvent(S, "shared-victory", `${bestPair[0]} and ${bestPair[1]} share the victory under their sworn alliance (score together ${fmt(bestPair[2], "0.00")}).`, null, "shared-victory");
      return;
    }
  }
  S.winners = [best];
};
