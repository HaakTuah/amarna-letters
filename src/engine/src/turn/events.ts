/**
 * Seeded catastrophes, known exactly only to the power they strike. A court that can see the stricken land hears of it the
 * next season; distant courts learn of it only through their envoys and spies.
 */
import { Dict } from "../core/collections.ts";
import { sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { land, type Power } from "../model/power.ts";
import { CatastropheKindValues, newCatastrophe } from "../model/records.ts";
import { alive, logEvent, newId, notify, ownedBy, unitLabel, wallsOf, type Unit } from "../model/state.ts";
import { Views } from "../rules/views.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    worldEvents(): void;
  }
}

TurnEngine.prototype.worldEvents = function () {
  const S = this.s;
  const Map = this.map;
  // What each court could see before the season's catastrophes (a plague takes a unit, and with it some sight).
  const sight = new Dict(alive(S).map((p) => [p, Views.sight(S, Map, p)] as const));
  for (const p of alive(S)) {
    const rng = this.r("catastrophe", p);
    if (!rng.chance(S.config.catastropheChance)) continue;
    const owned = ownedBy(S, p);
    if (owned.length === 0) continue;
    const kind = rng.pick(CatastropheKindValues);
    const cat = newCatastrophe({ id: newId(S, "x"), power: p, kind, startTurn: S.turn + 1 });
    let exact: string;
    let plain: string;
    switch (kind) {
      case "Drought":
        cat.endTurn = S.turn + 3;
        cat.incomeFactor = 0.5;
        cat.text = "the rains failed and the harvest withers across the land";
        exact = "The rains have failed. For three seasons the whole realm will yield only half its income.";
        plain = `Travellers say the harvest has failed in ${land(p)}.`;
        break;
      case "Plague": {
        cat.endTurn = S.turn + 2;
        cat.incomeFactor = 0.75;
        cat.text = "the hand of Nergal lies on the land: plague kills soldiers and peasants";
        const victim = sortBy(
          S.units.filter((u) => u.power === p),
          [(u: Unit) => u.id, cmpStr],
        );
        const lost = victim.length > 0 ? rng.pick(victim) : null;
        if (lost !== null) S.units.splice(S.units.indexOf(lost), 1);
        exact = "The hand of Nergal is on the land. Plague will cut income by a quarter for two seasons" + (lost !== null ? `, and it has destroyed your ${unitLabel(lost)}.` : ".");
        plain = `Word comes of sickness in ${land(p)}.`;
        break;
      }
      case "Flood":
        cat.province = rng.pick(owned);
        cat.endTurn = S.turn + 2;
        cat.incomeFactor = 0;
        cat.text = `a great flood has drowned the fields of ${Map.get(cat.province).name}`;
        exact = `A flood has drowned the fields of ${Map.get(cat.province).name}; it will yield nothing for two seasons.`;
        plain = `Travellers speak of floods in ${land(p)}.`;
        break;
      default: {
        cat.province = rng.pick(owned);
        cat.endTurn = S.turn + 4;
        cat.incomeFactor = 0;
        cat.text = `an earthquake has thrown down the walls and storehouses of ${Map.get(cat.province).name}`;
        // It throws the walls down a level (Build order item 5).
        const shaken = wallsOf(S, cat.province) > 0;
        if (shaken) this.lowerWalls(cat.province);
        const left = wallsOf(S, cat.province);
        exact =
          `An earthquake has ruined ${Map.get(cat.province).name}; it will yield nothing for four seasons` +
          (shaken ? `, and its walls stand a level lower (${left > 0 ? `walls ${left}` : "none left"}).` : ".");
        plain = `Word comes that the earth shook in ${land(p)}.`;
        break;
      }
    }
    S.catastrophes.push(cat);
    notify(S, p, "Catastrophe", `Catastrophe: ${kind}`, exact);
    logEvent(S, "catastrophe", `${kind} strikes ${p}: ${cat.text}.`, [p], "catastrophe");

    // Courts that can see the stricken land hear of it next season, as a plain fact; nobody else does.
    const stricken = cat.province !== null ? [cat.province] : owned;
    for (const other of alive(S).filter((o) => o !== p && stricken.some((x) => sight.get(o).has(x)))) notify(S, other, "Notice", "News from nearby", plain);
  }

  // Long stays abroad breed attachment to the host court.
  for (const c of S.characters.filter((c) => c.at !== null && c.employer !== null && c.at !== c.employer && c.turnsAbroad >= 2 && c.turnsAbroad % 2 === 0)) {
    const host: Power = c.at!;
    if (c.traits.sympathy === null || c.traits.sympathy === host) {
      c.traits.sympathy = host;
      c.traits.sympathyStrength = Math.min(100, c.traits.sympathyStrength + 8);
    }
    c.traits.loyalty = Math.max(0, c.traits.loyalty - 3);
  }
};
