/** The presets a table picks from: who plays what in each, and each job's other rungs and planning. */
import { AllPowers } from "@amarna/engine";
import { SeatChoices, characterModel, leaderModel, narratorModel, rungModel, type CharacterKind, type LeaderKind, type NarratorKind } from "./seat-setup.ts";

/** A preset's choices beyond the seats: each job's other rungs and planning. */
export interface PresetRungs {
  small: string;
  plays: "large" | "small";
  charactersUp: string;
  planning: string;
}

/** A named way to play. Human seats chosen by the player are kept when a preset is applied. */
export class Preset {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly leaders: LeaderKind;
  readonly characters: CharacterKind;
  readonly narrator: NarratorKind;
  readonly rungs: PresetRungs;
  constructor(
    id: string,
    name: string,
    tagline: string,
    leaders: LeaderKind,
    characters: CharacterKind,
    narrator: NarratorKind,
    rungs: PresetRungs = { small: "Haiku", plays: "large", charactersUp: "Sonnet", planning: "Off" },
  ) {
    this.id = id;
    this.name = name;
    this.tagline = tagline;
    this.leaders = leaders;
    this.characters = characters;
    this.narrator = narrator;
    this.rungs = rungs;
  }
  get needsKey(): boolean {
    return leaderModel(this.leaders) !== null || this.characters !== "Script" || this.narrator !== "Template";
  }
  applyTo(c: SeatChoices): void {
    for (const p of AllPowers) if (c.leaders.get(p) !== "Human") c.leaders.set(p, this.leaders);
    c.characters = this.characters;
    c.narrator = this.narrator;
    c.small = this.rungs.small;
    c.smallFor = {};
    c.plays = this.rungs.plays;
    c.charactersUp = this.rungs.charactersUp;
    c.planning = this.rungs.planning;
  }
  matches(c: SeatChoices): boolean {
    // By the models named, so a shorthand and the model it stands for are the same choice.
    const same = (a: string, b: string, model: (k: string) => string | null): boolean => (model(a) ?? a) === (model(b) ?? b);
    return (
      [...c.leaders.values()].filter((v) => v !== "Human").every((v) => same(v, this.leaders, leaderModel)) &&
      same(c.characters, this.characters, characterModel) &&
      same(c.narrator, this.narrator, narratorModel) &&
      // The other rungs count only where they are in play: a Free table has no small rung to differ by.
      (!this.needsKey ||
        (same(c.small, this.rungs.small, rungModel) &&
          Object.values(c.smallFor).every((v) => v === undefined || v.length === 0) &&
          c.plays === this.rungs.plays &&
          same(c.charactersUp, this.rungs.charactersUp, rungModel) &&
          same(c.planning, this.rungs.planning, rungModel)))
    );
  }
}

const Free = new Preset("free", "Free", "Script kings, envoys and narrator. No key and no cost; a whole game takes seconds.", "Script", "Script", "Template");
const Budget = new Preset("budget", "Budget", "Every role on Haiku 5.5. Cheap enough to play often; the kings plan less shrewdly.", "Haiku", "Haiku", "Haiku", {
  small: "Haiku",
  plays: "large",
  charactersUp: "Off",
  planning: "Off",
});
const Standard = new Preset(
  "standard",
  "Standard",
  "The table the game is built for: Sonnet 5.5 kings and narrator, Haiku 5.5 envoys and spies.",
  "Sonnet",
  "Haiku",
  "Sonnet",
);
const Counsel = new Preset(
  "counsel",
  "Counsel",
  "Haiku 5.5 plays every king and character; Sonnet 5.5 writes each king's plan once a year, gives counsel, takes whatever is passed up and narrates.",
  "Sonnet",
  "Haiku",
  // The narrator on the large model (the owner, answering item 6c's review, 27 October 2026).
  "Sonnet",
  { small: "Haiku", plays: "small", charactersUp: "Sonnet", planning: "Sonnet" },
);
const Showcase = new Preset(
  "showcase",
  "Showcase",
  "Opus 5.5 kings and narrator for the sharpest diplomacy. Envoys stay on Haiku 5.5: fallible messengers are part of the design.",
  "Opus",
  "Haiku",
  "Opus",
);

export const Presets = {
  Free,
  Budget,
  Counsel,
  Standard,
  Showcase,
  all: [Free, Budget, Counsel, Standard, Showcase] as readonly Preset[],
  /** Local play on a Claude subscription. Not in `all`: offered only when the game runs on this computer. */
  Local: new Preset(
    "local",
    "Local agents",
    "Kings played by Claude agents in a Claude Code session on this computer, on your Claude subscription. Needs the local bridge; envoys and narrator are scripts.",
    "LocalAgent",
    "Script",
    "Template",
  ),
  find(id: string | null | undefined): Preset | null {
    return Presets.all.find((p) => p.id === id) ?? null;
  },
  matching(c: SeatChoices): Preset | null {
    return Presets.all.find((p) => p.matches(c)) ?? null;
  },
};
