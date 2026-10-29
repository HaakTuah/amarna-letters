/**
 * The smallest game that tests the rule (Haakon, 29 October 2026): what most game tests play instead of the whole world.
 * Script kings plan for every power they play, and that planning is most of what a season costs, so a small world is a few
 * neighbouring powers played by the seats a test needs, every other power held by an {@link IdleSeat} that gives no
 * orders, and a short game. Script kings' planning grows with the number of kings, not of powers: a power more in the
 * starting world is one idle seat more here, which costs the engine little. Full-size games, every power a script king,
 * are kept to the named tests that guard the whole: the replay of seed 1 in "Script games finish and replay exactly"
 * (runner.test.ts), the engine's "State survives a json round trip" and the starting-world checks (engine.test.ts), and
 * the one test whose rule needs the whole world in a few seasons, "A file seat sleeps by default and replays exactly"
 * (file-seat.test.ts). Long measurements run in scripts/sim.sh, never in the suite.
 */
import { AllPowers, Dict, type GameConfig, newGameConfig, newHostReply, newTurnSubmission, type AudienceView, type HostReply, type Power, type SeatView, type TurnSubmission } from "@amarna/engine";
import { type ISeat, ScriptLeader } from "@amarna/game";

/**
 * The default few: three neighbours along the Euphrates and the Tigris, Mitanni, Assyria between it and Babylonia, so
 * armies meet, cities are besieged and envoys travel within a few seasons. Each script king a test adds costs more than the
 * rest of the season together.
 */
export const Near: readonly Power[] = ["Mitanni", "Assyria", "Babylonia"];

/** A power nobody in the test plays: it gives no orders, and hears every envoy out without an answer. */
export class IdleSeat implements ISeat {
  readonly label = "Idle";

  decide(_view: SeatView): Promise<TurnSubmission> {
    return Promise.resolve(newTurnSubmission());
  }

  hostAudience(_view: AudienceView, _court: SeatView): Promise<HostReply> {
    return Promise.resolve(newHostReply());
  }
}

/** Every power's seat: the given powers played by `seat`, the rest idle. */
export function smallSeats(seat: (p: Power) => ISeat, powers: readonly Power[] = Near): Dict<Power, ISeat> {
  return new Dict(AllPowers.map((p) => [p, powers.includes(p) ? seat(p) : new IdleSeat()] as const));
}

/** Script kings for the given powers (the default few), the rest idle. */
export const scriptSeats = (seed: number, powers: readonly Power[] = Near): Dict<Power, ISeat> => smallSeats(() => new ScriptLeader(seed), powers);

/** A game that ends after exactly this many seasons, with any other settings given. */
export const seasons = (n: number, init: Partial<GameConfig> = {}): GameConfig => newGameConfig({ capMin: n, capMax: n, endMedian: 10000, ...init });
