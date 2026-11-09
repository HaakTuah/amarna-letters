/** What each court sees: the seat view, sight, the walls it knows, and how it sees each person and tablet. */
import { listed } from "./wording.ts";
import { Dict } from "../core/collections.ts";
import { idiv } from "../core/num.ts";
import { cmpBool, cmpNum, desc, groupBy, sortBy, sum } from "../core/seq.ts";
import { cmpStr, split } from "../core/text.ts";
import { WorldMap } from "../model/map.ts";
import { coverOf, hiddenAt, type Character } from "../model/people.ts";
import { captiveMaster, characterView, confessedMaster, dutyText, envoyHomeTiming, homeTiming, isOurs, knownDemand, knows, seenAtCourt, termText, timingText, unheardHire } from "./people-views.ts";
import { AllPowers, asSeenBy, claimantsOf, claimedName, cmpPower, contestedNames, kingFor, land, nameGivenBy, ownLand, powerName, type Power } from "../model/power.ts";
import { repudiationKnown, type Tablet, type TabletCopy } from "../model/records.ts";
import { newScheduledOrders, type ScheduledOrders } from "../model/sleep.ts";
import { sameConditions } from "./conditions.ts";
import { levelOf } from "../model/works.ts";
import { huntNow, inboxOf, isAlive, ledger, upkeepOf, wallsOf, type GameState } from "../model/state.ts";
import { type Unit } from "../model/units.ts";
import { PointsPerDay } from "../model/travel.ts";
import { EconomyData, harvestOf } from "../model/economy.ts";
import { strength as scoringStrength } from "./scoring.ts";
import { unitCarried } from "../model/land.ts";
import { declarationKnown } from "../model/declarations.ts";
import { moodsKnown } from "../model/moods.ts";
import { governorsKnown, seatKnown } from "../model/command.ts";
import { grantStandsFor, newGrantView } from "../model/authority.ts";
import { raidersHome } from "../model/raiders.ts";
import { type CaravanView, newBandSeen, newDebtView, newLotView, newSeatView, newGovernorView, newDeclaredView, newHeldLetterView, newMoodSeenView, newSiegeView, newTabletView, newUnitView, type UnitView, newLetterView, landGrowth, type CharacterView, type DebtView, type LandStanding, type LetterView, type SeatView, type TabletView, newWorkView } from "../model/views.ts";
import { newStandingOrderView } from "../model/sleep.ts";
import type { InboxItem } from "../model/records.ts";
import { season } from "./calendar.ts";
import { broughtToKing, courtLagOf, courtOf, heldKing, kingAfield, seatOf } from "./court.ts";
import { carriedWorth, ownKnown } from "./province-reports.ts";
import { caravansKnown, wordCame } from "./caravans-known.ts";
import { commanderKnown, ownPlaces, placesKnown, plannedAsKnown, scheduleKnown, ownUnitsShown, reportedAt, reportIndex, reportOf, trailEntry } from "./units-known.ts";
import { knownHolders, ownerAt, SeenSource, siegesKnown, sight, wallsKnown, WordSource } from "./known-land.ts";

export { SeenSource, WordSource };
export { tongueClaimsAs } from "./people-views.ts";
import { ageBand } from "./ending.ts";
import { omenLine } from "./omens.ts";
import { TurnEngine } from "../turn/turn-engine.ts";
import { asShown, basePrice, trustIn } from "../turn/turn-engine.ts";
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
 * The troops a court sees: its own where its orders name them (`ownPlaces`: by their last reports, never two in one
 * province), and others' where it sees them.
 */
function unitsSeen(s: GameState, engine: TurnEngine, p: Power, seen: { has(province: string): boolean }, view: (u: Unit) => UnitView): UnitView[] {
  // Bug #600: its own as it knows them (raised, and not yet heard to be gone), each by the report that places it.
  const own = ownPlaces(engine, p, seen).map(({ unit, at }) => (at === null || at === reportIndex(engine, unit) ? view(unit) : { ...view(unit), ...trailEntry(unit.trail[at]), reported: reportedAt(engine, unit, at) }));
  return [...own, ...s.units.filter((u) => u.power !== p && seen.has(u.province)).map(view)];
}

function seatView(s: GameState, p: Power, map: WorldMap | null = null): SeatView {
  const m = map ?? WorldMap.default;
  const engine = new TurnEngine(s, m);
  const seen = sight(s, m, p);
  const known = knownHolders(s, m, p, seen);
  const own = ownKnown(s, engine, m, p, seen, known);
  // Where it believes each of its own units stands (bug #615): what its orders and servants name them by.
  const place = placesKnown(engine, p, seen);
  const t = s.treasuries.get(p);
  const v = newSeatView({
    // The claims to the rank this court knows of (bug #777: one made in play, where his greetings have been read); not
    // which other courts know it.
    claims: s.claims.filter((c) => c.heardBy === null || c.heardBy.includes(p)).map((c) => ({ ...c, heardBy: null })),
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
    courtTo: s.kingRoads.find((r) => r.power === p && !r.alone)?.to ?? null,
    // Where the court believes him: while word of his loss is on the road, where he was.
    kingAt: kingAfield(s, p) ?? null,
    heldAt: heldKing(s, p)?.heldBy ?? null,
    heldOnRoad: heldKing(s, p)?.duty === "UnderGuard",
    kingTo: s.kingRoads.find((r) => r.power === p && r.alone)?.to ?? null,
    seat: seatOf(s, m, p),
    traits: s.reigns.tryGet(p)?.traits ?? [],
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
      // Where its view shows the troops held back (bug #615).
      const held = (ids: string[]): string[] => sortBy([...new Set(ownPlaces(engine, p, seen).filter((x) => ids.includes(x.unit.id)).map((x) => x.province))], [(x: string) => x, cmpStr]);
      return { payTroops: o.pay, feedTroops: o.feed, payHeld: held(o.payExcept), feedHeld: held(o.feedExcept) };
    })(),
    huntBands: huntNow(s, p) !== null,
    huntWhere: huntNow(s, p)?.provinces ?? [],
    debts: debtViews(s, p),
    debtsHeld: claimViews(s, p),
    startStrength: s.startStrength.getOrDefault(p, 0),
    provinceWeight: s.config.provinceWeight,
    rolledTraits: s.config.rolledTraits,
    owner: new Dict([...known.entries()].map(([k, x]) => [k, x.owner] as const)),
    // Dated where the news is older than this season, and newer than the start, which every court knows as it was.
    ownerAsOf: new Dict([...known.entries()].filter(([, x]) => x.turn < s.turn && x.turn > 0).map(([k, x]) => [k, x.turn] as const)),
    ownerFrom: new Dict([...known.entries()].filter(([, x]) => x.turn < s.turn && x.turn > 0).map(([k, x]) => [k, x.source] as const)),
    roadsClosed: [...(s.roadsClosed.tryGet(p) ?? [])],
    roadsClosedToUs: [...(s.roadsHeard.tryGet(p) ?? [])],
    grants: s.grants
      // Once it holds the tablet: an envoy's king learns of one sealed by his envoy's hand when its copy comes home.
      // A grant by order (item 11a+), or a passage narrowed by a revocation (bug #611): its grantor knows it from the
      // order; its grantee once the news reaches him. Its end reaches the grantee by word too (bug #565).
      .filter(
        (g) =>
          (g.grantor === p || g.grantee === p) &&
          (grantStandsFor(g, p, s.turn) || (g.tabletId === "" && g.endedTurn === null && g.sinceTurn === s.turn + 1)) &&
          (g.grantor === p || g.heardTurn <= s.turn) &&
          (g.tabletId === "" || s.copies.some((k) => k.holder === p && k.tabletId === g.tabletId)),
      )
      .map((g) => {
        const t = s.tablets.find((x) => x.id === g.tabletId);
        return newGrantView({ kind: g.kind, grantor: g.grantor, grantee: g.grantee, province: g.province, cut: [...g.cut], sinceTurn: g.sinceTurn, untilTurn: g.untilTurn, tablet: t !== undefined ? tabletName(t) : "by order" });
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
      .map((b) =>
        newBandSeen({
          province: b.province,
          men: b.men,
          chief: s.characters.find((c) => c.id === b.leaderId)?.name ?? "",
          ship: b.ship,
          raiders: raidersHome(b.from)?.beyond.raids?.who ?? "",
          // Its captives as its eyes see them, in sight; out of sight, word of them comes by the king's reports (`tell`).
          captives: seen.has(b.province) ? b.captives : 0,
          // In sight only: out of it, word of a pay-off taken reaches the king with its notice (`tell`).
          paidUntil: ((c) => (seen.has(b.province) && c !== undefined && c.paidOffBy === p && s.turn <= c.paidOffUntil ? c.paidOffUntil : 0))(s.characters.find((c) => c.id === b.leaderId)),
        }),
      ),
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
    // Orders follow their units: each is shown as it would be given from where its king believes its unit stands now.
    // Orders of one season with different conditions (a march held up a season among them) are shown apart.
    const entries: ScheduledOrders[] = [];
    for (const x of scheduleKnown(engine, sleep)) {
      const last = entries.length > 0 ? entries[entries.length - 1] : null;
      // A unit raised far off is named by its levy until word of its raising comes (bug #600).
      const shown = asShown(s, p, plannedAsKnown(engine, p, x), place);
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
        orders: x.orders.map((o) => asShown(s, p, o, place)),
        conditions: [...x.conditions],
      }),
    );

  // Its standing answers for what arrives at its court.
  v.answers = (s.answers.tryGet(p)?.answers ?? []).map((x) => ({ ...x, conditions: [...x.conditions] }));

  // Item 17b, part C: what came to its court reaches a king away from it as a courier from there brings it (`broughtToKing`).
  const lag = courtLagOf(s, m, p);
  for (const person of s.characters) {
    // One newly come to his court he does not yet know to be there: as he last knew of it, if at all.
    const fresh = person.at === p && !broughtToKing(s, s.cameToCourt.tryGet(`${person.id}@${p}`) ?? -Infinity, lag);
    const c = fresh ? { ...person, at: null, pitches: new Dict<Power, string>() } : person;
    if (!knows(c, p, s) || unheardHire(s, c, p)) continue;
    const cv = characterView(s, commanderKnown(engine, p, c, place), p);
    // A servant abroad whose fate this court has not heard of appears as it believes, and only there.
    if (coverOf(c, p) !== null || isOurs(c, p, s)) v.court.push(cv);
    else v.known.push(cv);
  }

  const archive: Tablet[] = [];
  for (const copy of s.copies.filter((x) => x.holder === p && broughtToKing(s, x.acquiredTurn, lag))) {
    const tab = s.tablets.find((x) => x.id === copy.tabletId);
    if (tab === undefined) continue;
    v.tablets.push(tabletView(tab, broughtToKing(s, copy.authTurn, lag) ? copy : { ...copy, authResult: null }, s.turn));
    archive.push(tab);
  }
  // Named as every court names them, with their opening words where the archive holds two of the same seals and date.
  v.tablets.forEach((view, i) => {
    if (i < archive.length) view.name = tabletName(archive[i], archive);
  });

  const asleep = s.sleep.tryGet(p);
  v.letters = letters(s, p, v.court, s.config.sleepingSeats && asleep !== undefined ? asleep.lastCalled : s.turn - 1, lag);

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
  // #592: offers it holds, and those offered it for sale once word of the asking has come (their words only once bought).
  v.lettersHeld = s.lettersHeld.filter((h) => h.heldBy === p && h.known <= s.turn).map((h) => newHeldLetterView({ province: h.province, claimant: h.claimant, words: h.words, written: h.written, heldBy: p, askedOf: h.askedOf, price: h.price }));
  v.lettersOffered = s.lettersHeld.filter((h) => h.askedOf === p && h.askKnown !== null && h.askKnown <= s.turn && h.bought === null).map((h) => newHeldLetterView({ province: h.province, claimant: h.claimant, written: h.written, heldBy: h.heldBy, askedOf: p, price: h.price }));
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
  // #587: the gold the court sent, until word of what became of it comes (it reached the coffer, or came back), with no
  // day of arrival, which would tell it the roads before any word of them (Codex, #635).
  v.goldSent = s.sent.filter((x) => x.power === p && !x.food).map((x) => ({ province: x.province, gold: x.gold }));
  // By the court's one clock for its land, the line its sight already draws (word home within the season).
  v.far = v.provinces.filter((x) => engine.isFar(p, x.province)).map((x) => x.province);
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
      sum(v.caravans, (c) => carriedWorth(c.grain, c.gold)) +
      // #587: and the gold it sent ahead, which it knows is on the road.
      sum(v.goldSent, (g) => g.gold),
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
function letters(s: GameState, p: Power, court: readonly CharacterView[], since: number, lag = 0): LetterView[] {
  const away = new Set(court.filter((c) => c.ours && !c.ready).map((c) => c.id));
  const latest = new Set(groupBy(s.trails.filter((t) => t.from === p && !t.pretended), (t) => t.envoyId).map(([, g]) => g[g.length - 1].id));
  // An envoy's report reaches a king away from his court as its notice does (item 17b, part C).
  const reported = (t: (typeof s.trails)[number]): number | null => (t.reportTurn !== null && broughtToKing(s, t.reportTurn, lag) ? t.reportTurn : null);
  return s.trails
    .filter((t) => {
      const r = reported(t);
      return t.from === p && !t.pretended && (r !== null ? r > since : away.has(t.envoyId) && latest.has(t.id));
    })
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
        reportedTurn: reported(t),
      }),
    );
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

/**
 * A tablet as every court names it: an inventory or a tablet, by its seals and the date it bears ("the tablet sealed by
 * Babylonia and Mitanni, dated turn 2"). Where `among` holds another of the same kind, seals and date, its opening words
 * are added. Never a copy id, which is each court's own: a name another court can read.
 */
function tabletName(t: Tablet, among: Iterable<Tablet> | null = null): string {
  const name = `the ${t.inventory ? "inventory" : "tablet"} sealed by ${sealers(t.seals)}${t.sealedTurn !== null ? `, dated turn ${t.sealedTurn}` : ""}`;
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

/** "Egypt", "Egypt and Hatti", "Egypt, Hatti and Mitanni": the sealers by the names notices give them. */
function sealers(seals: readonly Power[]): string {
  return listed(seals.map((p) => powerName(p)));
}

/** A text's first eight words, marked "…" if there are more. */
function opening(text: string): string {
  const words = split(text, " ", true);
  return words.length <= 8 ? words.join(" ") : words.slice(0, 8).join(" ") + "…";
}

function tabletView(t: Tablet, copy: TabletCopy, turn: number): TabletView {
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
    // Bug #609: as its holder knows of it, by word for the other king; a third court is never told.
    repudiatedTurn: repudiationKnown(t, copy.holder, turn) ? t.repudiatedTurn : null,
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
  // Bug #615: and its own troops, where and as its view shows them.
  ownUnitsShown: (s: GameState, p: Power, map: WorldMap | null = null) => ownUnitsShown(new TurnEngine(s, map ?? WorldMap.default), p),
  // Item 17+: a court's view names every power as that court gives its name.
  for: (s: GameState, p: Power, map: WorldMap | null = null): SeatView => asSeenBy(p, () => seatView(s, p, map)),
  letters,
  seenAtCourt,
  knows,
  confessedMaster,
  captiveMaster,
  // Bug #797: as the court it is for names every power.
  character: (s: GameState, c: Character, viewer: Power): CharacterView => asSeenBy(viewer, () => characterView(s, c, viewer)),
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
