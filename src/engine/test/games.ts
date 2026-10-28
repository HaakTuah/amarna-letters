import {
  Dict,
  type GameConfig,
  type GameState,
  type Power,
  Rng,
  TurnEngine,
  type TurnSubmission,
  WorldMap,
  alive,
  dispatch,
  hire,
  renew,
  move,
  newAudienceRecord,
  newAudienceRound,
  newGame,
  newGameConfig,
  newHostReply,
  newMindReply,
  newTabletProposal,
  newTurnSubmission,
  raise,
  unitAt,
} from "@amarna/engine";
import { firstOrNull, orderBy, walled } from "./support.ts";
/** Games the ported tests share across files (the C# suite reached into SiegeTests and EngineTests for them). */

/** Seed 1 with no catastrophes, and Suhu walled 2 as Mari was before item 7a: the board the siege tests start from. */
export function siegeBoard(): GameState {
  return walled(newGame(1, newGameConfig({ catastropheChance: 0 })), "suhu", 2);
}

/** A game of random but legal-looking orders, every model task answered with filler. */
export function playRandom(seed: number, turns: number, config: GameConfig | null = null): GameState {
  let s = newGame(seed, config ?? newGameConfig({ capMin: 99, capMax: 99, endMedian: 10000 }));
  let map = WorldMap.default;
  for (let i = 0; i < turns && !s.ended; i++) {
    let e = new TurnEngine(s);
    e.beginTurn();
    for (const req of [...e.mindRequests]) e.fulfil(req, newMindReply({ text: `text for ${req.task}`, number: 20 }));
    for (const a of [...s.audiences])
      e.applyAudience(
        newAudienceRecord({
          audienceId: a.id,
          delivered: a.dispatch.letter,
          rounds: [newAudienceRound({ host: newHostReply({ speech: "Welcome.", sealProposal: true }) })],
        }),
      );

    let subs = new Dict<Power, TurnSubmission>();
    for (const p of alive(s)) {
      let rng = Rng.for(seed, s.turn, "test-orders", p.toString());
      let sub = newTurnSubmission();
      for (const u of orderBy(
        s.units.filter((u) => u.power === p),
        (u) => u.id,
      )) {
        let moves = map.movesFrom(u.kind, u.province);
        if (moves.length > 0 && rng.chance(0.7)) sub.orders.push(move(u.province, rng.pick(moves)));
      }
      let home = map.homeOf(p).filter((x) => s.owner.get(x.id) === p && unitAt(s, x.id) === null);
      if (home.length > 0 && s.treasuries.get(p).gold > 300) sub.orders.push(raise(home[0].id, "Army"));
      // Each errand is a job (Haakon's answers to item 11a): a servant at court whose job is another errand, or a free
      // person standing there, is offered the job for this one, generously, and sent at once.
      let envoy =
        firstOrNull(s.characters, (c) => c.employer === p && c.duty === "None" && c.at === p && c.status === "Employed") ??
        firstOrNull(s.characters, (c) => c.status === "Free" && c.at === p && c.duty === "None" && c.heldBy === null && c.errand === null);
      if (envoy !== null && rng.chance(0.3)) {
        let to = rng.pick(alive(s).filter((x) => x !== p));
        const job = { what: "envoy", where: to, payOnDone: true } as const;
        if (envoy.status === "Free") sub.orders.push(hire(envoy.id, 600, 20, 100, job));
        else if (envoy.contract?.errand != null) sub.orders.push(renew(envoy.id, 600, 20, 100, job));
        sub.orders.push(dispatch(envoy.id, to, "Greetings, brother.", { gold: 30, proposal: newTabletProposal({ text: "Peace between us." }) }));
      }
      subs.set(p, sub);
    }
    e.resolve(subs);
  }
  return s;
}
