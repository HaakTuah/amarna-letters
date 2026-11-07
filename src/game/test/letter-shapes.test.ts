import { describe, expect, test } from "vitest";
import { scriptSeats, seasons } from "./small-world.ts";
import { newGame, type AudienceView, type HostReply, type Power, type SeatView, type TurnSubmission } from "@amarna/engine";
import { GameRunner, type ISeat, ScriptMind, TemplateNarrator } from "@amarna/game";
import { TextKit } from "../src/bots/textkit.ts";
import { Audience, Letter, type LetterParts, closing, pleaHeard } from "../src/bots/voices.ts";
import { Assert } from "../../engine/test/support.ts";
import { ModernShare, reading as readingOf } from "./readings.ts";

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
    // Four script kings, so that three write enough to judge however a war turns: since item 17++a the kings fight the war
    // they choose, and one at war may write too little in ten seasons to be judged.
    const seats = scriptSeats(5, ["Babylonia", "Mitanni", "Assyria", "Egypt"]);
    for (const [p, s] of [...seats]) if (s.label !== "Idle") seats.set(p, kept.set(p, new Kept(s)).get(p)!);
    const runner = new GameRunner(newGame(5, seasons(10)), seats, new ScriptMind(), new TemplateNarrator());
    await runner.prepare();
    while (await runner.playTurn());
    let checked = 0;
    for (const [p, k] of kept)
      for (const [what, texts] of [["letters", k.letters], ["audiences", k.speeches]] as const) {
        if (texts.length < 6) continue;
        checked++;
        // A share in a king's own words is said as the age said it, "a fifth", never "%" (archive item 232).
        for (const t of texts) Assert.false(ModernShare.test(t), `${p}'s ${what} give a share as a percentage: ${t}`);
        const [s, share] = commonest(texts);
        Assert.true(share <= 0.5, `${p}'s ${what}: "${s}" in ${Math.round(share * 100)}% of ${texts.length}`);
      }
    Assert.true(checked >= 3, `only ${checked} kings wrote enough to judge`);
  });

  // Script kings read these words back (voices.ts; what they read for: readings.ts). Every form of a line must read as its
  // first form does, so that choosing one changes no play.
  test("Every form of a line reads to the script kings as its first form does", () => {
    const [me, to] = ["Mitanni", "Egypt"] as const;
    const same = (what: string, forms: string[], host = false): void => {
      const reading = (t: string): string => readingOf(t, to, me, host ? "host" : "letter");
      for (const f of forms) expect(reading(f), `${what}: "${f}" against "${forms[0]}"`).toBe(reading(forms[0]));
    };
    const senders = ["Egypt", "Babylonia", "Mitanni", "Assyria", "Hatti", "Arzawa", "Alashiya", "Byblos"];
    const every = (f: (key: string) => string): string[] => senders.flatMap((p) => [0, 1, 2, 3, 4, 5].map((t) => f(`${t}|${p}|${to}`)));
    const parts: Omit<LetterParts, "key"> = { foe: "Hatti", city: "Aleppo", place: "Aleppo", from: "Aleppo", target: "Tunip", amount: 50, names: "Hatti" };
    for (const [kind, write] of Object.entries(Letter))
      for (const gift of [false, true])
        for (const threat of [false, true])
          for (const sally of [false, true])
            for (const unsworn of [false, true])
              for (const servant of [false, true]) same(`${kind} ${gift} ${threat} ${sally} ${unsworn} ${servant}`, every((key) => write({ key, ...parts, gift, threat, sally, unsworn, servant })));
    for (const [line, forms] of Object.entries(Audience)) same(line, [...forms], true);
    same("pleaHeard", every((key) => pleaHeard("Aleppo", "Hatti", key)), true);
    for (const p of senders) same(`closing ${p}`, [0, 1, 2, 3, 4, 5, 6, 7].map((t) => closing(p as Power, `${t}|${p}|${to}`)), true);
  });
});

