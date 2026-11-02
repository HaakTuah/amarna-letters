/** What a game's seats are estimated to cost, and whether a spending limit can hold against them. */
import { AllPowers, fmt, roundEven } from "@amarna/engine";
import { AnthropicId, splitModel } from "./client.ts";
import { BatchDiscount, ModelIds, PriceTable } from "./models.ts";
import { SeatChoices, characterModel, leaderModel, narratorModel, rungModel, smallModel } from "./seat-setup.ts";

/**
 * What a game costs, before it starts ("What a season costs" under "Calls that get through, live or in the background"):
 * from the token counts of a recorded game, the Haiku game of 1 November 2026 (`tests/fixtures/model-games/`), with each
 * shared opening's cache written once a season and read by every other call, live or in the background. The in-game meter
 * shows the actual figure.
 */
export const CostEstimate = {
  /** The median game: half of all ages have ended by season 44 (1332 BCE) by default. */
  TypicalSeasons: 44,
  /**
   * Tokens of one call of each kind as recorded (fresh input, output, and its shared opening, read from cache), and how
   * many such calls a season makes on the starting map; the kings' share comes per king, from how often they wake.
   */
  Recorded: {
    orders: { fresh: 7000, output: 1650, opening: 70_600 },
    court: { fresh: 4000, output: 1470, opening: 63_000 },
    life: { fresh: 5200, output: 590, opening: 1600, perSeason: 40 },
    envoy: { fresh: 1200, output: 330, opening: 1100, perSeason: 60 },
    persona: { fresh: 1080, output: 1380, characters: 122 },
    /**
     * Not yet recorded: a plan reads its own opening (`planRules`, 9,189 characters against the kings' rulebook's 164,710,
     * so about 3,900 of its 70,600 tokens), the king's realm in brief and his record, and writes the plan and its answers.
     */
    plan: { fresh: 4000, output: 900, opening: 3900 },
  },
  /** What one season costs with these choices, live or in the background (the batch service, at its discount). */
  perSeason(c: SeatChoices, background = false): number {
    const prices = new PriceTable(c.prices);
    const R = CostEstimate.Recorded;
    const batched = (model: string | null): boolean => model !== null && CostEstimate.batched(c, model, background);
    const effort = c.leaderEffort === "low" ? 0.6 : c.leaderEffort === "high" ? 1.6 : 1.0;
    // Calls of one kind and one opening: `n` calls a season, all reading the opening but the one that writes it.
    const calls = (model: string | null, n: number, k: { fresh: number; output: number; opening: number }, scale = 1): number => {
      const price = model !== null ? prices.for(model) : null;
      if (price === null || n <= 0) return 0;
      const writes = Math.min(1, n);
      const write = batched(model) ? price.cost(0, 0, 0, k.opening, k.opening) : price.cost(0, 0, 0, k.opening);
      const live = n * price.cost(k.fresh, Math.trunc(k.output * scale), 0, 0) + (n - writes) * price.cost(0, 0, k.opening, 0) + writes * write;
      return live * (batched(model) ? BatchDiscount : 1);
    };
    // By model, how many calls of each kind the kings make a season: as measured in item 6b (src/batch/src/measure.ts,
    // script games shadowed by model kings that sleep), a king gives orders in about three seasons in ten and holds court,
    // all its envoys in one call, in about one in five. The ladder's first guesses (item 6c, not measured until the model
    // games): a small rung that plays the king passes one decision in five up; routine courts, most of a sleeping king's,
    // one in three; light alerts come in about one season in three; one decision in twenty is audited on the rung above; a
    // plan is written once a year and twice more.
    const orders = new Map<string, number>();
    const courts = new Map<string, number>();
    const light = new Map<string, number>();
    const plans = new Map<string, number>();
    const add = (m: Map<string, number>, model: string | null, n: number): void => void (model !== null && m.set(model, (m.get(model) ?? 0) + n));
    for (const p of AllPowers) {
      const model = leaderModel(c.leaders.get(p));
      if (model === null) continue;
      const small = smallModel(c, p);
      if (small !== null && c.plays === "small") {
        add(orders, small, 0.3);
        add(orders, model, 0.3 * 0.2);
        add(courts, small, 0.2);
        add(courts, model, 0.2 * 0.2);
      } else {
        add(orders, model, 0.3);
        if (small !== null) {
          add(courts, small, 0.2);
          add(courts, model, 0.2 * 0.3);
        } else add(courts, model, 0.2);
      }
      if (small !== null) {
        add(light, small, 0.3);
        add(orders, model, 0.05 * 0.4);
      }
      add(plans, rungModel(c.planning), 1 / 3);
    }
    let total = 0;
    for (const [m, n] of orders) total += calls(m, n, R.orders, effort);
    for (const [m, n] of courts) total += calls(m, n, R.court, effort);
    // Light alerts: a short call over the kings' opening. Plans: over their own short opening.
    for (const [m, n] of light) total += calls(m, n, { fresh: 3000, output: 600, opening: R.orders.opening });
    for (const [m, n] of plans) total += calls(m, n, R.plan, effort);
    const cm = characterModel(c.characters);
    if (cm !== null) {
      const up = rungModel(c.charactersUp);
      const climbs = up !== null && up !== cm ? 0.15 : 0;
      total += calls(cm, R.life.perSeason, R.life) + calls(cm, R.envoy.perSeason, R.envoy);
      if (climbs > 0) total += calls(up, climbs * R.life.perSeason, R.life) + calls(up, climbs * R.envoy.perSeason, R.envoy);
    }
    return total;
  },
  /** Whether a model's calls go by the batch service: in the background, Anthropic's; other providers' stay live. */
  batched(c: SeatChoices, model: string, background: boolean): boolean {
    return background && splitModel(model, c.providersInUse).provider === AnthropicId;
  },
  /** A game of `seasons`: its seasons, the narrator's personas at setup and its chronicle at the end. */
  perGame(c: SeatChoices, seasons = 44, background = false): number {
    const prices = new PriceTable(c.prices);
    let total = seasons * CostEstimate.perSeason(c, background);
    const nm = narratorModel(c.narrator);
    const price = nm !== null ? prices.for(nm) : null;
    if (price !== null) {
      const P = CostEstimate.Recorded.persona;
      const narrator = P.characters * price.cost(P.fresh, P.output, 0, 0) + 7 * price.cost(3000, 1200, 0, 0) + 5 * price.cost(300, 200, 0, 0);
      total += narrator * (CostEstimate.batched(c, nm!, background) ? BatchDiscount : 1);
    }
    return total;
  },
  /** The models in use that have no price set: the meter shows their cost as unknown, never as free. */
  unpriced(c: SeatChoices): string[] {
    const prices = new PriceTable(c.prices);
    return c.models.filter((m) => prices.for(m) === null);
  },
  /**
   * The estimate as the setup shows it: unknown while a model in use has no price (never free, so the figure never quietly
   * under-reports), else as {@link describe} words it.
   */
  describeFor(c: SeatChoices, seasons = 44, background = false): string {
    const unpriced = CostEstimate.unpriced(c);
    if (unpriced.length > 0) return `unknown (no price for ${unpriced.map(ModelIds.display).join(", ")})`;
    return CostEstimate.describe(CostEstimate.perGame(c, seasons, background));
  },
  /** A season's cost as the setup shows it: "$0.27"; unknown while a model in use has no price. */
  describeSeason(c: SeatChoices, background = false): string {
    return CostEstimate.unpriced(c).length > 0 ? "unknown" : `$${fmt(CostEstimate.perSeason(c, background), "0.00")}`;
  },
  /** "about $9", "under $1", "free". */
  describe(dollars: number): string {
    if (dollars <= 0) return "free";
    if (dollars < 1) return "under $1";
    if (dollars < 10) return `about $${fmt(roundEven(dollars), "0")}`;
    return `about $${fmt(roundEven(dollars / 5) * 5, "0")}`;
  },
  /** A spending cap with room for a long game: half again the estimate, at least $1. */
  suggestedBudget(dollars: number): number {
    return dollars <= 0 ? 0 : Math.max(1, Math.ceil(dollars * 1.5));
  },
};

/**
 * Why a table cannot start, or null: a game with a spending limit does not start until every model it uses has a price,
 * since a limit cannot hold against spending it cannot count ("Every model is the table's choice"); a local model the table
 * prices at nothing is free. A simulated API spends nothing.
 */
export function startProblem(c: SeatChoices, limitUsd: number, simulated = false): string | null {
  if (simulated || !c.usesModels || limitUsd <= 0) return null;
  const unpriced = CostEstimate.unpriced(c);
  if (unpriced.length === 0) return null;
  return `This game has a spending limit, which cannot hold against spending it cannot count: set a price for ${unpriced.map(ModelIds.display).join(", ")} (0 for a free local model) before it begins.`;
}
