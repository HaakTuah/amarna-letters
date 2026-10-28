/**
 * A living pool (build order item 11a): the pool keeps near its baseline, the world it started with ("A baseline, not a
 * limit"). Below it, strangers come more often through the doors where the routes from beyond the map come in ("Arrivals
 * come through doors"); above it, none. Each newcomer is data first ("Who they are"): his land and door, why he came, what
 * he carries, his tongue, a name from his land's attested names (or invented in its style, and marked so), and a backstory
 * that may say anything beyond the map and only what happened on it. Arrivals draw from their own stream, so every seed
 * keeps its characters. Heads rising from the crowd come with the bands of item 11b.
 */
import { clamp } from "../core/num.ts";
import type { Rng } from "../core/rng.ts";
import { cmpNum, count, sortBy } from "../core/seq.ts";
import { Doors, ReasonValues, ReasonWords, type Beyond, type Door, type Reason } from "../model/doors.ts";
import { MoneyData } from "../model/money.ts";
import { newCharacter, newFact, newTraits, type Character } from "../model/people.ts";
import { AllPowers, land, type Power } from "../model/power.ts";
import { newJourney } from "../model/records.ts";
import { alive, isAlive, logEvent, newId, notify } from "../model/state.ts";
import { personaTemplate } from "../rules/personas.ts";
import { drawSkills } from "../rules/skills.ts";
import { chooseStrategy } from "../rules/strategy.ts";
import { Styles } from "../rules/cast.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    newcomers(): void;
    newcomer(rng: Rng, door: Door): Character;
  }
}

const P = TurnEngine.prototype;

/** The chance this season of a newcomer through the doors, in percent: none at or above the baseline. */
export function arrivalChance(baseline: number, living: number): number {
  if (living >= baseline || baseline <= 0) return 0;
  return clamp(MoneyData.arrivalBase + Math.round((MoneyData.arrivalShort * (baseline - living)) / baseline), 0, MoneyData.arrivalMost);
}

function weighted<T>(rng: Rng, items: readonly T[], weight: (x: T) => number): T {
  const total = items.reduce((a, x) => a + weight(x), 0);
  let roll = rng.range(1, Math.max(1, total));
  for (const x of items) {
    roll -= weight(x);
    if (roll <= 0) return x;
  }
  return items[items.length - 1];
}

/** At most one a season, from the stream "arrivals". */
P.newcomers = function () {
  const S = this.s;
  const living = count(S.characters, (c) => c.status !== "Dead");
  const rng = this.r("arrivals");
  if (!rng.chance(arrivalChance(S.baseline, living) / 100)) return;
  const door = weighted(rng, Doors, (d) => d.share);
  const c = this.newcomer(rng, door);
  S.characters.push(c);
  logEvent(S, "newcomer", `${c.name} came onto the map through ${door.name}.`, [], "newcomer");
};

/**
 * A newcomer at a door: one province of it, held by whoever holds it. A door held by a living court brings him to that
 * court's capital ("whoever holds a door sees its newcomers first"); otherwise he walks to the nearest court.
 */
P.newcomer = function (rng, door) {
  const S = this.s;
  const reason = weighted(rng, ReasonValues, (r: Reason) => door.reasons[r]);
  const home = reason === "home";
  const beyond: Beyond = weighted(rng, door.beyond, (b) => b.weight);
  // A local coming home has his own court's name and tongue; anyone else his land's.
  const homeCourt: Power = home ? rng.pick(doorCourts(door)) : "Egypt";
  const style = Styles.find((st) => st.court === homeCourt)!;
  const name = home ? rng.pick(style.names) : rng.pick(beyond.names);
  const origin = home ? rng.pick(style.origins) : beyond.land;
  const competence = Math.min(rng.range(15, 95), rng.range(15, 95));
  const c = newCharacter({
    id: newId(S, "c"),
    name: S.characters.some((x) => x.name === name) ? `${name} the younger` : name,
    origin,
    calling: reason === "trade" ? "trader" : reason === "soldiering" ? "soldier for hire" : home ? rng.pick(style.callings) : "wanderer",
    traits: newTraits({
      loyalty: rng.range(15, 95),
      greed: rng.range(5, 95),
      competence,
      ambition: rng.range(5, 95),
      courage: clamp(rng.range(10, 95) + (reason === "soldiering" ? 15 : reason === "flight" ? -10 : 0), 0, 100),
    }),
  });
  // What he carries, by why he came (first guesses).
  c.purse = c.earned.savings = reason === "trade" ? rng.range(30, 120) : reason === "home" ? rng.range(20, 80) : reason === "soldiering" ? rng.range(5, 30) : rng.range(0, 20);
  const doorAt = rng.pick(door.provinces);
  const add = (text: string, secrecy: "Public" | "Hidden", tag: string): void => {
    c.facts.push(newFact({ id: newId(S, "f"), text, secrecy, tag }));
  };
  add(home ? `Born in ${origin}.` : `Came from ${beyond.land}, ${beyond.people}.`, "Public", "origin");
  add(`Came by ${door.name} to ${this.map.get(doorAt).name}, ${ReasonWords[reason]}.`, "Public", "door");
  add(
    home ? `Speaks the tongue of ${land(homeCourt)}, and something of the lands beyond ${door.name}.` : reason === "trade" || reason === "soldiering" ? `Speaks ${beyond.tongue}, and some of the map's: ${door.mapTongue}.` : `Speaks ${beyond.tongue}, and nothing of the map's.`,
    "Public",
    "tongue",
  );
  // Marked in the data, never told to anyone in the game: a name invented where none survive, a people recorded later.
  c.marked = home ? null : beyond.later ? "first recorded later" : beyond.invented ? "invented name" : null;
  // A backstory beyond the map may say anything: nothing on the map can check it.
  const story = reason === "feud" ? `Fled a blood feud in ${origin}.` : reason === "flight" ? `Lost house and household in a war in ${origin}.` : reason === "home" ? `Spent years beyond ${door.name}, and came back with little to show for it.` : reason === "trade" ? `Owes his partners in ${origin} for the goods he sold on the way.` : `Left ${origin} with nothing but his name.`;
  add(story, "Hidden", "backstory");
  c.traits.sympathy = home ? homeCourt : null;
  c.traits.sympathyStrength = home ? rng.range(30, 70) : 0;
  c.arrived = S.turn;
  c.status = "Free";
  c.seeking = true;
  drawSkills(S.seed, c);
  chooseStrategy(c);
  c.persona = personaTemplate(c);
  const holder = S.owner.getOrDefault(doorAt, null);
  if (holder !== null && isAlive(S, holder)) {
    c.at = holder;
    notify(S, holder, "Notice", "A newcomer", `A newcomer, ${c.name}, ${home ? `of ${origin}` : beyond.people}, has come through ${door.name} at ${this.map.get(doorAt).name} and stands at your court.`, c.id);
    return c;
  }
  // The nearest living court, by travel from the door.
  const courts = sortBy(alive(S), [(p: Power) => this.travelTurnsBetween(doorAt, this.map.capital(p).id), cmpNum], [(p: Power) => AllPowers.indexOf(p), cmpNum]);
  const to = courts[0];
  const j = newJourney({ id: newId(S, "j"), kind: "Travel", departTurn: S.turn, from: to, to, characterId: c.id, seen: [doorAt], reached: [S.turn] });
  j.arriveTurn = S.turn + Math.max(1, this.travelTurnsBetween(doorAt, this.map.capital(to).id));
  S.journeys.push(j);
  c.duty = "Travelling";
  return c;
};

/** The courts whose people come home through a door: those holding one of its provinces at the start, else Babylonia for the east. */
function doorCourts(door: Door): Power[] {
  switch (door.id) {
    case "westsea":
      return ["Arzawa", "Alashiya", "Hatti", "Egypt"];
    case "east":
    case "gulf":
      return ["Babylonia"];
    default:
      return ["Egypt"];
  }
}

