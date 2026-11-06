/** Begins a turn the way the contract tests do: every mind request answered with a bracketed task, and `number` if the task asks one. */
import { type GameState, TurnEngine, newMindReply } from "@amarna/engine";

export function begin(s: GameState, number = 0): TurnEngine {
  let e = new TurnEngine(s);
  e.beginTurn();
  for (const r of e.mindRequests) e.fulfil(r, newMindReply({ text: `[${r.task}]`, number }));
  return e;
}
