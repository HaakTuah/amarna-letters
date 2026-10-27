/** A new game: the map's owners and walls, the opening troops and treasuries, the characters, and starting strength. */
import { Dict } from "../core/collections.ts";
import { Rng } from "../core/rng.ts";
import { range } from "../core/seq.ts";
import { newGameConfig, type GameConfig } from "../model/config.ts";
import { StartGold, StartUnits, StartWalls, WorldMap } from "../model/map.ts";
import { newCharacter, newContract, newFact, newTraits, type Character, type Secrecy } from "../model/people.ts";
import { AllPowers, adjective, land, type Power } from "../model/power.ts";
import { newTreasury, newGameState, newUnit, logEvent, newId, type GameState } from "../model/state.ts";
import { TurnEngine } from "../turn/turn-engine.ts";
import { calling, personaTemplate } from "./personas.ts";

export function newGame(seed: number, config: GameConfig | null = null, map: WorldMap | null = null): GameState {
  const m = map ?? WorldMap.default;
  const s = newGameState({ seed, config: config ?? newGameConfig(), turn: 1 });

  for (const p of m.landProvinces) {
    s.owner.set(p.id, p.home);
    const walls = StartWalls.get(p.id) ?? 0;
    if (walls > 0) s.walls.set(p.id, walls);
  }
  for (const u of StartUnits) s.units.push(newUnit({ id: newId(s, "u"), power: u.power, kind: u.kind, province: u.province }));
  for (const p of AllPowers) {
    s.treasuries.set(p, newTreasury({ gold: StartGold.get(p)! }));
    s.inbox.set(p, []);
    // Every court knows the walls as the map gives them; after that, as it last saw them.
    s.wallsSeen.set(p, s.walls.clone());
  }

  populate(s);

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
  seed("Pihhuniya", "Kanesh", false),
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
const Lovers = ["Ugarit", "Byblos", "Babylon", "Memphis", "Hattusa"];

/**
 * Seeds the small pool of envoys and spies: data first (traits, discrete facts with secrecy levels), personality second (a
 * template persona the narrator may replace once, at creation).
 */
export function populate(s: GameState): void {
  const rng = Rng.for(s.seed, 0, "characters");
  const attested = rng.shuffle(Attested);
  const styled = rng.shuffle(Styled);
  let pool = [...attested.slice(0, Math.min(7, Math.trunc(s.config.characterPoolSize / 2))), ...styled].slice(0, s.config.characterPoolSize);
  pool = rng.shuffle(pool);

  const employers: Power[] = AllPowers.flatMap((p) => range(0, s.config.startEnvoysPerPower).map(() => p));
  // Two of the starting envoys are plants, secretly in the pay of another power.
  const plantSlots = new Set(rng.shuffle(range(0, employers.length)).slice(0, 2));
  let slot = 0;

  for (const sd of pool) {
    const c = create(s, rng, sd);
    if (employers.length > 0) {
      const p = employers.shift()!;
      c.status = "Employed";
      c.employer = p;
      c.at = p;
      // Terms end between turns 7 and 13, so the starting corps does not come up for renewal all at once. Each is drawn
      // from its own stream, so that no other draw (traits, facts, posts) changes.
      c.contract = newContract({ wage: 6 + Math.trunc(c.traits.competence / 10), startTurn: 1, untilTurn: Rng.for(s.seed, 0, "start-term", c.id).range(7, 13) });
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
    }
    c.persona = personaTemplate(c);
    s.characters.push(c);
  }
}

function create(s: GameState, rng: Rng, sd: Seed): Character {
  const c = newCharacter({
    id: newId(s, "c"),
    name: sd.name,
    origin: sd.origin,
    calling: rng.pick(Callings),
    traits: newTraits({
      loyalty: rng.range(15, 95),
      greed: rng.range(5, 95),
      competence: rng.range(20, 95),
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

  const hidden: [string, string][] = [];
  if (c.traits.greed > 55) hidden.push([`Owes ${rng.range(2, 9) * 30} shekels to a ${adjective(rng.pick(AllPowers))} trader.`, "debt"]);
  if (c.traits.loyalty < 45) hidden.push([`Was dismissed from a former post for ${rng.pick(Lapses)}.`, "dismissed"]);
  if (c.traits.courage < 35) hidden.push(["Once fled from a battle and hid it.", "coward"]);
  hidden.push([`Has a brother serving in the army of ${land(rng.pick(AllPowers))}.`, "brother"]);
  hidden.push([`Keeps a lover in ${rng.pick(Lovers)}.`, "lover"]);
  for (const [text, tag] of rng.shuffle(hidden).slice(0, 2)) add(text, "Hidden", tag);

  if (c.traits.sympathy !== null) add(`Secretly sympathizes with ${land(c.traits.sympathy)}.`, "Deep", "sympathy");
  else if (c.traits.ambition > 70) add("Dreams of ruling a city of their own one day.", "Deep", "ambition");

  return c;
}

/** The C# build's static classes GameFactory and CharacterFactory. */
export const GameFactory = { newGame };
export const CharacterFactory = { populate };

