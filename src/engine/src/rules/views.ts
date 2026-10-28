/** What each court sees: the seat view, sight, the walls it knows, and how it sees each person and tablet. */
import { Dict, HSet } from "../core/collections.ts";
import { idiv } from "../core/num.ts";
import { cmpBool, cmpNum, desc, groupBy, sortBy, sum } from "../core/seq.ts";
import { split } from "../core/text.ts";
import { StartWalls, WorldMap } from "../model/map.ts";
import { coverOf, factsKnownTo, falseNameAt, hiddenAt, type Character, type Contract, type Cover } from "../model/people.ts";
import { claimWords } from "./skills.ts";
import { AllPowers, cmpPower, king, type Power } from "../model/power.ts";
import type { PendingTask, Tablet, TabletCopy } from "../model/records.ts";
import { newScheduledOrders, type ScheduledOrders } from "../model/sleep.ts";
import { sameConditions } from "./conditions.ts";
import { alive, inboxOf, isAlive, ledger, newKnown, ownedBy, wallsOf, type GameState, type Known } from "../model/state.ts";
import { wordSeasons } from "../model/travel.ts";
import { capacityOf, carriedOf, EconomyData, harvestOf, needOf, priceAt } from "../model/economy.ts";
import { reckonedOf } from "../model/land.ts";
import { caravanAt } from "../model/caravans.ts";
import { grantStands, newGrantView } from "../model/authority.ts";
import {
  newCharacterView,
  newDebtView,
  newLotView,
  newSeatView,
  newSiegeView,
  newTabletView,
  newUnitView,
  newLetterView,
  newProvinceEconomyView,
  newCaravanView,
  landGrowth,
  type CharacterView,
  type DebtView,
  type LandStanding,
  type LetterView,
  type SeatView,
  type TabletView,
} from "../model/views.ts";
import { newStandingOrderView } from "../model/sleep.ts";
import type { InboxItem } from "../model/records.ts";
import { formatMoney, season } from "./calendar.ts";
import { ageBand } from "./ending.ts";
import { TurnEngine } from "../turn/turn-engine.ts";
import { asShown, basePrice, trustIn } from "../turn/turn-engine.ts";
import { debtLeft, isPowerParty } from "../model/money.ts";
import { travelTurns } from "../turn/core.ts";

/**
 * Every power's land-based growth from who holds what, the living best first (ties in the fixed order of powers), then
 * the fallen. Read from who holds what as the court knows it (item 7b: news of distant land travels).
 */
function landStandings(owner: Dict<string, Power | null>, fallen: Iterable<Power>, map: WorldMap | null = null): LandStanding[] {
  const m = map ?? WorldMap.default;
  const gone = new Set(fallen);
  const list = AllPowers.map((p) => ({
    power: p,
    yield: sum([...owner.entries()].filter(([, v]) => v === p), ([k]) => m.get(k).yield),
    startYield: sum(m.homeOf(p), (x) => x.yield),
    fallen: gone.has(p),
  }));
  return sortBy(
    list,
    [(x: LandStanding) => x.fallen, cmpBool],
    [(x: LandStanding) => (x.fallen ? 0 : landGrowth(x)), desc(cmpNum)],
    [(x: LandStanding) => x.power, cmpPower],
  );
}

/**
 * Whether a kingdom looks doomed, from public facts alone (who holds what): it has fallen, lost its capital, or holds fewer
 * than half of its homeland's provinces. Back pay owed by such a court may never be paid.
 */
function looksDoomed(owner: Dict<string, Power | null>, fallen: Iterable<Power>, p: Power, map: WorldMap | null = null): boolean {
  const m = map ?? WorldMap.default;
  if ([...fallen].includes(p) || owner.getOrDefault(m.capital(p).id, null) !== p) return true;
  const home = m.homeOf(p);
  return 2 * home.filter((x) => owner.getOrDefault(x.id, null) === p).length < home.length;
}

/**
 * Provinces a power can see units in: its own lands, where its units stand, and next to any of those. A spy watching a
 * province adds nothing live: its reports travel home by road like any other (item 9, answering item 7b's review), and
 * bring the troops it saw and who held the land when it wrote.
 */
function sight(s: GameState, map: WorldMap, p: Power): HSet<string> {
  const core = new HSet<string>(ownedBy(s, p));
  for (const u of s.units) if (u.power === p) core.add(u.province);
  const all = new HSet<string>(core);
  for (const id of core) for (const n of map.neighbors(id)) all.add(n);
  return all;
}

/**
 * The walls as a court knows them, by province (a province with none left out): those standing now where it can see
 * troops ({@link sight}), and elsewhere as it last saw them (GameState.wallsSeen; at the start, as the map gives them).
 */
function wallsKnown(s: GameState, map: WorldMap, p: Power, seen: HSet<string> | null = null): Dict<string, number> {
  const sightNow = seen ?? sight(s, map, p);
  const last = s.wallsSeen.tryGet(p);
  const known = last !== undefined ? last.clone() : new Dict<string, number>([...StartWalls.entries()].filter(([, v]) => v > 0));
  for (const id of sightNow) {
    const level = s.walls.tryGet(id);
    if (level !== undefined) known.set(id, level);
    else known.delete(id);
  }
  return known;
}

/** Who held a province after a turn's moves, by the log of changes (GameState.ownerLog); at the start, its homeland's king. */
function ownerAt(s: GameState, map: WorldMap, province: string, turn: number): Power | null {
  let o = map.get(province).home;
  for (const c of s.ownerLog) if (c.province === province && c.turn <= turn) o = c.owner;
  return o;
}

/** What a court knows was so of a province it did not see itself: word of it, from its land, reaches the court that late. */
export const WordSource = "word from abroad";
export const SeenSource = "seen";

/**
 * Who a court knows holds each land province, with the season it was so and where the knowledge came from (build order
 * item 7b, "Hidden by default"): what it sees now ({@link sight}), as it is; elsewhere the newest of what word has brought
 * (the holder as of the newest season whose word from there, setting out then, has reached the court by now) and what its own people
 * saw or brought home (GameState.known).
 */
function knownHolders(s: GameState, map: WorldMap, p: Power, seen: HSet<string> | null = null): Dict<string, Known> {
  const sightNow = seen ?? sight(s, map, p);
  const stored = s.known.tryGet(p);
  const court = map.capital(p).id;
  const out = new Dict<string, Known>();
  for (const x of map.landProvinces) {
    if (sightNow.has(x.id)) {
      out.set(x.id, newKnown({ owner: s.owner.getOrDefault(x.id, null), turn: s.turn, source: SeenSource }));
      continue;
    }
    // The newest season whose word, setting out then, has arrived by now (as word of a fall is timed: TurnEngine.word).
    let asOf = 0;
    for (let d = s.turn - 1; d >= Math.max(1, s.turn - 6); d--)
      if (d + wordSeasons(s.config.travelDays, map, x.id, court, d) <= s.turn) {
        asOf = d;
        break;
      }
    let best = newKnown({ owner: ownerAt(s, map, x.id, asOf), turn: asOf, source: WordSource });
    const own = stored?.tryGet(x.id);
    if (own !== undefined && own.turn > best.turn) best = own;
    out.set(x.id, best);
  }
  return out;
}

/** A sleeping seat wakes to at most this many items of the news of the seasons it slept. */
export const MaxWhileAsleep = 40;

/**
 * A treasury notice that only gives the season's figures: stale once another season has passed (the latest is in this
 * season's news). One that says troops deserted or people went unpaid is kept.
 */
function routineTreasury(i: InboxItem): boolean {
  return i.kind === "Notice" && i.title === "The treasury" && !i.body.includes("deserted") && !i.body.includes("Could not pay");
}

function seatView(s: GameState, p: Power, map: WorldMap | null = null): SeatView {
  const m = map ?? WorldMap.default;
  const engine = new TurnEngine(s, m);
  const seen = sight(s, m, p);
  const known = knownHolders(s, m, p, seen);
  const t = s.treasuries.get(p);
  const v = newSeatView({
    claims: s.claims.map((c) => ({ ...c })),
    greetings: s.recognition.filter((r) => r.from === p || r.to === p).map((r) => ({ ...r })),
    turn: s.turn,
    season: season(s.turn, p),
    power: p,
    king: king(p),
    ended: s.ended,
    openAge: s.config.openAge,
    ageBand: ageBand(s.config.endMedian),
    gold: ledger(t),
    unassayedGold: t.lots.map((l) => newLotView({ id: l.id, from: l.from, stated: l.stated, weighed: l.face, arrivedTurn: l.arrivedTurn })),
    income: engine.income(p),
    upkeep: engine.upkeep(p),
    wallUpkeep: engine.wallsUpkeep(p),
    feesDue: engine.feesDue(p),
    feesOwed: engine.feesOwed(p),
    fees: engine.feeRates(p),
    trust: trustIn(s, p),
    kept: s.payRecords.tryGet(p)?.kept ?? 0,
    broken: s.payRecords.tryGet(p)?.broken ?? 0,
    goingRate: s.goingRate,
    debts: debtViews(s, p),
    strength: engine.ledgerStrength(p),
    startStrength: s.startStrength.getOrDefault(p, 0),
    provinceWeight: s.config.provinceWeight,
    owner: new Dict([...known.entries()].map(([k, x]) => [k, x.owner] as const)),
    // Dated where the news is older than this season, and newer than the start, which every court knows as it was.
    ownerAsOf: new Dict([...known.entries()].filter(([, x]) => x.turn < s.turn && x.turn > 0).map(([k, x]) => [k, x.turn] as const)),
    ownerFrom: new Dict([...known.entries()].filter(([, x]) => x.turn < s.turn && x.turn > 0).map(([k, x]) => [k, x.source] as const)),
    roadsClosed: [...(s.roadsClosed.tryGet(p) ?? [])],
    roadsClosedToUs: [...(s.roadsHeard.tryGet(p) ?? [])],
    grants: s.grants
      // Once it holds the tablet: an envoy's king learns of one sealed by his envoy's hand when its copy comes home.
      .filter((g) => (g.grantor === p || g.grantee === p) && grantStands(g, s.turn) && s.copies.some((k) => k.holder === p && k.tabletId === g.tabletId))
      .map((g) => {
        const t = s.tablets.find((x) => x.id === g.tabletId);
        return newGrantView({ kind: g.kind, grantor: g.grantor, grantee: g.grantee, province: g.province, sinceTurn: g.sinceTurn, untilTurn: g.untilTurn, tablet: t !== undefined ? tabletName(t) : "" });
      }),
    walls: wallsKnown(s, m, p, seen),
    // Its own land's only: how another king's land changed hands is not public, though who holds it is.
    conquered: new Dict([...s.conquered.entries()].filter(([k]) => s.owner.getOrDefault(k, null) === p)),
    sieges: s.sieges
      .filter((x) => x.power === p || s.owner.getOrDefault(x.province, null) === p || seen.has(x.province))
      .map((x) =>
        newSiegeView({
          province: x.province,
          besieger: x.power,
          holder: s.owner.getOrDefault(x.province, null),
          progress: x.progress,
          walls: wallsOf(s, x.province),
          since: x.since,
          tightness: x.power === p || s.owner.getOrDefault(x.province, null) === p ? engine.tightness(x) : null,
        }),
      ),
    units: s.units
      .filter((u) => u.power === p || seen.has(u.province))
      .map((u) =>
        u.power === p
          ? newUnitView({ power: u.power, kind: u.kind, province: u.province, food: u.food, carried: carriedOf(u.kind), hungry: u.hungry, unpaid: u.unpaid, savings: u.savings })
          : newUnitView({ power: u.power, kind: u.kind, province: u.province }),
      ),
    visible: m.provinces.filter((x) => seen.has(x.id)).map((x) => x.id),
    // The fallen kingdoms it has heard of (word of a fall travels): all of them, for a fallen court's last view.
    fallen: isAlive(s, p) ? s.eliminated.filter((x) => (s.fallsHeard.tryGet(p) ?? []).includes(x)) : [...s.eliminated],
    inbox: inboxOf(s, p).filter((i) => i.turn === s.turn),
    lastSeason: [...(s.lastSeen.tryGet(p) ?? [])],
  });

  const sleep = s.sleep.tryGet(p);
  if (s.config.sleepingSeats && sleep !== undefined) {
    v.sleeps = true;
    v.wokenBecause = [...sleep.wokenBecause];
    v.holdsCourt = sleep.holdsCourt && sleep.asleep;
    v.courtLetters = [...sleep.courtLetters];
    v.lastCalled = sleep.lastCalled;
    const slept = inboxOf(s, p).filter((i) => i.turn > sleep.lastCalled && i.turn < s.turn && !routineTreasury(i));
    v.whileAsleepLeftOut = Math.max(0, slept.length - MaxWhileAsleep);
    v.whileAsleep = slept.slice(v.whileAsleepLeftOut);
    v.digest = [...sleep.digest];
    v.digestLeftOut = sleep.digestLeftOut;
    // Orders follow their units: each is shown as it would be given from where its unit stands now.
    // Orders of one season with different conditions (a march held up a season among them) are shown apart.
    const entries: ScheduledOrders[] = [];
    for (const x of sleep.scheduled) {
      const last = entries.length > 0 ? entries[entries.length - 1] : null;
      if (last !== null && last.turn === x.turn && sameConditions(last.conditions, x.conditions)) last.orders.push(asShown(s, p, x));
      else entries.push(newScheduledOrders({ turn: x.turn, orders: [asShown(s, p, x)], conditions: [...x.conditions] }));
    }
    v.scheduled = sortBy(entries, [(e: ScheduledOrders) => e.turn, cmpNum]);
  }
  // Every seat's standing orders, awake or asleep, each of its units named by where it stands now.
  const book = s.standing.tryGet(p);
  if (book !== undefined)
    v.standing = book.orders.map((x) =>
      newStandingOrderView({
        id: x.id,
        when: x.when,
        power: x.power,
        province: (x.when === "UnitAttacked" ? (s.units.find((u) => u.id === x.unitId && u.power === p)?.province ?? x.province) : x.province) ?? "",
        orders: x.orders.map((o) => asShown(s, p, o)),
        conditions: [...x.conditions],
      }),
    );

  // Its standing answers for what arrives at its court.
  v.answers = (s.answers.tryGet(p)?.answers ?? []).map((x) => ({ ...x, conditions: [...x.conditions] }));

  for (const c of s.characters) {
    if (!knows(c, p)) continue;
    const cv = characterView(s, c, p);
    // A servant abroad whose fate this court has not heard of appears as it believes, and only there.
    if (coverOf(c, p) !== null || isOurs(c, p)) v.court.push(cv);
    else v.known.push(cv);
  }

  const archive: Tablet[] = [];
  for (const copy of s.copies.filter((x) => x.holder === p)) {
    const tab = s.tablets.find((x) => x.id === copy.tabletId);
    if (tab === undefined) continue;
    v.tablets.push(tabletView(tab, copy));
    archive.push(tab);
  }
  // Named as every court names them, with their opening words where the archive holds two of the same seals and date.
  v.tablets.forEach((view, i) => {
    if (i < archive.length) view.name = tabletName(archive[i], archive);
  });

  const asleep = s.sleep.tryGet(p);
  v.letters = letters(s, p, v.court, s.config.sleepingSeats && asleep !== undefined ? asleep.lastCalled : s.turn - 1);

  // Every court it has not heard has fallen (item 7b).
  for (const other of AllPowers.filter((x) => x !== p && !v.fallen.includes(x))) v.travelTimes.push(`${other}: ${engine.travelTurns(p, other)} season(s) each way`);

  v.prices.set("army", s.config.armyCost);
  v.prices.set("fleet", s.config.fleetCost);
  v.prices.set("armyUpkeep", s.config.armyUpkeep);
  v.prices.set("fleetUpkeep", s.config.fleetUpkeep);
  v.prices.set("tabletFee", s.config.tabletFee);
  v.prices.set("inventoryFee", s.config.inventoryFee);
  v.prices.set("assay", s.config.assayFee);
  v.prices.set("forgery", s.config.forgeFee);
  v.prices.set("siegeUpkeep", s.config.siegeUpkeep);
  v.prices.set("fortifyPerLevel", s.config.fortifyCost);
  v.prices.set("wallUpkeep", s.config.wallUpkeep);
  v.prices.set("sallyMinWalls", s.config.sallyMinWalls);
  v.prices.set("terrainDefence", s.config.terrainDefence);
  v.prices.set("seaSupply", s.config.seaSupply);
  v.prices.set("winterArmyLoss", s.config.winterArmyLoss);
  v.prices.set("winterFleetLoss", s.config.winterFleetLoss);
  // The economy at home (item 9+a): its own provinces' stores and markets, its caravans, and the free cities' asking prices.
  for (const id of ownedBy(s, p)) {
    const prov = m.get(id);
    const mk = engine.market(id);
    v.provinces.push(
      newProvinceEconomyView({
        province: id,
        stores: engine.stores(id),
        capacity: capacityOf(prov),
        tax: engine.effectiveYield(id),
        need: engine.townNeed(id),
        stock: mk.stock,
        purse: mk.purse,
        price: priceAt(mk.stock, needOf(prov)),
        // Its people (item 10+a).
        settled: engine.peopleOf(id).settled,
        men: engine.peopleOf(id).men,
        loose: engine.peopleOf(id).loose,
        room: reckonedOf(m, id).room,
        taxRate: engine.taxRate(id),
        harvest: engine.harvestNow(id),
        fed: s.fed.getOrDefault(id, 1000),
        // Item 10+b.
        runaways: new Dict([...(s.runaways.tryGet(id)?.entries() ?? [])].filter(([, n]) => n > 0)),
        expelled: s.expelled.has(id),
      }),
    );
  }
  // Yields as the people bring them in now, and the people's resistance to this court's armies (item 10+a): where the
  // court sees the land (its own and what its troops and watchers see), as its walls are; elsewhere it knows nothing new.
  for (const prov of m.landProvinces) {
    if (!seen.has(prov.id) && s.owner.getOrDefault(prov.id, null) !== p) continue;
    const full = harvestOf(prov);
    v.yields.set(prov.id, full <= 0 ? prov.yield : idiv(prov.yield * engine.harvestNow(prov.id, false), full));
    const r = engine.resistance(prov.id, p);
    if (r > 0) v.resistance.set(prov.id, r);
  }
  v.walking = sum(s.walking.filter((w) => !w.deported && s.owner.getOrDefault(w.home, null) === p), (w) => w.men);
  for (const c of s.caravans.filter((c) => c.power === p))
    v.caravans.push(newCaravanView({ from: c.from, to: c.to, grain: c.grain, at: caravanAt(c), returning: c.returning, gold: c.gold, trade: c.trade, sneak: c.sneak, ship: c.ship !== null }));
  // The economy abroad (item 9+b): foreign markets as it last knew them, and the tolls on it as last reported and its own.
  for (const [k, seen] of s.marketsSeen.tryGet(p)?.entries() ?? []) if (s.owner.getOrDefault(k, null) !== p) v.markets.set(k, { ...seen });
  // Its own tolls it knows; the others only as last reported to it (item 10+b), never posted.
  for (const t of s.tolls) if (t.holder === p) v.tolls.push({ ...t });
  for (const t of s.tollsKnown.tryGet(p) ?? []) if (t.holder !== p && isAlive(s, t.holder)) v.tolls.push({ ...t });
  for (const prov of m.landProvinces) if (!prov.kingless && s.owner.getOrDefault(prov.id, null) === null) v.cityPrices.set(prov.id, engine.cityPrice(prov.id));
  v.prices.set("basePrice", EconomyData.basePrice);
  return v;
}

/**
 * A court's record of the letters it sent, in full as its scribes wrote them: the latest letter of each of its envoys
 * still away on that errand as far as it knows (one of its people, by what it believes, not at court), and every letter
 * whose envoy's report has reached it since it last gave orders (`since`), so the king can set the report beside what he
 * sent. A letter whose envoy it knows has left its service, or died, drops out.
 */
function letters(s: GameState, p: Power, court: readonly CharacterView[], since: number): LetterView[] {
  const away = new Set(court.filter((c) => c.ours && !c.ready).map((c) => c.id));
  const latest = new Set(groupBy(s.trails.filter((t) => t.from === p && !t.pretended), (t) => t.envoyId).map(([, g]) => g[g.length - 1].id));
  return s.trails
    .filter((t) => t.from === p && !t.pretended && (t.reportTurn !== null ? t.reportTurn > since : away.has(t.envoyId) && latest.has(t.id)))
    .map((t) =>
      newLetterView({
        turn: t.turn,
        envoyId: t.envoyId,
        envoyName: t.envoyName,
        to: t.to,
        gold: t.goldStated,
        message: t.leaderLetter,
        mandate: t.mandate,
        tablet: t.proposalText,
        reportedTurn: t.reportTurn,
      }),
    );
}

/**
 * Whether `viewer` sees `c` standing at its court: anyone there in the open (its own people, envoys received there, free
 * people, anyone it holds), but not a foreign spy posted there in secret.
 */
function seenAtCourt(c: Character, viewer: Power): boolean {
  return c.at === viewer && !hiddenAt(c, viewer);
}

/**
 * Whether a court knows of a person, so that its view lists them (its court, or the people it knows): its own servants
 * (and one abroad whose fate it has not heard of, as it believes), anyone seen at its court, held there or who presented
 * themselves to it, and anyone a fact it knows names. A foreign spy posted at its court in secret is not seen there. The
 * dead are known only to the court they served.
 */
function knows(c: Character, viewer: Power): boolean {
  if (coverOf(c, viewer) !== null) return true;
  if (c.status === "Dead" && c.employer !== viewer) return false;
  return (
    isOurs(c, viewer) ||
    seenAtCourt(c, viewer) ||
    c.heldBy === viewer ||
    c.pitches.has(viewer) ||
    c.facts.some((f) => f.secrecy !== "Public" && f.knownBy.includes(viewer))
  );
}

/** A servant of the court's, at home, abroad or held captive. */
function isOurs(c: Character, viewer: Power): boolean {
  return c.employer === viewer && (c.status === "Employed" || c.status === "Captured");
}

/**
 * Whom a spy `court` caught confessed to serving when it was caught there (its latest capture there), or null if it would
 * not say: all the court learned of its master.
 */
function confessedMaster(s: GameState, id: string, court: Power): Power | null {
  let found: Power | null = null;
  let any = false;
  for (const l of s.losses)
    if (l.characterId === id && l.court === court && l.kind === "Captured") {
      found = l.master;
      any = true;
    }
  return any ? found : null;
}

function characterView(s: GameState, c: Character, viewer: Power): CharacterView {
  const cover = coverOf(c, viewer);
  if (cover !== null) return coveredView(s, c, cover);
  const ours = c.employer === viewer;
  const captive = ours && c.status === "Captured" && c.heldBy !== null;
  // A foreign spy hidden at your court is, to you, someone elsewhere: no place, no master.
  const here = seenAtCourt(c, viewer);
  // A free person at your court (not held by another) can be hired there at what they ask, whether or not they pitched.
  const freeHere = c.status === "Free" && here && (c.heldBy === null || c.heldBy === viewer);
  // The contract of one who still serves you (not of one dead in your service).
  const k: Contract | null = ours && (c.status === "Employed" || c.status === "Captured") ? c.contract : null;
  const price = c.askingPrice.tryGet(viewer);
  // The name it gave your court (item 10, "Declaring a name"): what you know of it is what you learned under that name, and
  // of a borrowed name, what you know of the man whose name it is.
  const alias = falseNameAt(c, viewer);
  const borrowed = alias?.as != null ? (s.characters.find((x) => x.id === alias.as) ?? null) : null;
  const facts = [...(borrowed !== null ? factsKnownTo(borrowed, viewer) : []), ...factsKnownTo(c, viewer)].map((f) => f.text);
  return newCharacterView({
    id: c.id,
    name: alias?.name ?? c.name,
    origin: alias === null || alias.name === c.name ? c.origin : (borrowed?.origin ?? ""),
    ours,
    status: c.status === "Captured" && c.heldBy === viewer ? "your captive" : c.status.toLowerCase(),
    // A spy you caught: whom it confessed to serving, if it did.
    employer: ours || (c.status === "Employed" && here) ? c.employer : c.status === "Captured" && c.heldBy === viewer ? confessedMaster(s, c.id, viewer) : null,
    duty: captive ? captiveText(s, c.id, c.heldBy!, viewer) : ours ? dutyText(c) : "",
    where: ours || here ? whereText(c, viewer) : "",
    timing: ours ? timingText(s, c) : "",
    fee: k?.fee ?? null,
    advance: k?.advance ?? null,
    contractFrom: k?.startTurn ?? null,
    contractUntil: k?.untilTurn ?? null,
    noticePrice: k?.noticePrice ?? null,
    leavesTurn: k?.leavesTurn ?? null,
    term: k === null ? "" : termText(k.fee, k.advance, k.untilTurn, k.noticePrice, k.leavesTurn, s.turn),
    knownFacts: facts,
    pitch: c.pitches.tryGet(viewer) ?? null,
    // What it said it can do when it pitched to you (item 10, "Kings never see skills"): words, never its skill.
    claims: c.pitches.has(viewer) && c.claimed !== null ? claimWords(c.claimed) : [],
    claimsToServe: alias?.employer ?? null,
    // Your own servant's price to serve on is in its term; an old asking price from before it was hired means nothing now.
    askingPrice: ours ? null : price !== undefined ? price : freeHere ? basePrice(c, viewer, s.goingRate) : null,
    ready: ours && c.status === "Employed" && c.duty === "None" && c.at === viewer,
    heldByYou: c.heldBy === viewer,
    intercepted: c.heldBy === viewer && c.intercepted,
    ransomDemand: captive ? (knownDemand(s, c.id, c.heldBy!, viewer)?.spend ?? null) : null,
    owed: c.owed.getOrDefault(viewer, 0) > 0 ? c.owed.get(viewer) : null,
    // Item 11a: one standing at your court, free to deal, who offers to lend you gold.
    lends: c.lendOffer !== null && c.at === viewer && c.heldBy === null && c.status !== "Dead" && !hiddenAt(c, viewer) && c.lendOffer.amount > 0 ? c.lendOffer : null,
  });
}

/**
 * Item 11a: a court's own debts that stand, as it knows them: who lent, who holds the tablet now (a holder that stands at
 * its court, or the lender as far as it knows), and what is left. A tablet gone missing still shows until the debt ends.
 */
function debtViews(s: GameState, p: Power): DebtView[] {
  return s.debts
    .filter((d) => d.borrower === p && d.ended === null)
    .map((d) => {
      const h = d.holder !== null ? (s.characters.find((c) => c.id === d.holder) ?? null) : null;
      const here = h !== null && h.at === p && h.status !== "Dead" && (h.heldBy === null || h.heldBy === p);
      const lender = s.characters.find((c) => c.id === d.lender)?.name ?? d.lender;
      return newDebtView({
        id: d.id,
        // Who holds it now, as far as the court can know: one standing at its court; else the lender it sealed it with.
        holder: here ? h!.name : lender,
        holderId: here ? h!.id : d.lender,
        lender,
        principal: d.principal,
        owed: d.owed,
        left: debtLeft(d),
        sealedTurn: d.sealedTurn,
        dueTurn: d.dueTurn,
        here,
      });
    });
}

/** A servant as its master still believes it to be: the same fields the master saw before, never ready. */
function coveredView(s: GameState, c: Character, cover: Cover): CharacterView {
  const held = cover.heldAt;
  return newCharacterView({
    id: c.id,
    name: c.name,
    origin: c.origin,
    ours: true,
    status: held === null ? "employed" : "captured",
    employer: cover.for,
    duty: held !== null ? captiveText(s, c.id, held, cover.for) : cover.dutyText,
    where: held !== null ? `at the court of ${held}` : cover.whereText,
    timing: held === null ? cover.timingText : "",
    fee: cover.fee,
    advance: cover.advance,
    contractFrom: cover.startTurn,
    contractUntil: cover.contractUntil,
    noticePrice: cover.noticePrice,
    leavesTurn: cover.leavesTurn,
    term: termText(cover.fee, cover.advance, cover.contractUntil, cover.noticePrice, cover.leavesTurn, s.turn),
    // What it knew then and what its inquiries have found since, as for a servant really away.
    knownFacts: c.facts.filter((f) => cover.factIds.includes(f.id) || (f.secrecy !== "Public" && f.knownBy.includes(cover.for))).map((f) => f.text),
    pitch: c.pitches.tryGet(cover.for) ?? null,
    ransomDemand: held !== null ? (knownDemand(s, c.id, held, cover.for)?.spend ?? null) : null,
    owed: c.owed.getOrDefault(cover.for, 0) > 0 ? c.owed.get(cover.for) : null,
  });
}

/**
 * A servant's job in plain words, as its master reads it (item 11a): the fee, what was handed over and what falls due when
 * it is done, the last season of the term and what happens then, or, once it has given notice, its price to serve on and
 * when it leaves. `fee` is null when no job is to be said.
 */
function termText(fee: number | null, advance: number | null, until: number | null, noticePrice: number | null, leavesTurn: number | null, turn: number): string {
  const serves = fee !== null ? `a job for ${fee} shekels, ${advance ?? 0} handed over and ${Math.max(0, fee - (advance ?? 0))} due when it is done` : null;
  if (noticePrice !== null)
    return (
      (serves === null ? "" : serves + "; ") +
      `has given notice: asks ${noticePrice} a season of a new term to serve on; ` +
      (leavesTurn !== null && leavesTurn > turn ? `leaves at the start of turn ${leavesTurn} unless renewed` : "leaves when next at your court unless renewed")
    );
  if (serves === null) return "";
  if (until === null) return serves;
  const notice = "otherwise they give a season's notice and name a price";
  return until >= turn
    ? `${serves}, through turn ${until}; when it is done at your court, if content they serve on for 6 seasons on the same terms, ${notice}`
    : `${serves}; the term ended with turn ${until}: the job is done when they are next at your court with no task, and then, if content, they serve on for 6 seasons on the same terms, ${notice}`;
}

/**
 * When one of your servants away set out and when it is due back, as its master can reckon it from the travel table: an
 * envoy on its way out, at a foreign court or on the road home, a spy on its way to its post or home. Blank at court,
 * held, or at its post. A cover keeps this text as it stood (Cover.timingText).
 */
function timingText(s: GameState, c: Character, map: WorldMap | null = null): string {
  const m = map ?? WorldMap.default;
  const home = c.employer;
  if (c.status !== "Employed" || home === null) return "";
  const journey = s.journeys.find(
    (j) => j.characterId === c.id && (j.kind === "EnvoyOutbound" || j.kind === "EnvoyHomebound" || j.kind === "SpyOutbound" || j.kind === "SpyHomebound"),
  );
  const trail = c.currentTrail !== null ? (s.trails.find((x) => x.id === c.currentTrail && x.from === home) ?? null) : null;
  const back = (from: Power): number => travelTurns(s.config, m, m.capital(from).id, m.capital(home).id, s.turn);
  switch (c.duty) {
    // On its way the reckoning is a reckoning ("due there"); only once it stands at that court is it "received there".
    case "EnvoyOutbound":
      if (journey?.kind === "EnvoyOutbound") return `set out in turn ${journey.departTurn} for ${journey.to}; due there about turn ${journey.arriveTurn}; due back about turn ${journey.arriveTurn + back(journey.to)}`;
      return "";
    case "EnvoyAtCourt":
      if (trail !== null && c.at !== null) return `set out in turn ${trail.turn} for ${c.at}; received there in turn ${s.turn}; due back about turn ${s.turn + back(c.at)}`;
      return "";
    case "EnvoyHomebound":
      if (journey?.kind === "EnvoyHomebound" && trail !== null) return envoyHomeTiming(trail.turn, trail.to, journey.arriveTurn);
      if (journey !== undefined && (journey.kind === "EnvoyHomebound" || journey.kind === "SpyHomebound")) return homeTiming(journey.arriveTurn);
      return "";
    case "SpyOutbound":
      if (journey?.kind === "SpyOutbound") return `set out in turn ${journey.departTurn}; due there about turn ${journey.arriveTurn}`;
      return "";
    default:
      return "";
  }
}

/** An envoy on the road home: what its master reads, and what a cover keeps when the envoy is held or goes over. */
function envoyHomeTiming(setOut: number, to: Power, due: number): string {
  return `set out in turn ${setOut} for ${to}; ${homeTiming(due)}`;
}

/** A servant on the road home with no mission of its own to name (a spy recalled). */
function homeTiming(due: number): string {
  return `due back about turn ${due}`;
}

/** One of the viewer's people held captive abroad, with the ransom demanded if that word has reached it. */
function captiveText(s: GameState, id: string, heldAt: Power, viewer: Power): string {
  const demand = knownDemand(s, id, heldAt, viewer);
  return demand !== null
    ? `held captive at the court of ${heldAt}; ${heldAt} demands ${formatMoney(demand.spend)} for their return (order pay_ransom)`
    : `held captive at the court of ${heldAt}`;
}

/** The open ransom demand for a captive, once its rumour has reached the court asked to pay. */
function knownDemand(s: GameState, id: string, heldAt: Power, payer: Power): PendingTask | null {
  let found: PendingTask | null = null;
  for (const t of s.tasks) if (t.kind === "RansomDemand" && t.announced && t.characterId === id && t.requester === payer && t.other === heldAt) found = t;
  return found;
}

function dutyText(c: Character): string {
  if (c.duty === "UnderGuard") return "a captive on the road under guard";
  if (c.status === "Captured" && c.heldBy !== null) return `held captive at the court of ${c.heldBy}`;
  switch (c.duty) {
    case "None":
      return "at court, ready for a mission";
    case "EnvoyOutbound":
      return `travelling as envoy to ${c.missionTarget ?? ""}`;
    case "EnvoyAtCourt":
      return `at the court of ${c.at ?? ""} as envoy`;
    case "EnvoyHomebound":
      return "on the road home";
    case "Detained":
      return `has not returned from ${c.missionTarget ?? ""}`;
    case "SpyOutbound":
      return `travelling on a quiet errand to ${c.missionTarget ?? c.watchProvince ?? ""}`;
    case "SpyPosted":
      return `watching ${c.missionTarget ?? c.watchProvince ?? ""}`;
    case "Travelling":
      return "travelling on their own way";
  }
}

function whereText(c: Character, viewer: Power): string {
  if (c.status === "Captured") return c.heldBy === viewer ? "in your prison" : c.heldBy !== null && c.employer === viewer ? `at the court of ${c.heldBy}` : "unknown";
  if (c.duty === "Detained" && c.employer === viewer) return "unknown";
  if (c.at !== null) return c.at === viewer ? "at your court" : `at the court of ${c.at}`;
  return c.watchProvince !== null ? `in ${c.watchProvince}` : "travelling";
}

/**
 * A tablet as every court names it: an inventory or a tablet, by its seals and the date it bears ("the tablet sealed by
 * Babylonia and Mitanni, dated turn 2"). Where `among` holds another of the same kind, seals and date, its opening words
 * are added. Never a copy id, which is each court's own: a name another court can read.
 */
function tabletName(t: Tablet, among: Iterable<Tablet> | null = null): string {
  const name = `the ${t.inventory ? "inventory" : "tablet"} sealed by ${listed(t.seals)}${t.sealedTurn !== null ? `, dated turn ${t.sealedTurn}` : ""}`;
  let twin = false;
  if (among !== null)
    for (const o of among)
      if (o.id !== t.id && o.inventory === t.inventory && o.sealedTurn === t.sealedTurn && o.seals.length === t.seals.length && o.seals.every((x, i) => x === t.seals[i])) {
        twin = true;
        break;
      }
  return twin ? `${name}, beginning "${opening(t.text)}"` : name;
}

/** A text with its first letter capitalized, to open a sentence. */
function capitalized(s: string): string {
  if (s.length === 0) return s;
  const up = s[0].toUpperCase();
  return (up.length === 1 ? up : s[0]) + s.slice(1);
}

/** "Egypt", "Egypt and Hatti", "Egypt, Hatti and Mitanni". */
function listed(seals: readonly Power[]): string {
  return seals.length <= 1 ? seals.join("") : `${seals.slice(0, -1).join(", ")} and ${seals[seals.length - 1]}`;
}

/** A text's first eight words, marked "…" if there are more. */
function opening(text: string): string {
  const words = split(text, " ", true);
  return words.length <= 8 ? words.join(" ") : words.slice(0, 8).join(" ") + "…";
}

function tabletView(t: Tablet, copy: TabletCopy): TabletView {
  return newTabletView({
    name: tabletName(t),
    copyId: copy.id,
    tabletId: t.id,
    text: t.text,
    clauses: t.clauses.map((c) => ({ ...c })),
    seals: [...t.seals],
    proposedBy: t.proposedBy,
    partner: t.partner,
    sealedTurn: t.sealedTurn,
    allianceOath: t.allianceOath,
    source: copy.source,
    authResult: copy.authResult,
    byHand: t.byHand,
    byHandOf: t.byHandOf,
    within: copy.holder === t.byHandOf || (copy.holder === t.proposedBy && t.credentialsShown) ? t.within : null,
    repudiatedTurn: t.repudiatedTurn,
  });
}

/** The views of the game: what each court sees (the C# build's static class Views). */
export const Views = {
  landStandings,
  looksDoomed,
  sight,
  wallsKnown,
  ownerAt,
  knownHolders,
  for: seatView,
  letters,
  seenAtCourt,
  knows,
  confessedMaster,
  character: characterView,
  termText,
  timingText,
  envoyHomeTiming,
  homeTiming,
  knownDemand,
  dutyText,
  tabletName,
  capitalized,
  tablet: tabletView,
  MaxWhileAsleep,
};
