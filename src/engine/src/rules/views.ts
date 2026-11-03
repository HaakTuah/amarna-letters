/** What each court sees: the seat view, sight, the walls it knows, and how it sees each person and tablet. */
import { newsOffered } from "./news.ts";
import { Dict, HSet } from "../core/collections.ts";
import { idiv } from "../core/num.ts";
import { cmpBool, cmpNum, desc, groupBy, sortBy, sum } from "../core/seq.ts";
import { cmpStr, split } from "../core/text.ts";
import { WorldMap } from "../model/map.ts";
import { coverOf, factsKnownTo, falseNameAt, hiddenAt, jobKnown, newContract, type Character, type Contract, type Cover } from "../model/people.ts";
import { claimWords } from "./skills.ts";
import { tongueWords } from "../model/languages.ts";
import { AllPowers, asSeenBy, claimantsOf, claimedName, cmpPower, contestedNames, kingFor, land, nameGivenBy, ownLand, type Power } from "../model/power.ts";
import type { PendingTask, Tablet, TabletCopy } from "../model/records.ts";
import { newScheduledOrders, type ScheduledOrders } from "../model/sleep.ts";
import { sameConditions } from "./conditions.ts";
import { levelOf } from "../model/works.ts";
import { huntNow, inboxOf, isAlive, ledger, upkeepOf, wallsOf, type GameState, type Unit } from "../model/state.ts";
import { PointsPerDay } from "../model/travel.ts";
import { EconomyData, harvestOf } from "../model/economy.ts";
import { strength as scoringStrength } from "./scoring.ts";
import { unitCarried } from "../model/land.ts";
import { declarationKnown } from "../model/declarations.ts";
import { moodsKnown } from "../model/moods.ts";
import { governorsKnown, seatKnown } from "../model/command.ts";
import { grantStandsFor, newGrantView } from "../model/authority.ts";
import { type CaravanView, newCharacterView, newNewsOffer, newBandSeen, newDebtView, newLotView, newSeatView, newGovernorView, newDeclaredView, newMoodSeenView, newSiegeView, newTabletView, newUnitView, type UnitView, newLetterView, landGrowth, type CharacterView, type DebtView, type LandStanding, type LetterView, type SeatView, type TabletView, newWorkView } from "../model/views.ts";
import { newStandingOrderView } from "../model/sleep.ts";
import type { InboxItem } from "../model/records.ts";
import { formatMoney, season } from "./calendar.ts";
import { courtOf } from "./court.ts";
import { carriedWorth, ownKnown } from "./province-reports.ts";
import { caravansKnown, wordCame } from "./caravans-known.ts";
import { ownUnitsKnown, plannedAsKnown, reportedAt, reportIndex, reportOf, trailEntry } from "./units-known.ts";
import { knownHolders, ownerAt, SeenSource, siegesKnown, sight, wallsKnown, WordSource } from "./known-land.ts";

export { SeenSource, WordSource };
import { ageBand } from "./ending.ts";
import { omenLine } from "./omens.ts";
import { TurnEngine } from "../turn/turn-engine.ts";
import { asShown, basePrice, LetterData, trustIn } from "../turn/turn-engine.ts";
import { debtLeft, isPowerParty, standsForBorrower } from "../model/money.ts";
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

/** A sleeping seat wakes to at most this many items of the news of the seasons it slept. */
export const MaxWhileAsleep = 40;

/**
 * A treasury notice that only gives the season's figures: stale once another season has passed (the latest is in this
 * season's news). One that says troops deserted or people went unpaid is kept.
 */
function routineTreasury(i: InboxItem): boolean {
  return i.kind === "Notice" && i.title === "The treasury" && !i.body.includes("deserted") && !i.body.includes("Could not pay");
}

/**
 * The troops a court sees: its own as their last reports place them, and others' where it sees. A report never puts two
 * troops in one province: one shown where another stands (or is shown) is shown by an older report of its own whose place
 * is free, and left out if it has none (never by where it truly is: that news has not come yet). Each unit is placed in
 * turn, so two reported into one province never take the same older place.
 */
function unitsSeen(s: GameState, engine: TurnEngine, p: Power, seen: { has(province: string): boolean }, view: (u: Unit) => UnitView): UnitView[] {
  // Bug #600: its own as it knows them (raised, and not yet heard to be gone), others' where it sees them.
  const units = [...ownUnitsKnown(engine, p), ...s.units.filter((u) => u.power !== p && seen.has(u.province))];
  const pairs: [Unit, UnitView | null][] = units.map((u) => [u, view(u)]);
  // Where two reports share a place, a gone unit's gives way first: the live one is the one its orders name there.
  for (const pair of [...pairs.filter(([u]) => u.goneTurn > 0), ...pairs.filter(([u]) => u.goneTurn === 0)]) {
    const [u, x] = pair;
    if (x === null || x.reported === 0 || u.power !== p || !pairs.some((y) => y !== pair && y[1]?.province === x.province)) continue;
    const at = reportIndex(engine, u);
    if (at === null) continue;
    pair[1] = null;
    const taken = new HSet(pairs.filter((y) => y !== pair && y[1] !== null).map((y) => y[1]!.province));
    for (let i = at - 1; i >= 0; i--) {
      const r = trailEntry(u.trail[i]);
      if (!taken.has(r.province)) {
        pair[1] = { ...x, ...r, reported: reportedAt(engine, u, i) };
        break;
      }
    }
  }
  // One unit to a province, as on the map: a gone unit with no report left to give way to is not shown over a live one.
  const held = new HSet(pairs.filter(([u, x]) => u.power === p && u.goneTurn === 0 && x !== null).map(([, x]) => x!.province));
  for (const pair of pairs) if (pair[0].power === p && pair[0].goneTurn > 0 && pair[1] !== null && !held.add(pair[1].province)) pair[1] = null;
  return pairs.map(([, x]) => x).filter((x): x is UnitView => x !== null);
}

function seatView(s: GameState, p: Power, map: WorldMap | null = null): SeatView {
  const m = map ?? WorldMap.default;
  const engine = new TurnEngine(s, m);
  const seen = sight(s, m, p);
  const known = knownHolders(s, m, p, seen);
  const own = ownKnown(s, engine, m, p, seen, known);
  const t = s.treasuries.get(p);
  const v = newSeatView({
    claims: s.claims.map((c) => ({ ...c })),
    greetings: s.recognition.filter((r) => r.from === p || r.to === p).map((r) => ({ ...r })),
    // Item 17+: the names claimed, as this court gives them.
    claimedName: claimedName(p),
    nameClaims: contestedNames(p).map((name) => {
      const claimants = claimantsOf(name, p);
      const heard = s.namesHeard.tryGet(p);
      return {
        name,
        claimants,
        givenTo: nameGivenBy(p, name),
        heard: claimants.flatMap((c) => {
          const h = c === p || name === ownLand(c) ? undefined : heard?.tryGet(c);
          return h === undefined ? [] : [{ claimant: c, sealed: h.sealed }];
        }),
      };
    }),
    turn: s.turn,
    season: season(s.turn, p),
    power: p,
    king: kingFor(p, p),
    courtAt: courtOf(s, m, p),
    courtTo: s.kingRoads.find((r) => r.power === p)?.to ?? null,
    // Its governors as it knows them: one whose end (death, turning, land lost) has not yet reached it still stands.
    governors: governorsKnown(s, s.turn).filter((g) => g.power === p).map((g) => newGovernorView({ province: g.province, seat: seatKnown(g, s.turn), character: g.character, from: g.from, levies: g.levies, raised: g.raised, relieving: g.relieved !== null })),
    ended: s.ended,
    openAge: s.config.openAge,
    ageBand: ageBand(s.config.endMedian),
    omens: omenLine(s.seed, s.config, s.turn, p),
    councilOn: !s.councilOff.includes(p),
    gold: ledger(t),
    unassayedGold: t.lots.map((l) => newLotView({ id: l.id, from: l.from, stated: l.stated, weighed: l.face, arrivedTurn: l.arrivedTurn })),
    income: engine.income(p),
    // Bug #540: its works as it knows its land, those farther off as last reported.
    ...(() => {
      const works = [...own.values()].flatMap((x) => x.works);
      return { works, worksUpkeep: works.reduce((a, w) => a + w.upkeepGold + w.buildGold, 0) };
    })(),
    feesDue: engine.feesDue(p),
    feesOwed: engine.feesOwed(p),
    fees: engine.feeRates(p),
    trust: trustIn(s, p),
    kept: s.payRecords.tryGet(p)?.kept ?? 0,
    broken: s.payRecords.tryGet(p)?.broken ?? 0,
    payCarriers: s.payCarriers.includes(p),
    ...(() => {
      const o = upkeepOf(s, p);
      const held = (ids: string[]): string[] => sortBy([...new Set(s.units.filter((u) => u.power === p && ids.includes(u.id)).map((u) => u.province))], [(x: string) => x, cmpStr]);
      return { payTroops: o.pay, feedTroops: o.feed, payHeld: held(o.payExcept), feedHeld: held(o.feedExcept) };
    })(),
    huntBands: huntNow(s, p) !== null,
    huntWhere: huntNow(s, p)?.provinces ?? [],
    debts: debtViews(s, p),
    debtsHeld: claimViews(s, p),
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
      // A grant by order (item 11a+): its grantor knows it from the order; its grantee once the news reaches him. Its
      // end reaches the grantee by word too (bug #565).
      .filter(
        (g) =>
          (g.grantor === p || g.grantee === p) &&
          (grantStandsFor(g, p, s.turn) || (g.tabletId === "" && g.endedTurn === null && g.sinceTurn === s.turn + 1)) &&
          (g.tabletId === "" ? g.grantor === p || g.heardTurn <= s.turn : s.copies.some((k) => k.holder === p && k.tabletId === g.tabletId)),
      )
      .map((g) => {
        const t = s.tablets.find((x) => x.id === g.tabletId);
        return newGrantView({ kind: g.kind, grantor: g.grantor, grantee: g.grantee, province: g.province, sinceTurn: g.sinceTurn, untilTurn: g.untilTurn, tablet: t !== undefined ? tabletName(t) : "by order" });
      }),
    walls: wallsKnown(s, m, p, seen),
    worksSeen: [...seen]
      .filter((x) => !m.get(x).isSea && s.owner.getOrDefault(x, null) !== p)
      .sort(cmpStr)
      .flatMap((x) =>
        (["Roads", "Stations", "Harbour", "Water"] as const)
          .filter((k) => levelOf(s, k, x) > 0)
          .map((k) => newWorkView({ province: x, kind: k, level: levelOf(s, k, x), keep: levelOf(s, k, x) })),
      ),
    // The sieges it knows of: those it sees, and its own and its cities' farther off once word of them came (bug #517).
    // Out of its sight, the holder and walls as it knows them; how tight the ring is, only where it sees or its army besieges.
    sieges: siegesKnown(s, m, p, seen)
      .map((x) =>
        newSiegeView({
          province: x.province,
          besieger: x.power,
          holder: seen.has(x.province) ? s.owner.getOrDefault(x.province, null) : (known.tryGet(x.province)?.owner ?? null),
          progress: x.progress,
          walls: seen.has(x.province) ? wallsOf(s, x.province) : wallsKnown(s, m, p, seen).getOrDefault(x.province, 0),
          since: x.since,
          tightness: x.power === p || (seen.has(x.province) && s.owner.getOrDefault(x.province, null) === p) ? engine.tightness(x) : null,
        }),
      ),
    units: unitsSeen(s, engine, p, seen, (u) =>
      u.power === p
        ? newUnitView({ power: u.power, kind: u.kind, province: u.province, food: u.food, carried: unitCarried({ ...u, men: (reportOf(engine, u) as { men?: number }).men ?? u.men }), hungry: u.hungry, unpaid: u.unpaid, savings: u.savings, men: u.men, buy: u.buy, chest: u.chest, ...marchOf(engine, u), commander: u.commander, commandFrom: u.commandFrom, relieving: u.relieveAt !== null, mandate: u.mandate, mandateFrom: u.mandateFrom, hiredMen: u.hiredMen, hiredUntil: u.hiredUntil, ...reportOf(engine, u) })
        : newUnitView({ power: u.power, kind: u.kind, province: u.province, men: u.men }),
    ),
    visible: m.provinces.filter((x) => seen.has(x.id)).map((x) => x.id),
    // The fallen kingdoms it has heard of (word of a fall travels): all of them, for a fallen court's last view.
    fallen: isAlive(s, p) ? s.eliminated.filter((x) => (s.fallsHeard.tryGet(p) ?? []).includes(x)) : [...s.eliminated],
    // Item 11b: the bands it sees, in its sight and in its own land (its people tell of them).
    bands: s.bands
      .filter((b) => seen.has(b.province) || s.owner.getOrDefault(b.province, null) === p)
      .map((b) => newBandSeen({ province: b.province, men: b.men, chief: s.characters.find((c) => c.id === b.leaderId)?.name ?? "", ship: b.ship })),
    inbox: inboxOf(s, p).filter((i) => i.turn === s.turn),
    unheardHere: s.unheard.filter((a) => a.host === p).map((a) => a.envoyId),
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
      // A unit raised far off is named by its levy until word of its raising comes (bug #600).
      const shown = asShown(s, p, plannedAsKnown(engine, p, x));
      if (last !== null && last.turn === x.turn && sameConditions(last.conditions, x.conditions)) last.orders.push(shown);
      else entries.push(newScheduledOrders({ turn: x.turn, orders: [shown], conditions: [...x.conditions] }));
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
    if (!knows(c, p) || unheardHire(s, c, p)) continue;
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
  v.prices.set("sallyMinWalls", s.config.sallyMinWalls);
  v.prices.set("terrainDefence", s.config.terrainDefence);
  v.prices.set("seaSupply", s.config.seaSupply);
  v.prices.set("winterArmyLoss", s.config.winterArmyLoss);
  v.prices.set("winterFleetLoss", s.config.winterFleetLoss);
  // The economy at home (item 9+a): its own provinces' stores and markets, its caravans. Item 17++: the provinces it knows
  // it holds; bug #540: those beyond its couriers' season as their last report has them, a lost one until word of the
  // loss arrives, a gained one once it hears.
  for (const x of own.values()) v.provinces.push(x.economy);
  v.counting = s.censuses.filter((c) => c.power === p).map((c) => c.province);
  // A kingship offered stands in its view until word of its answer reaches the court.
  v.crowning = s.crowns.filter((k) => k.power === p && (k.heard === null || k.heard > s.turn)).map((k) => k.character);
  // As word of them has reached it: one ended stands until word of its end comes; taken up once word of that came home.
  v.moods = [...moodsKnown(s, p).values()].map((r) => newMoodSeenView({ province: r.province, mood: r.mood, seen: r.seen, source: r.source }));
  v.declared = s.declarations.filter((d) => d.power === p && declarationKnown(d, s.turn)).map((d) => newDeclaredView({ province: d.province, from: d.from, takenUp: d.takenKnown !== null && d.takenKnown <= s.turn }));
  // Yields as the last reaping brought them in (item 17++), and the people's resistance to this court's armies (item 10+a): where the
  // court sees the land (its own and what its troops and watchers see), as its walls are; elsewhere it knows nothing new.
  for (const prov of m.landProvinces) {
    if (!seen.has(prov.id) && !own.has(prov.id)) continue;
    const full = harvestOf(prov);
    // Item 17++: what its last reaping brought in, a season's third of it, as the stewards (or the troops who saw the fields)
    // know it; never the hands there now, which only a count tells.
    // Bug #540: its own land farther off, by its officials' last report.
    const reaped = (own.has(prov.id) ? own.get(prov.id).reaped : s.reaped.tryGet(prov.id)) ?? full * 3;
    v.yields.set(prov.id, full <= 0 ? prov.yield : idiv(prov.yield * idiv(reaped, 3), full));
    // Its people's resistance only where it sees them (bug #517); its own land farther off, by its yields alone.
    const r = seen.has(prov.id) ? engine.resistance(prov.id, p) : 0;
    if (r > 0) v.resistance.set(prov.id, r);
  }
  v.foodSent = s.foodWord.filter((w) => w.power === p).map((w) => ({ province: w.province, gold: w.gold, buy: w.buy, at: w.at }));
  // Bug #540: walking home to the land it knows it holds; its caravans as their reports have come.
  const homeward = s.walking.filter((w) => known.tryGet(w.home)?.owner === p && (w.from === "" || wordCame(engine, p, w.departs, w.from)));
  v.walking = sum(homeward.filter((w) => !w.deported), (w) => w.men);
  v.caravans.push(...caravansKnown(engine, p));
  // What its troops cost as it knows them (bug #600).
  v.upkeep = engine.upkeep(p, v.units.filter((u) => u.power === p));
  // Its strength as it reckons it: its gold by its ledger, which counts unassayed lots at their weight (a seat must never
  // see true strength, or it could read debased gold off the difference); bug #540: from what it knows, its land and
  // their stores as last reported, its troops and caravans as their reports have them.
  v.strength = scoringStrength(
    s.config,
    sum([...own.values()], (x) => x.worth),
    ledger(t),
    sum([...own.values()], (x) => x.holding) +
      sum(v.units.filter((u) => u.power === p), (u) => carriedWorth(u.food, u.savings)) +
      sum(homeward, (w) => w.savings) +
      sum(v.caravans, (c) => carriedWorth(c.grain, c.gold)),
  );
  // The economy abroad (item 9+b): foreign markets as it last knew them, and the tolls on it as last reported and its own.
  // Its own, as it knows its land (bug #517), are among its provinces instead.
  for (const [k, seen] of s.marketsSeen.tryGet(p)?.entries() ?? []) if (known.tryGet(k)?.owner !== p) v.markets.set(k, { ...seen });
  // Its own tolls it knows; the others only as last reported to it (item 10+b), never posted.
  for (const t of s.tolls) if (t.holder === p) v.tolls.push({ ...t });
  for (const t of s.tollsKnown.tryGet(p) ?? []) if (t.holder !== p && isAlive(s, t.holder)) v.tolls.push({ ...t });
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
  // Item 13: one who holds the king's command or governorship is his, in his service or free.
  return (c.employer === viewer && (c.status === "Employed" || c.status === "Captured")) || (c.grantedBy === viewer && c.status !== "Dead");
}

/** One its court does not know took its job yet (an offer taken abroad, whose word is on the road): it sees nothing of it. */
function unheardHire(s: GameState, c: Character, viewer: Power): boolean {
  return c.employer === viewer && !jobKnown(c, s.turn);
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
  const ours = c.employer === viewer || c.grantedBy === viewer;
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
    fee: k === null ? null : k.fee + k.carried,
    advance: k?.advance ?? null,
    contractFrom: k?.startTurn ?? null,
    contractUntil: k?.untilTurn ?? null,
    errandWhat: k?.errand?.what ?? null,
    errandWhere: k?.errand?.where ?? null,
    // Whether its errand is done its master knows once it is home with nothing to do.
    errandDone: (k?.errand?.done ?? false) && c.duty === "None" && c.at === viewer,
    payOnDone: k?.payOnDone ?? false,
    won: c.won,
    lost: c.lost,
    offerAgain: k?.offerAgain ?? false,
    term: k === null ? "" : termText(k.fee + k.carried, k.advance, k.untilTurn, s.turn, k),
    knownFacts: facts,
    pitch: c.pitches.tryGet(viewer) ?? null,
    // What it said it can do when it pitched to you (item 10, "Kings never see skills"): words, never its skill.
    claims: c.pitches.has(viewer) && c.claimed !== null ? claimWords(c.claimed) : [],
    // Item 12: the languages it says it speaks, to a court where it stands (its master's too) or where it pitched; of a
    // servant away its master knows only what it said before it went, and is not told it again here.
    speaks: here || c.pitches.has(viewer) ? tongueClaimsAs(c) : [],
    claimsToServe: alias?.employer ?? null,
    // Your own servant's price to serve on is in its term; an old asking price from before it was hired means nothing now.
    askingPrice: ours ? null : price !== undefined ? price : freeHere ? basePrice(c, viewer) : null,
    ready: ours && c.status === "Employed" && c.duty === "None" && c.at === viewer,
    heldByYou: c.heldBy === viewer,
    intercepted: c.heldBy === viewer && c.intercepted,
    ransomDemand: captive ? (knownDemand(s, c.id, c.heldBy!, viewer)?.spend ?? null) : null,
    ransomCarrier: c.status === "Captured" && c.heldBy === viewer ? ransomCarrier(s, c, viewer) : null,
    owed: c.owed.getOrDefault(viewer, 0) > 0 ? c.owed.get(viewer) : null,
    hoardHere: c.hoard !== null && c.hoard.at === viewer && c.status !== "Dead" ? c.hoard.gold : null,
    carries: c.status === "Captured" && c.heldBy === viewer ? c.purse + c.carriedFor : null,
    // Item 11a: one standing at your court, free to deal, who offers to lend you gold.
    // A copy: the view is what the court saw when it was asked, not a window on the lender's purse as the season moves it.
    lends: c.lendOffer !== null && c.at === viewer && c.heldBy === null && c.status !== "Dead" && !hiddenAt(c, viewer) && c.lendOffer.amount > 0 ? { ...c.lendOffer } : null,
    // Item 11b: the news of other courts they offer you, standing at your court.
    news: hiddenAt(c, viewer) ? [] : newsOffered(s, c, viewer).map((n) => newNewsOffer({ court: n.court, turn: n.turn, lines: n.lines.length, price: n.price })),
  });
}

/**
 * Item 12: the languages a person says it speaks, in words: what it believes, one who overrates itself claiming a level
 * more ("may boast that it is fluent").
 */
export function tongueClaimsAs(c: Character): string[] {
  const boast = c.inclination > 10 ? 40 : 0;
  return [...c.tongues.entries()]
    .filter(([, x]) => x > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([l, x]) => `${l} (${tongueWords(Math.min(100, x + boast))})`);
}

/**
 * Item 11a: a court's own debts that stand, as it knows them: who lent, who holds the tablet now (a holder that stands at
 * its court, or the lender as far as it knows), and what is left. A tablet gone missing still shows until word of it
 * reaches the court (the owner's answers to item 11a).
 */
function debtViews(s: GameState, p: Power): DebtView[] {
  return s.debts
    .filter((d) => d.borrower === p && standsForBorrower(d, s.turn))
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

/** The owner's answers to item 11a: the tablets in a court's archive of others' debts, with the borrower and where it stands. */
function claimViews(s: GameState, p: Power): DebtView[] {
  return s.debts
    .filter((d) => d.holder === p && d.ended === null && d.borrower !== p)
    .map((d) => {
      const b = isPowerParty(d.borrower) ? null : (s.characters.find((c) => c.id === d.borrower) ?? null);
      return newDebtView({
        id: d.id,
        holder: b?.name ?? d.borrower,
        holderId: d.borrower,
        lender: s.characters.find((c) => c.id === d.lender)?.name ?? d.lender,
        principal: d.principal,
        owed: d.owed,
        left: debtLeft(d),
        sealedTurn: d.sealedTurn,
        dueTurn: d.dueTurn,
        here: b !== null && b.at === p && b.status !== "Dead" && b.heldBy === null && !hiddenAt(b, p),
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
    errandWhat: cover.errand?.what ?? null,
    errandWhere: cover.errand?.where ?? null,
    errandDone: cover.errand?.done ?? false,
    payOnDone: cover.payOnDone,
    offerAgain: cover.offerAgain,
    term: termText(cover.fee, cover.advance, cover.contractUntil, s.turn, newContract({ fee: cover.fee, advance: cover.advance, errand: cover.errand, payOnDone: cover.payOnDone, offerAgain: cover.offerAgain })),
    // What it knew then and what its inquiries have found since, as for a servant really away.
    knownFacts: c.facts.filter((f) => cover.factIds.includes(f.id) || (f.secrecy !== "Public" && f.knownBy.includes(cover.for))).map((f) => f.text),
    pitch: c.pitches.tryGet(cover.for) ?? null,
    ransomDemand: held !== null ? (knownDemand(s, c.id, held, cover.for)?.spend ?? null) : null,
    owed: c.owed.getOrDefault(cover.for, 0) > 0 ? c.owed.get(cover.for) : null,
  });
}

/**
 * A servant's job in plain words, as its master reads it (item 11a, with the owner's answers): its errand, the fee, what was
 * handed over and what falls due when it is done, by when, and the standing orders that go with it. `fee` is null when
 * no job is to be said.
 */
function termText(fee: number | null, advance: number | null, until: number | null, turn: number, k: Contract | null = null): string {
  if (fee === null) return "";
  const e = k?.errand ?? null;
  const errand = e === null ? "a job whose first errand you name when you send them" : e.what === "stay" ? "a job to stay at your court until its term ends (any other errand is a new job, with its own fee)" : `a job as ${e.what === "envoy" ? `envoy to ${e.where}` : `spy on ${e.where}`}`;
  const serves = `${errand}, for ${fee} shekels, ${advance ?? 0} handed over and ${Math.max(0, fee - (advance ?? 0))} due when it is done`;
  const standing = k === null ? "" : `${k.payOnDone ? "; you ordered the rest paid when it is done" : "; the rest is paid only if you order it (pay_fee)"}${k.offerAgain ? "; the same job is offered again when it is done" : ""}`;
  if (until === null) return serves + standing;
  return until >= turn
    ? `${serves}, by turn ${until}${standing}. When it is done at your court, the job ends`
    : `${serves}; its term ended with turn ${until}: the job is done when they are next at your court with no task${standing}`;
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
  const back = (from: Power): number => travelTurns(s.config, m, courtOf(s, m, from), courtOf(s, m, home), s.turn);
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

/** What the cheapest free person at the captor's court would ask to carry its ransom demand to the captive's king, or null. */
function ransomCarrier(s: GameState, c: Character, captor: Power): number | null {
  const payer = c.employer !== null ? c.employer : c.formerEmployer;
  if (payer === null || !isAlive(s, payer) || !isAlive(s, captor)) return null;
  const m = WorldMap.default;
  const seasons = Math.max(1, travelTurns(s.config, m, courtOf(s, m, captor), courtOf(s, m, payer), s.turn));
  const asks = s.characters
    .filter((x) => x.status === "Free" && x.at === captor && x.duty === "None" && x.heldBy === null && x.errand === null)
    .map((x) => idiv(basePrice(x, payer) * seasons * LetterData.hiredPercent, 100));
  return asks.length === 0 ? null : Math.min(...asks);
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
      return `watching ${c.missionTarget !== null ? land(c.missionTarget) : c.watchProvince !== null && WorldMap.default.exists(c.watchProvince) ? WorldMap.default.get(c.watchProvince).name : (c.watchProvince ?? "")}`;
    case "Travelling":
      return "travelling on their own way";
    case "Leading":
      return `leading a band in ${c.watchProvince ?? ""}`;
    case "Commanding":
      return `commanding an army in ${c.watchProvince ?? ""}`;
    case "Governing":
      return `governing ${c.watchProvince ?? ""}`;
    case "Ruling":
      return `ruling ${c.at ?? ""} in his own name`;
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
  // Item 12, "Reading a tablet": a tablet nobody at the court has read waits for a reader; its seals are plain to see.
  const unread = copy.unread === true;
  return newTabletView({
    name: tabletName(t),
    copyId: copy.id,
    tabletId: t.id,
    text: unread ? `A tablet written in ${t.tongue !== "" ? t.tongue : "a tongue your scribes do not read"}, which nobody at your court has read yet: it waits for a reader.` : t.text,
    clauses: unread ? [] : t.clauses.map((c) => ({ ...c })),
    unread,
    seals: [...t.seals],
    proposedBy: t.proposedBy,
    partner: t.partner,
    sealedTurn: t.sealedTurn,
    allianceOath: t.allianceOath,
    vassal: t.vassal,
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
  siegesKnown,
  // Bug #540: a court's caravans as it knows them, for the map as for its view.
  caravansKnown: (s: GameState, p: Power, map: WorldMap | null = null): CaravanView[] => caravansKnown(new TurnEngine(s, map ?? WorldMap.default), p),
  // Item 17+: a court's view names every power as that court gives its name.
  for: (s: GameState, p: Power, map: WorldMap | null = null): SeatView => asSeenBy(p, () => seatView(s, p, map)),
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

/** An own unit's march over a long link (item 13): where to, and the days of road left at its usual pace. */
function marchOf(engine: TurnEngine, u: Unit): { march: string | null; marchDays: number } {
  if (u.march === null) return { march: null, marchDays: 0 };
  const left = Math.max(0, engine.marchPoints(u, u.march, false) - u.along);
  return { march: u.march, marchDays: Math.ceil(left / PointsPerDay) };
}

