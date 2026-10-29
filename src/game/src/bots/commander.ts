/**
 * Script commanders (build order item 13, "Generals lead armies", "Army mandates", "What a good general does better"): how
 * a commander on the spot carries out his army's mandate in a season no order of his king's reaches it. He sees what the
 * army sees, where it stands and one province around, and weighs a number of moves set by his competence (his tactical
 * look-ahead): a poor general misses moves a good one finds. He reads strength through his own eyes, a poor one less
 * well, and keeps to the mandate's limits by his loyalty, so the same mandate plays out differently by who receives it.
 */
import {
  CommandData,
  CommanderMinds,
  WorldMap,
  besiege,
  cheapestRoute,
  cmpNum,
  cmpStr,
  hold,
  move,
  sortBy,
  support,
  unitWeight,
  menOf,
  type Character,
  type Mandate,
  type Order,
  type Power,
  type TurnEngine,
  type Unit,
} from "@amarna/engine";

const Map_ = WorldMap.default;

/** A candidate order and the commander's worth for it. */
interface Option {
  order: Order;
  worth: number;
}

/** The order the commander gives his unit by its mandate, or null to hold. */
export function commanderOrder(e: TurnEngine, u: Unit, c: Character, m: Mandate): Order | null {
  const S = e.s;
  const me = u.power;
  // What the army sees: its own province and one around.
  const near = new Set([u.province, ...Map_.neighbors(u.province)]);
  const seen = S.units.filter((x) => near.has(x.province));
  const rng = e.r("commander", `${c.id}|${u.id}`);
  // He reads strength through his own eyes: a poor general misjudges by up to half, a good one hardly at all.
  const misread = (w: number): number => Math.max(1, Math.floor((w * (100 + rng.range(-1, 1) * Math.floor((100 - c.traits.competence) / 2))) / 100));
  const weight = (x: Unit): number => unitWeight(x, menOf(x.kind));
  const mine = misread(weight(u));
  const foe = (x: Unit): boolean => x.power !== me && x.power !== m.power && !(m.task === "support" && x.power === m.power);
  const avoided = (p: Power | null): boolean => p !== null && m.avoidPower !== null && p === m.avoidPower;
  const holderOf = (p: string): Power | null => S.owner.getOrDefault(p, null);
  const threat = (p: string): number =>
    seen
      .filter((x) => foe(x) && Map_.neighbors(p).includes(x.province))
      .reduce((a, x) => a + misread(weight(x)), 0);
  // The step on the road towards a place, over the land his army can cross.
  const stepTo = (target: string): string | null => {
    if (target === u.province) return null;
    const r = cheapestRoute(Map_, u.province, target, (a, b) => (Map_.canMove(u.kind, a, b) ? 1 : Infinity));
    return r === null || r.route.length < 2 ? null : r.route[1];
  };
  const options: Option[] = [{ order: hold(u.province), worth: 0 }];
  const moves = sortBy(
    Map_.neighbors(u.province).filter((n) => Map_.canMove(u.kind, u.province, n)),
    [(n: string) => n, cmpStr],
  );
  for (const n of moves) {
    const there = S.units.find((x) => x.province === n) ?? null;
    if (there !== null && there.power === me) continue;
    if (avoided(there?.power ?? null) || avoided(holderOf(n))) continue;
    // Fighting by the rules of engagement: never when told to avoid battle; with the advantage only, when so told.
    const enemy = there !== null && foe(there) ? misread(weight(there)) : 0;
    if (enemy > 0 && m.engage === "avoid") continue;
    if (enemy > 0 && m.engage === "advantage" && mine <= enemy) continue;
    let worth = -1;
    if (m.task === "guard") {
      const centre = m.target ?? u.province;
      const inRegion = n === centre || Map_.neighbors(centre).includes(n);
      if (!inRegion) continue;
      worth = enemy > 0 ? 3 : n === centre && u.province !== centre ? 2 : -1;
    } else if (m.task === "invade" || m.task === "besiege" || m.task === "raid") {
      const target = m.target!;
      const back = m.task === "raid" && u.province === target;
      if (back) worth = holderOf(n) === me ? 3 : -1;
      else worth = n === target ? 4 : stepTo(target) === n ? 3 : -1;
    } else if (m.task === "shadow" && m.power !== null) {
      const theirs = S.units.filter((x) => x.power === m.power && near.has(x.province));
      worth = theirs.some((x) => Map_.neighbors(n).includes(x.province)) && there === null ? 2 : -1;
    } else if (m.task === "support" && m.power !== null) {
      const theirs = S.units.filter((x) => x.power === m.power);
      const nearest = sortBy(theirs, [(x: Unit) => (cheapestRoute(Map_, n, x.province, () => 1)?.cost ?? 99), cmpNum])[0];
      worth = nearest !== undefined && there === null && stepTo(nearest.province) === n ? 1 : -1;
    }
    if (worth < 0) continue;
    // A careful general weighs what could strike him where he goes.
    if (m.withdraw === "outnumbered" && threat(n) > mine) worth -= 2;
    options.push({ order: move(u.province, n), worth });
  }
  // Besiege the city he stands in, when that is the task or a walled city of a foe he invades.
  if (u.kind === "Army" && S.walls.getOrDefault(u.province, 0) > 0 && holderOf(u.province) !== me) {
    const worth = m.task === "besiege" || m.task === "invade" ? 5 : m.task === "raid" ? -1 : 1;
    if (worth >= 0) options.push({ order: besiege(u.province), worth });
  }
  // Support a friend's unit beside him, holding.
  if (m.task === "support" && m.power !== null)
    for (const x of seen.filter((x) => x.power === m.power && Map_.neighbors(u.province).includes(x.province)))
      options.push({ order: support(u.province, x.province), worth: 3 });
  // Outnumbered where he stands: fall back to his own land, unless told to hold at all costs.
  if (m.withdraw === "outnumbered" && threat(u.province) > mine) {
    const home = moves.find((n) => holderOf(n) === me && !S.units.some((x) => x.province === n) && threat(n) < threat(u.province));
    if (home !== undefined) options.push({ order: move(u.province, home), worth: 4 });
  }
  // His look-ahead: he weighs only so many options, a poor general missing those he never thinks of.
  const weighs = CommandData.searchLeast + Math.floor(c.traits.competence / CommandData.searchPer);
  const considered = rng.shuffle(options.slice(1)).slice(0, weighs - 1);
  const best = sortBy([options[0], ...considered], [(o: Option) => -o.worth, cmpNum])[0];
  // A disloyal commander keeps to his limits less strictly: he may sit out a task he was given (first guess: by his
  // disloyalty, half the time at most).
  if (best.worth > 0 && c.traits.loyalty < 50 && rng.chance((50 - c.traits.loyalty) / 100)) return null;
  return best.worth <= 0 ? null : best.order;
}

/** The script commanders' minds, set once the game's bots are loaded. */
CommanderMinds.decide = commanderOrder;
