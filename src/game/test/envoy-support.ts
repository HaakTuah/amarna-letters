import {
  type Character,
  type MessageTrail,
  type Power,
  newCharacter,
  newDispatch,
  newHomeCargo,
  newMindRequest,
  newTraits,
} from "@amarna/engine";
import { ScriptMind, newEnvoyContext, newMindContext } from "@amarna/game";

// <summary>A scribe from Mitanni employed by the given king, with the given traits.</summary>
export function envoyOf(employer: Power, loyalty: number, greed: number, competence: number, ambition: number, courage: number): Character {
  return newCharacter({
    id: "c1",
    name: "Keliya",
    origin: "Mitanni",
    calling: "scribe",
    status: "Employed",
    employer: employer,
    traits: newTraits({ loyalty: loyalty, greed: greed, competence: competence, ambition: ambition, courage: courage }),
  });
}

// <summary>What the envoy says at the host's court when he delivers the sender's letter.</summary>
export async function delivered(envoy: Character, sender: Power, host: Power, letter: string): Promise<string> {
  let ctx = newEnvoyContext({ self: envoy, sender: sender, host: host, dispatch: newDispatch({ letter: letter }), turn: 1, seed: 1 });
  return (await new ScriptMind().present(ctx)).speech;
}

// <summary>What the envoy reports to his king at the given court, with the trail of his errand.</summary>
export async function reportOf(envoy: Character, court: Power, trail: MessageTrail, ...observations: string[]): Promise<string> {
  let ctx = newMindContext({
    request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: court, cargo: newHomeCargo({ observations: observations }) }),
    self: envoy,
    turn: 3,
    seed: 1,
    trail: trail,
  });
  return (await new ScriptMind().write(ctx)).text;
}
