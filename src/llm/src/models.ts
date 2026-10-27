/** The model ids the game offers, and their prices. */
export const ModelIds = {
  Opus: "claude-opus-5-5",
  Sonnet: "claude-sonnet-5-5",
  Haiku: "claude-haiku-5-5",
  display(model: string): string {
    return model === ModelIds.Opus ? "Opus 5.5" : model === ModelIds.Sonnet ? "Sonnet 5.5" : model === ModelIds.Haiku ? "Haiku 5.5" : model;
  },
  /** Server-side refusal fallback is offered on Opus and Sonnet; Haiku has none. */
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
  static for(model: string): Price {
    switch (model) {
      case ModelIds.Opus:
        return new Price(4.0, 20.0, 0.2);
      case ModelIds.Sonnet:
        return new Price(2.0, 10.0, 0.2);
      case ModelIds.Haiku:
        return new Price(0.1, 0.5, 0.01);
      default:
        return new Price(2.0, 10.0, 0.2);
    }
  }
  cost(input: number, output: number, cacheRead: number, cacheWrite: number): number {
    return (input * this.input + output * this.output + cacheRead * this.cacheRead + cacheWrite * this.cacheWrite) / 1_000_000.0;
  }
}
