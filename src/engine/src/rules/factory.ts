/** A new game: the map's owners and walls, the opening troops and treasuries, the characters, and starting strength. */
import { Dict } from "../core/collections.ts";
import { Rng } from "../core/rng.ts";
import { range } from "../core/seq.ts";
import { newGameConfig, type GameConfig } from "../model/config.ts";
import { StartGold, StartUnits, StartWalls, WorldMap } from "../model/map.ts";
import { menOf, reckonedOf, startPeople } from "../model/land.ts";
import { carriedOf, needOf, startPurseOf, startStoresOf } from "../model/economy.ts";
import { newMarket } from "../model/caravans.ts";
import { StartClaims } from "../model/recognition.ts";
import { clamp } from "../core/num.ts";
import { newCharacter, newContract, newFact, newTie, newTraits, type Character, type Secrecy } from "../model/people.ts";
import { AllPowers, adjective, land, type Power } from "../model/power.ts";
import { newTreasury, newGameState, newUnit, logEvent, newId, type GameState } from "../model/state.ts";
import { TurnEngine } from "../turn/turn-engine.ts";
import { drawFinalSeason } from "./ending.ts";
import { calling, personaTemplate } from "./personas.ts";
import { AttestedCast, FirstCores, NubianCast, NubiansAttested, Styles, type CastSeed, type Core } from "./cast.ts";
import { drawSkills } from "./skills.ts";
import { chooseStrategy } from "./strategy.ts";

export function newGame(seed: number, config: GameConfig | null = null, map: WorldMap | null = null): GameState {
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
    // Its stores, half full, and its market: a season's local need on sale and its people's purse (item 9+a).
    const stores = startStoresOf(p);
    if (stores > 0) s.stores.set(p.id, stores);
    s.markets.set(p.id, newMarket({ stock: needOf(p), purse: startPurseOf(p) }));
    // Its people, from the people dossier, less the men of the armies already levied there (item 10+a).
    const r = reckonedOf(m, p.id);
    s.people.set(p.id, { settled: r.settled, men: r.men, loose: startPeople(m).get(p.id)!.loose });
  }
  for (const u of StartUnits)
    s.units.push(newUnit({ id: newId(s, "u"), power: u.power, kind: u.kind, province: u.province, home: u.province, food: carriedOf(u.kind), men: menOf(u.kind) }));
  for (const p of AllPowers) {
    s.treasuries.set(p, newTreasury({ gold: StartGold.get(p)! }));
    s.inbox.set(p, []);
    // Every court knows the walls as the map gives them; after that, as it last saw them.
    s.wallsSeen.set(p, s.walls.clone());
  }

  populate(s);
  s.claims = StartClaims.map((c) => ({ ...c }));

  const engine = new TurnEngine(s, m);
  for (const p of AllPowers) s.startStrength.set(p, engine.strength(p));
  logEvent(s, "start", "The age begins. Seven Great Kings hold their thrones.");
  return s;
}

interface Seed {
  name: string;
  origin: string;
  attested: boolean;
}

const seed = (name: string, origin: string, attested: boolean): Seed => ({ name, origin, attested });

// Names attested in the Amarna letters (envoys and officials), then regional name styles.
const Attested: Seed[] = [
  seed("Mane", "Thebes", true),
  seed("Keliya", "Washukanni", true),
  seed("Pirissi", "Washukanni", true),
  seed("Tulubri", "Taidu", true),
  seed("Haamashshi", "Memphis", true),
  seed("Artessupa", "Washukanni", true),
  seed("Mazipalali", "Harran", true),
  seed("Yanhamu", "Byblos", true),
];

const Styled: Seed[] = [
  seed("Paser", "Memphis", false),
  seed("Nakhtmin", "Thebes", false),
  seed("Ili-iddina", "Babylon", false),
  seed("Kidin-Adad", "Nippur", false),
  seed("Ubaru", "Sippar", false),
  seed("Tattamaru", "Hattusa", false),
  seed("Pihhuniya", "Nesa", false),
  seed("Ehli-Teshub", "Carchemish", false),
  seed("Tehip-tilla", "Arrapha", false),
  seed("Ashur-nadin", "Ashur", false),
  seed("Sin-iqisham", "Nineveh", false),
  seed("Abdi-Milki", "Tyre", false),
  seed("Ammistamru", "Ugarit", false),
  seed("Kushmeshu", "Enkomi", false),
  seed("Piyamaradu", "Apasa", false),
  seed("Zitanza", "Lukka", false),
];

const Callings = ["merchant", "temple scribe", "charioteer", "interpreter", "physician", "caravan master", "palace steward", "priest of Shamash", "soldier", "copper trader"];

const Lapses = ["theft", "drunkenness", "insolence to a prince", "losing a royal gift"];
// Where a lover is kept: at a court, so that the tie has a court to draw the character and to hold it (item 10).
const Lovers: Power[] = ["Mitanni", "Alashiya", "Babylonia", "Egypt", "Hatti"];

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

  const employers: Power[] = AllPowers.flatMap((p) => range(0, s.config.startEnvoysPerPower).map(() => p));
  // Two of the starting envoys are plants, secretly in the pay of another power.
  const plantSlots = new Set(rng.shuffle(range(0, employers.length)).slice(0, 2));
  let slot = 0;

  for (const sd of pool) {
    const c = create(s, rng, sd);
    finish(s, c, FirstCores.get(sd.name) ?? null, sd.attested);
    if (employers.length > 0) {
      const p = employers.shift()!;
      c.status = "Employed";
      c.employer = p;
      c.at = p;
      // Terms end between turns 7 and 13, so the starting corps does not come up for renewal all at once. Each is drawn
      // from its own stream, so that no other draw (traits, facts, posts) changes.
      // Item 11a: a job like any other, its fee for the seasons it runs at what the old wage paid, half handed over before the game.
      const until = Rng.for(s.seed, 0, "start-term", c.id).range(7, 13);
      const fee = (6 + Math.trunc(c.traits.competence / 10)) * (until - 1);
      c.contract = newContract({ fee, advance: Math.trunc(fee / 2), startTurn: 1, untilTurn: until });
      c.purse = Math.trunc(fee / 2);
      c.earned.fees = c.purse;
      c.reputation.set(p, 10);
      if (plantSlots.has(slot)) {
        const master = rng.pick(AllPowers.filter((x) => x !== p));
        c.secretMaster = master;
        c.traits.sympathy = master;
        c.traits.sympathyStrength = Math.max(c.traits.sympathyStrength, 60);
        c.facts = c.facts.filter((f) => f.tag !== "sympathy");
        c.facts.push(newFact({ id: newId(s, "f"), text: `Is secretly in the pay of ${land(master)}.`, secrecy: "Deep", tag: "plant", knownBy: [master] }));
      }
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
  more(s, attested.slice(Math.min(7, Math.trunc(first / 2))));
  // Item 11a: a free person's savings from the life before the game, from a stream of their own; every character's way to
  // a fortune and road ("How the strategy is made"); and the pool's baseline ("A baseline, not a limit").
  for (const c of s.characters) {
    if (c.status === "Free") c.purse = Rng.for(s.seed, 0, "savings", c.id).range(10, 60);
    chooseStrategy(c);
  }
  s.baseline = s.characters.length;
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
  const known: CastSeed[] = [
    ...unused.map((u) => ({ name: u.name, origin: u.origin, court: courtOf(u.origin), calling: "royal envoy", core: FirstCores.get(u.name) ?? null, nubian: false })),
    ...AttestedCast,
    ...NubianCast,
  ];
  const styled: CastSeed[] = rng.shuffle(
    Styles.flatMap((st) => st.names.map((name, i) => ({ name, origin: st.origins[i % st.origins.length], court: st.court, calling: st.callings[i % st.callings.length], core: null, nubian: false }))),
  );
  const cast = [...known, ...styled].slice(0, extra);
  for (const sd of cast) {
    const attested = (known.includes(sd) && !sd.nubian) || NubiansAttested.has(sd.name);
    const c = create(s, rng, { name: sd.name, origin: sd.origin, attested }, sd.calling, attested ? null : Math.min(rng.range(15, 95), rng.range(15, 95)));
    if (sd.nubian) c.facts.push(newFact({ id: newId(s, "f"), text: "A Nubian in Egypt's service, who speaks a Nubian tongue as well as Egyptian.", secrecy: "Public", tag: "nubian" }));
    finish(s, c, sd.core, attested);
    c.status = "Free";
    // A Nubian in Egypt's service stands at Pharaoh's court; anyone else lives where a lover or family draws it, if anywhere.
    c.at = sd.nubian ? sd.court : (c.ties.find((t) => t.kind !== "Debt")?.court ?? sd.court);
    c.met = [];
    c.persona = personaTemplate(c);
    s.characters.push(c);
  }
}

/** The court of a first-pool origin, for an attested envoy left over from the first draw. */
function courtOf(origin: string): Power {
  return origin === "Thebes" || origin === "Memphis" || origin === "Byblos" ? "Egypt" : origin === "Harran" || origin === "Washukanni" || origin === "Taidu" ? "Mitanni" : "Egypt";
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

