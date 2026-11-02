/**
 * The plan's opening ("Passing up and asking advice": the strong model writes the plan "from a digest of the year ...
 * rather than the whole record"): what a planner needs of the rules, never the kings' whole rulebook. Byte-stable for a
 * configuration, so every king's plan reads it from one cache.
 */
import { GameConfigSchema, serialize, type GameConfig } from "@amarna/engine";
import { conditionsRules, howYouWin, standingAnswersRules } from "./rules.ts";

const cache = new Map<string, string>();

export function planRules(c: GameConfig): string {
  const key = serialize(GameConfigSchema, c);
  let text = cache.get(key);
  if (text === undefined) cache.set(key, (text = rules(c)));
  return text;
}

function rules(c: GameConfig): string {
  return `${howYouWin(c, false)}

YOUR PLAN
- Here you set down your plan for the seasons ahead, from your record and your realm in brief: your aims, your friends and enemies, what to do and what to watch for. You give no orders here: you give them in your orders, with your full view and your full rulebook, playing by this plan.
- The plan stays in your record until it is written anew, before your next orders, once a year has passed since it, or if since it you have lost land, your capital has come under threat or a kingdom has fallen, or when you ask for it in your orders.
- With it you may leave standing answers for the envoys you expect, and cancel those you no longer want.

${conditionsRules(c)}

${standingAnswersRules("in your orders, at your court or with your plan")}`;
}
