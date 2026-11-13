/**
 * The plan's opening ("Passing up and asking advice": the strong model writes the plan "from a digest of the year ...
 * rather than the whole record"): what a planner needs of the rules, never the kings' whole rulebook. Byte-stable for a
 * configuration, so every king's plan reads it from one cache.
 */
import { GameConfigSchema, MaxAnswers, MaxConditions, serialize, type GameConfig } from "@amarna/engine";
import { howYouWin } from "./rules-winning.ts";

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

/** What a condition on a standing order, a scheduled entry or a standing answer reads. */
export function conditionsRules(c: GameConfig): string {
  return `CONDITIONS
- ${c.sleepingSeats ? "A scheduled entry or a standing order" : "A standing order"} may carry conditions (at most ${MaxConditions}): it runs only if every "if" holds and no "unless" does when it would run. They are read from what you know when they would run, never from what you cannot see: for orders, once the season's audiences are over (what was given and sealed at them counts); for standing answers, as your court begins; troops_in, troops of a power (or any foreign power's) in a province, where you can see them (troops you cannot see count as not there); treasury_less_than and treasury_at_least, your treasury by your ledger; envoy_back, one of your people back at your court and ready; tablet_sealed, a tablet in your archive sealed by you and a court (or any court); stores_at_least, the stores of a province of yours hold at least that many measures of grain.${c.sleepingSeats ? " Scheduled orders whose conditions do not hold are dropped for that season, which your news tells you and which wakes nobody." : ""} A standing order whose conditions do not hold when its move comes does not fire, and still stands.`;
}

/** Standing answers, and where a king may give them (`where`: the requests whose reply has the field). */
export function standingAnswersRules(where: string): string {
  return `STANDING ANSWERS (standing_answers, ${where})
- Leave answers in advance for the envoys that come to your court, as an envoy carries your mandate: whose envoys (one court's, or any), what he brings (anything; only words; gold, at least an amount his lord sent with him, as his inventory states it; a tablet to seal), and what you do: seal his tablet or not, send back a share of the gold he brings for his lord (100% is a gift of like value), and the gist of what you say, which your scribes put into words. Conditions may limit one (see CONDITIONS). You may keep at most ${MaxAnswers}; cancel them by their ids (cancel_answers), or "all".
- An envoy one covers is answered in your name, in one exchange, and wakes nobody: you read in your news what was done. The first answer that covers him, in the order you gave them, is the one used. An envoy who shows tablets as evidence is never covered: you receive him yourself, as you do every envoy no answer covers.
- Give one only for what you would answer the same way whatever else he says: whatever he says beyond his gifts and his tablet goes unanswered until your next letter.`;
}
