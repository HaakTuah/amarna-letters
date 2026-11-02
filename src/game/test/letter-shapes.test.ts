import { describe, test } from "vitest";
import { scriptSeats, seasons } from "./small-world.ts";
import { newGame, type AudienceView, type HostReply, type Power, type SeatView, type TurnSubmission } from "@amarna/engine";
import { GameRunner, type ISeat, ScriptMind, TemplateNarrator } from "@amarna/game";
import { TextKit } from "../src/bots/textkit.ts";
import { Assert } from "../../engine/test/support.ts";

/** A script king's seat that keeps what it writes: its letters, and its words to the envoys it hears. */
class Kept implements ISeat {
  readonly label = "Kept";
  readonly letters: string[] = [];
  readonly speeches: string[] = [];

  readonly inner: ISeat;

  constructor(inner: ISeat) {
    this.inner = inner;
  }

  async decide(view: SeatView): Promise<TurnSubmission> {
    const s = await this.inner.decide(view);
    for (const o of s.orders) if (o.type === "dispatch" && o.letter.trim() !== "") this.letters.push(o.letter);
    return s;
  }

  async hostAudience(view: AudienceView, court: SeatView): Promise<HostReply> {
    const r = await this.inner.hostAudience(view, court);
    if (r.speech.trim() !== "") this.speeches.push(r.speech);
    return r;
  }
}

/** A sentence's shape: its names and numbers blanked, so the same template filled in differently is one shape. */
const shape = (s: string): string =>
  s
    .replace(/\d[\d,]*/g, "#")
    .replace(/(?<!^)\b[A-Z][\w'-]*/g, "X")
    .toLowerCase();

/** The commonest shape in these texts, and the share of the texts it appears in. */
function commonest(texts: string[]): [string, number] {
  const n = new Map<string, number>();
  for (const t of texts) for (const s of new Set(TextKit.sentences(t).map(shape))) n.set(s, (n.get(s) ?? 0) + 1);
  const top = [...n].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  return [top[0], texts.length === 0 ? 0 : top[1] / texts.length];
}

// The slop audit's guard (archive item 178): a script king whose letters, or whose words in audience, keep repeating one
// sentence across a game reads as a machine. No sentence's shape may be in more than half of what one king writes.
describe("LetterShapeTests", () => {
  test("No script king repeats one sentence in most of his letters or audiences", async () => {
    const kept = new Map<Power, Kept>();
    const seats = scriptSeats(5);
    for (const [p, s] of [...seats]) if (s.label !== "Idle") seats.set(p, kept.set(p, new Kept(s)).get(p)!);
    const runner = new GameRunner(newGame(5, seasons(10)), seats, new ScriptMind(), new TemplateNarrator());
    await runner.prepare();
    while (await runner.playTurn());
    let checked = 0;
    for (const [p, k] of kept)
      for (const [what, texts] of [["letters", k.letters], ["audiences", k.speeches]] as const) {
        if (texts.length < 6) continue;
        checked++;
        const [s, share] = commonest(texts);
        Assert.true(share <= 0.5, `${p}'s ${what}: "${s}" in ${Math.round(share * 100)}% of ${texts.length}`);
      }
    Assert.true(checked >= 3, `only ${checked} kings wrote enough to judge`);
  });
});
