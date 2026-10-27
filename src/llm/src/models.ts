/**
 * Models are settings, not a fixed list ("Built to outlive its models"): a job names any model, "claude-sonnet-5-5" or
 * "<provider>:<model>". The three names below are the presets' shorthands, and the prices only defaults a table may
 * change: a model with no price set costs nothing by the meter and says so.
 */
export const ModelIds = {
  Opus: "claude-opus-5-5",
  Sonnet: "claude-sonnet-5-5",
  Haiku: "claude-haiku-5-5",
  display(model: string): string {
    return model === ModelIds.Opus ? "Opus 5.5" : model === ModelIds.Sonnet ? "Sonnet 5.5" : model === ModelIds.Haiku ? "Haiku 5.5" : model;
  },
  /** The model a display name stands for (the reverse of `display`), for reading a saved game's seats back. */
  fromDisplay(name: string): string {
    return name === "Opus 5.5" ? ModelIds.Opus : name === "Sonnet 5.5" ? ModelIds.Sonnet : name === "Haiku 5.5" ? ModelIds.Haiku : name;
  },
  /** Server-side refusal fallback is offered on Opus and Sonnet 5.5; Haiku has none, nor has any other model here. */
  supportsFallback(model: string): boolean {
    return model === ModelIds.Opus || model === ModelIds.Sonnet;
  },
};

/** Dollars per million tokens. Cache writes (5-minute) cost 1.25x input. */
export class Price {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  constructor(input: number, output: number, cacheRead: number) {
    this.input = input;
    this.output = output;
    this.cacheRead = cacheRead;
  }
  get cacheWrite(): number {
    return this.input * 1.25;
  }
  cost(input: number, output: number, cacheRead: number, cacheWrite: number): number {
    return (input * this.input + output * this.output + cacheRead * this.cacheRead + cacheWrite * this.cacheWrite) / 1_000_000.0;
  }
}

/** A price as settings hold it: dollars per million input, output and cache-read tokens. */
export type PriceSetting = [input: number, output: number, cacheRead: number];

/** The default prices, by model setting. */
export const DefaultPrices: Readonly<Record<string, PriceSetting>> = {
  [ModelIds.Opus]: [4.0, 20.0, 0.2],
  [ModelIds.Sonnet]: [2.0, 10.0, 0.2],
  [ModelIds.Haiku]: [0.1, 0.5, 0.01],
};

/** The prices a game uses: the defaults, with the table's own settings over them. */
export class PriceTable {
  private readonly prices: Map<string, Price>;
  constructor(settings: Readonly<Record<string, PriceSetting>> = {}) {
    this.prices = new Map(Object.entries({ ...DefaultPrices, ...settings }).map(([m, [i, o, c]]) => [m, new Price(i, o, c)] as const));
  }
  /** The price of a model, or null when none is set. */
  for(model: string): Price | null {
    return this.prices.get(model) ?? null;
  }
  cost(model: string, input: number, output: number, cacheRead: number, cacheWrite: number): number {
    return this.for(model)?.cost(input, output, cacheRead, cacheWrite) ?? 0;
  }
}
