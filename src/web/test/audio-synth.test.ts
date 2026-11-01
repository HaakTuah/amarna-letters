import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { arrange, cueHolds, stretches } from "../src/audio/synth/arrange.ts";
import { HymnPlaceholder, ModeTest, line } from "../src/audio/synth/score.ts";
import { Tunings, homeMode, pitch, shift } from "../src/audio/tunings.ts";

// Item 19+++, the fallback: one score in degrees, played in any of the seven tunings by two arrangements.
describe("AudioSynthTests", () => {
  test("The seven tunings run from the brightest to the darkest, each a semitone lower in one degree", () => {
    Assert.equal(7, Tunings.length);
    for (let i = 1; i < Tunings.length; i++) {
      const a = Tunings[i - 1].steps.reduce((x, y) => x + y, 0);
      const b = Tunings[i].steps.reduce((x, y) => x + y, 0);
      Assert.equal(a - 1, b);
    }
    // Degree 0 on A, the octave, and nīd qablim's third (C).
    Assert.equal(57, pitch("nid_qablim", 57, 0));
    Assert.equal(69, pitch("nid_qablim", 57, 7));
    Assert.equal(60, pitch("nid_qablim", 57, 2));
    Assert.equal(61, pitch("isartum", 57, 2));
    Assert.equal(55, pitch("nid_qablim", 57, -1));
    // Darker and brighter, stopping at the ends.
    Assert.equal("nis_tuhrim", shift("nid_qablim", -1));
    Assert.equal("pitum", shift("nid_qablim", 1));
    Assert.equal("qablitum", shift("qablitum", -2));
    Assert.equal("kitmum", shift("kitmum", 1));
  });

  test("Each court has a home mode: Ugarit the hymn's own, Egypt's a reading", () => {
    Assert.equal("nid_qablim", homeMode("Ugarit"));
    Assert.equal("kitmum", homeMode("Egypt"));
    Assert.equal("nid_qablim", homeMode(null));
  });

  test("The notation reads degrees, rests, chords and drum strokes", () => {
    const n = line("0:1 r:1 0+2+4:2! D:0.5 T:0.5~");
    Assert.equal(4, n.length);
    Assert.equal(2, n[1].at);
    Assert.equal(3, n[1].degrees.length);
    Assert.equal(0, n[2].degrees[0]);
    Assert.equal(1, n[3].degrees[0]);
    Assert.true(n[3].vel < n[0].vel);
  });

  test("The 8-bit version spreads a held chord into an arpeggio and echoes the lead; the period version lets the lyre ring", () => {
    const calm = { mood: "calm" as const, shade: 0 as const };
    const chip = arrange(ModeTest, 0, 16, "nid_qablim", "chip", calm);
    const period = arrange(ModeTest, 0, 16, "nid_qablim", "period", calm);
    // A four-beat chord of three notes: sixteen sixteenths in 8-bit, three struck strings in the period version.
    Assert.equal(16, chip.filter((p) => p.voice === "square-thin" && p.at < 4 && p.beats < 0.3).length);
    Assert.equal(3, period.filter((p) => p.voice === "lyre" && p.at < 0.5 && p.beats > 4).length);
    Assert.true(chip.filter((p) => p.voice === "square").length > ModeTest.layers[0].notes.length);
    // The period version's looser timing: some notes off the grid, none in 8-bit.
    Assert.true(period.some((p) => p.voice === "reed" && Math.abs(p.at * 2 - Math.round(p.at * 2)) > 1e-6));
    Assert.false(chip.some((p) => p.voice === "triangle" && Math.abs(p.at - Math.round(p.at)) > 1e-6));
  });

  test("One score plays in any tuning: the same notes, other pitches", () => {
    const calm = { mood: "calm" as const, shade: 0 as const };
    const a = arrange(ModeTest, 0, 8, "nid_qablim", "chip", calm);
    const b = arrange(ModeTest, 0, 8, "kitmum", "chip", calm);
    Assert.equal(a.length, b.length);
    Assert.true(a.some((p, i) => p.midi !== b[i].midi));
  });

  test("A layer plays only when its cue holds; phrases cut the score into stretches", () => {
    Assert.true(cueHolds({ moods: ["war", "battle"] }, { mood: "war", shade: -1 }));
    Assert.false(cueHolds({ moods: ["war", "battle"] }, { mood: "calm", shade: 0 }));
    Assert.false(cueHolds({ shades: [1] }, { mood: "calm", shade: 0 }));
    const calm = arrange(HymnPlaceholder, 0, 18, "nid_qablim", "period", { mood: "calm", shade: 0 });
    const war = arrange(HymnPlaceholder, 0, 18, "nid_qablim", "period", { mood: "war", shade: -1 });
    Assert.true(war.filter((p) => p.voice === "drum-deep").length > calm.filter((p) => p.voice === "drum-deep").length);
    // The held chord is a calm or feast layer: gone in war.
    Assert.true(war.filter((p) => p.voice === "lyre").length < calm.filter((p) => p.voice === "lyre").length);
    Assert.equal(4, stretches(HymnPlaceholder).length);
    Assert.equal(54, stretches(HymnPlaceholder).at(-1)![1]);
  });
});
