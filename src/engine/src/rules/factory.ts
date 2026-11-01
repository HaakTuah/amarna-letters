/** A new game: the map's owners and walls, the opening troops and treasuries, the characters, and starting strength. */
import { Dict } from "../core/collections.ts";
import { Rng } from "../core/rng.ts";
import { cmpNum, range, sortBy } from "../core/seq.ts";
import { newGameConfig, type GameConfig } from "../model/config.ts";
import { levelOf, newWorkPlan, setLevel, startLevel, WorkKindValues } from "../model/works.ts";
import { seasonOfTurn, StartGold, StartUnits, StartWalls, WorldMap } from "../model/map.ts";
import { reapSeasonOf } from "../model/geography.ts";
import { forMen, harvestIn, menOf, reckonedOf, startPeople } from "../model/land.ts";
import { carriedOf, needOf, startPurseOf, startStoresOf } from "../model/economy.ts";
import { newMarket } from "../model/caravans.ts";
import { newDebt } from "../model/money.ts";
import { StartClaims } from "../model/recognition.ts";
import { StartVassals } from "../model/vassals.ts";
import { clause } from "../model/clauses.ts";
import { newTablet, newTabletCopy } from "../model/records.ts";
import { renderClauses } from "./clauses.ts";
import { clamp } from "../core/num.ts";
import { newCharacter, newContract, newFact, newTie, newTraits, type Character, type Secrecy } from "../model/people.ts";
import { AllPowers, adjective, isGreatKing, land, setNameClaims, setRisen, type Power } from "../model/power.ts";
import { newTreasury, newGameState, newUnit, logEvent, newId, notify, type GameState } from "../model/state.ts";
import { StateOfRealmTitle, stateOfRealm } from "./realm.ts";
import { TurnEngine } from "../turn/turn-engine.ts";
import { drawFinalSeason } from "./ending.ts";
import { calling, personaTemplate } from "./personas.ts";
import { AttestedCast, FirstCores, NamedScribes, NubianCast, NubiansAttested, PeopleOf1346, Styles, type CastSeed, type Core } from "./cast.ts";
import { drawSkills } from "./skills.ts";
import { kingTongues, servedThere } from "./tongues.ts";
import { courtReads } from "../model/languages.ts";
import { chooseStrategy } from "./strategy.ts";

export function newGame(seed: number, config: GameConfig | null = null, map: WorldMap | null = null): GameState {
  // A new game starts with the powers the map gives; powers rise in play only (item 13+).
  setRisen([]);
  setNameClaims([], []);
  const m = map ?? WorldMap.default;
  const s = newGameState({ seed, config: config ?? newGameConfig(), turn: 1 });
  // The last season, drawn once in secret from its own stream before anything else is rolled.
  const last = drawFinalSeason(seed, s.config);
  s.finalSeason = last?.season ?? null;
  s.finalByCap = last?.byCap ?? false;

  for (const p of m.landProvinces) {
    s.owner.set(p.id, p.home);
    const walls = StartWalls.get(p.id) ?? 0;
    if (walls > 0) s.walls.set(p.id, walls);
    // Roads, relay stations, harbours and policing as the dossiers give them (item 15); no water works yet.
    for (const k of ["Roads", "Stations", "Harbour", "Policing"] as const) setLevel(s, k, p.id, startLevel(k, p));
    // Each holder's standing order to keep what stands in his land by corvée, the normal way of the age: his own, seen
    // in his view, which he may change (item 15: nothing is kept unless someone orders it).
    if (p.home !== null) for (const k of WorkKindValues) if (levelOf(s, k, p.id) > 0) s.works.push(newWorkPlan({ province: p.id, kind: k, keep: levelOf(s, k, p.id) }));
    // Its stores, half full, and its market: a season's local need on sale and its people's purse (item 9+a).
    const stores = startStoresOf(p);
    if (stores > 0) s.stores.set(p.id, stores);
    s.markets.set(p.id, newMarket({ stock: needOf(p), purse: startPurseOf(p) }));
    // Its people, from the people dossier, less the men of the armies already levied there (item 10+a).
    const r = reckonedOf(m, p.id);
    s.people.set(p.id, { settled: r.settled, men: r.men, loose: startPeople(m).get(p.id)!.loose });
  }
  // The harvest in its season (item 11a+): the crop in the fields since the last reaping, that harvest, and the granaries
  // holding what the farmers kept of it for the seasons until the next, at a season's harvest each.
  for (const p of m.landProvinces) {
    const h = harvestIn(m, s, p.id, false);
    const d = ((reapSeasonOf(p.id) - seasonOfTurn(s.turn) + 3) % 3) + 1;
    s.crop.set(p.id, h * (3 - d));
    s.reaped.set(p.id, 3 * h);
    s.granary.set(p.id, h * d);
  }
  for (const u of StartUnits)
    s.units.push(newUnit({ id: newId(s, "u"), power: u.power, kind: u.kind, province: u.province, home: u.home, food: forMen(carriedOf(u.kind), u.kind, u.men ?? menOf(u.kind)), men: u.men ?? menOf(u.kind) }));
  for (const p of AllPowers) {
    s.treasuries.set(p, newTreasury({ gold: StartGold.get(p)! }));
    s.inbox.set(p, []);
    // Every court knows the walls as the map gives them; after that, as it last saw them.
    s.wallsSeen.set(p, s.walls.clone());
  }

  populate(s);
  // Item 12: each king speaks his court's language and what is commonly spoken at his capital.
  for (const p of AllPowers) s.kingTongues.set(p, kingTongues(p, m.capital(p).id));
  s.claims = StartClaims.map((c) => ({ ...c }));
  openingBonds(s);
  openingDebts(s);

  const engine = new TurnEngine(s, m);
  for (const p of AllPowers) s.startStrength.set(p, engine.strength(p));
  // Each court's state of the realm, from the data by one rule for all (item 11+).
  for (const p of AllPowers) notify(s, p, "Notice", StateOfRealmTitle, stateOfRealm(s, m, p));
  logEvent(s, "start", "The age begins. Seven Great Kings hold their thrones, and the city-states and chiefs between them their own.");
  return s;
}

/**
 * The vassal tablets sealed before the age began ("Opening relations as they were", item 11+): each city that was a vassal in
 * 1346 holds a tablet marked as a vassal treaty with its overlord, in the template's clauses (its tribute each year, its
 * service, and its plea for protection), sealed by both, a copy in each archive. Words, like every tablet.
 */
function openingBonds(s: GameState): void {
  for (const b of StartVassals) {
    const clauses = [clause("tribute", { amount: b.tribute }), clause("serve"), clause("askProtect")];
    const t = newTablet({
      id: newId(s, "t"),
      text: renderClauses(clauses, b.vassal, b.overlord),
      proposedBy: b.vassal,
      partner: b.overlord,
      seals: [b.vassal, b.overlord],
      createdTurn: 0,
      sealedTurn: 0,
      vassal: b.vassal,
      clauses,
    });
    s.tablets.push(t);
    for (const holder of [b.vassal, b.overlord]) s.copies.push(newTabletCopy({ id: newId(s, "k"), tabletId: t.id, holder, acquiredTurn: 0, source: "sealed before the age began" }));
  }
}

/**
 * Item 17+ ("Starting positions come from the sources"): each documented debt between courts starts on record, a debt
 * tablet in the creditor's archive, the claim as the letters state it; the sums are first guesses [G] against the
 * treasuries, since the letters give weights of gold the game does not reckon in. From the letters dossier ("Between the
 * Great Kings"): the solid-gold statues Amenhotep III promised Tushratta, which came from Akhenaten as gilded wood (EA
 * 26-29) [A the claim]; the silver of Burna-Buriash's merchants killed at Hinnatuna and of Salmu's caravan robbed twice in
 * Pharaoh's lands, which he demands returned (EA 7-8) [A]; and the copper the king of Alashiya says he still owes Pharaoh,
 * having sent only five hundred talents for the plague in his land (EA 35) [A]. Each falls due within the first year, as
 * the letters press for it now; nothing enforces it ("Debts are facts; repayment is a choice").
 */
const StartDebts: readonly { lender: Power; borrower: Power; owed: number; due: number }[] = [
  { lender: "Mitanni", borrower: "Egypt", owed: 200, due: 4 },
  { lender: "Babylonia", borrower: "Egypt", owed: 60, due: 4 },
  { lender: "Egypt", borrower: "Alashiya", owed: 80, due: 4 },
];

function openingDebts(s: GameState): void {
  for (const d of StartDebts)
    s.debts.push(newDebt({ id: newId(s, "d"), lender: d.lender, borrower: d.borrower, principal: d.owed, owed: d.owed, sealedTurn: 0, dueTurn: d.due, holder: d.lender, kept: "Archive" }));
}

interface Seed {
  name: string;
  origin: string;
  attested: boolean;
}

const seed = (name: string, origin: string, attested: boolean): Seed => ({ name, origin, attested });

// Names attested in the Amarna letters (envoys and officials), then regional name styles.
const Attested: Seed[] = [
  seed("Mane", "Waset", true),
  seed("Keliya", "Washukanni", true),
  seed("Pirissi", "Washukanni", true),
  seed("Tulubri", "Taidu", true),
  seed("Haamashshi", "Men-nefer", true),
  seed("Artessupa", "Washukanni", true),
  seed("Mazipalali", "Harran", true),
  seed("Yanhamu", "Gubla", true),
];

const Styled: Seed[] = [
  seed("Paser", "Men-nefer", false),
  seed("Nakhtmin", "Waset", false),
  seed("Ili-iddina", "Babili", false),
  seed("Kidin-Adad", "Nippur", false),
  seed("Ubaru", "Sippar", false),
  seed("Tattamaru", "Hattusa", false),
  seed("Pihhuniya", "Nesa", false),
  seed("Ehli-Teshub", "Karkamish", false),
  seed("Tehip-tilla", "Arrapha", false),
  seed("Ashur-nadin", "Ashur", false),
  seed("Sin-iqisham", "Ninua", false),
  seed("Abdi-Milki", "Ṣurru", false),
  seed("Ammistamru", "Ugarit", false),
  seed("Kushmeshu", "the harbour of Alashiya", false),
  seed("Piyamaradu", "Apasa", false),
  seed("Zitanza", "Lukka", false),
];

const Callings = ["merchant", "temple scribe", "charioteer", "interpreter", "physician", "caravan master", "palace steward", "priest of Shamash", "soldier", "copper trader"];

const Lapses = ["theft", "drunkenness", "insolence to a prince", "losing a royal gift"];
// Where a lover is kept: at a court, so that the tie has a court to draw the character and to hold it (item 10).
const Lovers: Power[] = ["Mitanni", "Alashiya", "Babylonia", "Egypt", "Hatti"];

/** A power's starting staff: the table's number for a Great King, half of it (at least one) for a city-state (item 11+). */
export function startStaff(c: GameConfig, p: Power): number {
  return isGreatKing(p) ? c.startEnvoysPerPower : Math.max(1, Math.ceil(c.startEnvoysPerPower / 2));
}

/** The first pool, whose draws every seed keeps (item 10 adds the rest from a stream of its own). */
export const FirstPool = 18;

/**
 * Seeds the small pool of envoys and spies: data first (traits, discrete facts with secrecy levels), personality second (a
 * template persona the narrator may replace once, at creation).
 */
export function populate(s: GameState): void {
  const rng = Rng.for(s.seed, 0, "characters");
  const attested = rng.shuffle(Attested);
  const styled = rng.shuffle(Styled);
  const first = Math.min(FirstPool, s.config.characterPoolSize);
  let pool = [...attested.slice(0, Math.min(7, Math.trunc(first / 2))), ...styled].slice(0, first);
  pool = rng.shuffle(pool);

  // A power's starting staff follows its size ("How many characters", item 11+): a Great King's the table's number, a
  // city-state's half of it, at least one.
  const employers: Power[] = AllPowers.flatMap((p) => range(0, startStaff(s.config, p)).map(() => p));
  // Two of the starting envoys are plants, secretly in the pay of another power.
  const plantSlots = new Set(rng.shuffle(range(0, employers.length)).slice(0, 2));
  let slot = 0;

  for (const sd of pool) {
    const c = create(s, rng, sd);
    finish(s, c, FirstCores.get(sd.name) ?? null, sd.attested);
    if (employers.length > 0) {
      employ(s, rng, c, employers.shift()!, plantSlots.has(slot));
      slot++;
    } else {
      c.status = "Free";
      c.at = rng.pick(AllPowers);
      // A free person with a lover or family at a court lives there (item 10: the tie draws it).
      const drawn = c.ties.find((t) => t.kind !== "Debt");
      if (drawn !== undefined) c.at = drawn.court;
    }
    // A servant's court has seen it; a free person living in a city is a stranger to its king until it presents itself.
    c.met = c.status === "Employed" && c.at !== null ? [c.at] : [];
    c.persona = personaTemplate(c);
    s.characters.push(c);
  }
  pursed.clear();
  more(s, attested.slice(Math.min(7, Math.trunc(first / 2))));
  // The staff the first pool could not fill (item 11+: some thirty powers to some eighteen first servants) is taken from the
  // free people of the larger pool, each from its own court where it can be, in the powers' fixed order.
  const r = Rng.for(s.seed, 0, "staff");
  for (const p of employers) {
    const free = s.characters.filter((c) => c.status === "Free" && !c.facts.some((f) => f.tag === "nubian"));
    if (free.length === 0) break;
    const home = free.filter((c) => c.at === p);
    const c = home.length > 0 ? home[0] : r.pick(free);
    employ(s, r, c, p, plantSlots.has(slot));
    if (!c.met.includes(p)) c.met.push(p);
    slot++;
  }
  scribes(s);
  // Item 11a: a free person's savings from the life before the game, from a stream of their own; every character's way to
  // a fortune and road ("How the strategy is made"); and the pool's baseline ("A baseline, not a limit").
  for (const c of s.characters) {
    if (c.status === "Free" && !pursed.has(c.id)) c.purse = c.earned.savings = Rng.for(s.seed, 0, "savings", c.id).range(10, 60);
    chooseStrategy(c);
  }
  s.baseline = s.characters.length;
}

/**
 * Haakon's answer to item 12's review (item 11f): every court that reads Akkadian starts with an Akkadian-speaking scribe
 * in its service, as the archives show the letters read and written by such scribes at every court that answered them; a
 * servant like any other, paid, who may die, leave or be hired away. Each is drawn from a stream of its own, in its court's
 * name style (or the nearest court's), fluent in Akkadian, and has the court's own tongue from its years there.
 */
function scribes(s: GameState): void {
  const map = WorldMap.default;
  for (const p of AllPowers) {
    const capital = map.capital(p).id;
    if (!courtReads(p, capital).includes("Akkadian")) continue;
    const rng = Rng.for(s.seed, 0, "scribe", p);
    const nearest = sortBy([...AllPowers].filter((x) => Styles.some((st) => st.court === x)), [(x: Power) => map.hops(map.capital(x).id, capital), cmpNum])[0];
    const style = Styles.find((st) => st.court === p) ?? Styles.find((st) => st.court === nearest) ?? Styles[0];
    // A name of the style nobody has yet, else "the younger" or "the elder" of one; or the scribe the sources name (item 17+).
    const names = rng.shuffle([...style.names]);
    const taken = (n: string): boolean => s.characters.some((c) => c.name === n);
    const named = NamedScribes.get(p) ?? null;
    const name = named?.name ?? ([...names, ...names.map((n) => `${n} the younger`), ...names.map((n) => `${n} the elder`)].find((n) => !taken(n)) ?? `${names[0]} of ${land(p)}`);
    const c = create(s, rng, { name, origin: named?.origin ?? rng.pick(style.origins), attested: named?.attested ?? false }, "scribe", Math.min(rng.range(15, 95), rng.range(15, 95)));
    finish(s, c, named?.core ?? null, named?.attested ?? false);
    c.tongues.set("Akkadian", Math.max(c.tongues.getOrDefault("Akkadian", 0), rng.range(80, 95)));
    employ(s, rng, c, p, false);
    c.met = [p];
    c.persona = personaTemplate(c);
    s.characters.push(c);
  }
}

/**
 * A starting servant (item 11a: a job like any other): employed by `p` at its court, its first errand named when it is first
 * sent, the rest of its fee carried by its master's standing order; a plant is secretly in another power's pay.
 */
function employ(s: GameState, rng: Rng, c: Character, p: Power, plant: boolean): void {
  c.status = "Employed";
  c.employer = p;
  c.at = p;
  // Terms end between turns 7 and 13, so the starting corps does not come up for renewal all at once. Each is drawn
  // from its own stream, so that no other draw (traits, facts, posts) changes.
  // Item 11a: a job like any other, its fee for the seasons it runs at what the old wage paid, half handed over before the game.
  const until = Rng.for(s.seed, 0, "start-term", c.id).range(7, 13);
  const fee = (6 + Math.trunc(c.traits.competence / 10)) * (until - 1);
  // Haakon's answers to item 11a: its first errand is named when it is first sent, and the job, agreed before the game,
  // carries the king's word to pay the rest when it is done (his standing order, which he may cancel: withhold_fee).
  c.contract = newContract({ fee, advance: Math.trunc(fee / 2), startTurn: 1, untilTurn: until, payOnDone: true });
  // On top of what he already holds (item 17+: a person of 1346 with a purse of his own may be taken into a post).
  c.purse += Math.trunc(fee / 2);
  c.earned.fees += Math.trunc(fee / 2);
  c.reputation.set(p, 10);
  // Item 12: years at the court it serves have taught it the court's language.
  servedThere(s.seed, c, p, WorldMap.default.capital(p).id);
  if (plant) {
    const master = rng.pick(AllPowers.filter((x) => x !== p));
    c.secretMaster = master;
    c.traits.sympathy = master;
    c.traits.sympathyStrength = Math.max(c.traits.sympathyStrength, 60);
    c.facts = c.facts.filter((f) => f.tag !== "sympathy");
    c.facts.push(newFact({ id: newId(s, "f"), text: `Is secretly in the pay of ${land(master)}.`, secrecy: "Deep", tag: "plant", knownBy: [master] }));
  }
}

/**
 * Item 10's larger pool ("How many characters": about 60): the attested people of the dossier, the Nubians in Egypt's
 * service, and ordinary people in their regions' name styles, drawn from a stream of their own so that every seed keeps
 * its first eighteen. Mostly ordinary people, few excellent ones ("Enough people, not enough good ones"): an ordinary
 * person's competence is the lower of two draws. All are free, each at the court of its region.
 */
function more(s: GameState, unused: Seed[]): void {
  const extra = s.config.characterPoolSize - FirstPool;
  if (extra <= 0) return;
  const rng = Rng.for(s.seed, 0, "characters-more");
  // Item 17+: the people of 1346 who did not rule come before the invented, so the real take the invented ones' places.
  const known: CastSeed[] = [
    ...unused.map((u) => ({ name: u.name, origin: u.origin, court: courtOf(u.origin), calling: "royal envoy", core: FirstCores.get(u.name) ?? null, nubian: false, post: false, purse: 0, facts: [], stake: null })),
    ...AttestedCast,
    ...PeopleOf1346,
    ...NubianCast,
  ];
  const styled: CastSeed[] = rng.shuffle(
    Styles.flatMap((st) => st.names.map((name, i): CastSeed => ({ name, origin: st.origins[i % st.origins.length], court: st.court, calling: st.callings[i % st.callings.length], core: null, nubian: false, post: false, purse: 0, facts: [], stake: null }))),
  );
  const cast = [...known, ...styled].slice(0, extra);
  for (const sd of cast) {
    const attested = (known.includes(sd) && !sd.nubian) || NubiansAttested.has(sd.name);
    const c = create(s, rng, { name: sd.name, origin: sd.origin, attested }, sd.calling, attested ? null : Math.min(rng.range(15, 95), rng.range(15, 95)));
    if (sd.nubian) c.facts.push(newFact({ id: newId(s, "f"), text: "A Nubian in Egypt's service, who speaks a Nubian tongue as well as Egyptian.", secrecy: "Public", tag: "nubian" }));
    // Item 17+: what the sources say of a person of 1346, as public facts; a claim or a town of his own as a stake.
    for (const text of sd.facts) c.facts.push(newFact({ id: newId(s, "f"), text, secrecy: "Public", tag: "source" }));
    if (sd.stake !== null) c.facts.push(newFact({ id: newId(s, "f"), text: `Holds a stake in the love of the people of ${WorldMap.default.get(sd.stake).name}: a claim, or a town of his own.`, secrecy: "Public", tag: `stake:${sd.stake}` }));
    finish(s, c, sd.core, attested);
    if (sd.post) {
      // Item 17+: in his post from the first season, placed where the sources put him: employed by his court, as a starting servant.
      employ(s, rng, c, sd.court, false);
      c.met = [sd.court];
    } else {
      c.status = "Free";
      // A Nubian in Egypt's service stands at Pharaoh's court; a person of 1346 with a stake at the court the sources put him
      // at; anyone else lives where a lover or family draws it, if anywhere.
      c.at = sd.nubian || sd.stake !== null ? sd.court : (c.ties.find((t) => t.kind !== "Debt")?.court ?? sd.court);
      c.met = [];
    }
    if (sd.purse > 0) {
      // On top of any advance his post paid him: what he holds stays what he gained.
      c.purse += sd.purse;
      c.earned.savings += sd.purse;
      pursed.add(c.id);
    }
    c.persona = personaTemplate(c);
    s.characters.push(c);
  }
}

/** The characters whose purse the sources set (item 17+), which the draw of savings leaves alone. */
const pursed = new Set<string>();

/** The court of a first-pool origin, for an attested envoy left over from the first draw. */
function courtOf(origin: string): Power {
  return origin === "Waset" || origin === "Men-nefer" || origin === "Gubla" ? "Egypt" : origin === "Harran" || origin === "Washukanni" || origin === "Taidu" ? "Mitanni" : "Egypt";
}

/**
 * What item 10 adds to every character, each from a stream of its own so that no other draw changes: an attested person's
 * traits moved to what the sources say (within about 10 points either way), its skills and inclination, and the ties its
 * seeded facts stand for.
 */
function finish(s: GameState, c: Character, core: Core | null, attested: boolean): void {
  c.attested = attested;
  if (core !== null) {
    const rng = Rng.for(s.seed, 0, "attested", c.id);
    const t = c.traits;
    if (core.loyalty !== undefined) t.loyalty = clamp(core.loyalty + rng.range(-10, 10), 0, 100);
    if (core.greed !== undefined) t.greed = clamp(core.greed + rng.range(-10, 10), 0, 100);
    if (core.competence !== undefined) t.competence = clamp(core.competence + rng.range(-10, 10), 0, 100);
    if (core.ambition !== undefined) t.ambition = clamp(core.ambition + rng.range(-10, 10), 0, 100);
    if (core.courage !== undefined) t.courage = clamp(core.courage + rng.range(-10, 10), 0, 100);
  }
  drawSkills(s.seed, c);
}

function create(s: GameState, rng: Rng, sd: Seed, callingAs: string | null = null, competence: number | null = null): Character {
  const picked = rng.pick(Callings);
  const c = newCharacter({
    id: newId(s, "c"),
    name: sd.name,
    origin: sd.origin,
    calling: callingAs ?? picked,
    traits: newTraits({
      loyalty: rng.range(15, 95),
      greed: rng.range(5, 95),
      competence: competence ?? rng.range(20, 95),
      ambition: rng.range(5, 95),
      courage: rng.range(10, 95),
    }),
  });
  if (rng.chance(0.35)) {
    c.traits.sympathy = rng.pick(AllPowers);
    c.traits.sympathyStrength = rng.range(30, 80);
  }

  const add = (text: string, secrecy: Secrecy, tag: string): void => {
    c.facts.push(newFact({ id: newId(s, "f"), text, secrecy, tag }));
  };

  add(`Born in ${c.origin}.`, "Public", "origin");
  add(`Served as ${calling(c)}.`, "Public", "calling");
  if (sd.attested) add("Known by name at more than one royal court.", "Public", "renown");

  // The life before the game (item 10): a debt, a brother or a lover each comes with a tie that has a mechanical hook.
  const hidden: [string, string, () => void][] = [];
  if (c.traits.greed > 55) {
    const amount = rng.range(2, 9) * 30;
    const to = rng.pick(AllPowers);
    hidden.push([`Owes ${amount} shekels to a ${adjective(to)} trader.`, "debt", () => c.ties.push(newTie({ kind: "Debt", court: to, amount }))]);
  }
  if (c.traits.loyalty < 45) hidden.push([`Was dismissed from a former post for ${rng.pick(Lapses)}.`, "dismissed", () => {}]);
  if (c.traits.courage < 35) hidden.push(["Once fled from a battle and hid it.", "coward", () => {}]);
  const brother = rng.pick(AllPowers);
  hidden.push([`Has a brother serving in the army of ${land(brother)}.`, "brother", () => c.ties.push(newTie({ kind: "Family", court: brother }))]);
  const lover = rng.pick(Lovers);
  hidden.push([`Keeps a lover at the court of ${land(lover)}.`, "lover", () => c.ties.push(newTie({ kind: "Lover", court: lover }))]);
  for (const [text, tag, tie] of rng.shuffle(hidden).slice(0, 2)) {
    add(text, "Hidden", tag);
    tie();
  }

  if (c.traits.sympathy !== null) add(`Secretly sympathizes with ${land(c.traits.sympathy)}.`, "Deep", "sympathy");
  else if (c.traits.ambition > 70) add("Dreams of ruling a city of their own one day.", "Deep", "ambition");

  return c;
}

/** The C# build's static classes GameFactory and CharacterFactory. */
export const GameFactory = { newGame };
export const CharacterFactory = { populate };

