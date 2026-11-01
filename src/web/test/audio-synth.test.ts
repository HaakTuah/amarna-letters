import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { arrange, cueHolds, stretches } from "../src/audio/synth/arrange.ts";
import { CourtScores, Fall, HurrianHymn, Lament, LastSeasons, ModeTest, SharedScores, Triumph, line, scoresFor, synthPiece } from "../src/audio/synth/score.ts";
import { Tunings, homeMode, pitch, shift } from "../src/audio/tunings.ts";

const every = [...Object.values(CourtScores).flatMap((c) => [c.theme, c.march]), ...Object.values(SharedScores), ModeTest];

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
    const calm = arrange(HurrianHymn, 0, 18, "nid_qablim", "period", { mood: "calm", shade: 0 });
    const war = arrange(HurrianHymn, 0, 18, "nid_qablim", "period", { mood: "war", shade: -1 });
    Assert.true(war.filter((p) => p.voice === "drum-deep").length > calm.filter((p) => p.voice === "drum-deep").length);
    // The lyre's chord is a layer of peace and feasts: gone in war.
    Assert.true(war.filter((p) => p.voice === "lyre").length < calm.filter((p) => p.voice === "lyre").length);
    Assert.equal(5, stretches(HurrianHymn).length);
    Assert.equal(61, stretches(HurrianHymn).at(-1)![1]);
  });

  test("Ugarit's theme is the Hurrian Hymn whole, from a named reading, and the pieces are no placeholders", () => {
    Assert.false(HurrianHymn.placeholder);
    Assert.true(HurrianHymn.source.includes("Kilmer"));
    // Four lines of 18, 9, 16 and 18 beats; the sung line opens A E A C E (degrees 0, -3, 0, 2, -3 from string 5).
    const sung = HurrianHymn.layers.find((l) => l.name === "the hymn")!.notes;
    Assert.equal([0, -3, 0, 2, -3].join(), sung.slice(0, 5).map((n) => n.degrees[0]).join());
    Assert.equal(61, sung.at(-1)!.at + sung.at(-1)!.beats);
    for (const sc of every) if (sc !== ModeTest) Assert.false(sc.placeholder, sc.id);
  });

  test("Every score is well formed: phrases rise to its length, and no note outlasts it", () => {
    for (const sc of every) {
      const end = sc.phrases.at(-1)!;
      for (let i = 1; i < sc.phrases.length; i++) Assert.true(sc.phrases[i] > sc.phrases[i - 1], sc.id);
      for (const layer of sc.layers) {
        Assert.true(layer.notes.length > 0, `${sc.id}: ${layer.name}`);
        for (const n of layer.notes) Assert.true(n.at >= 0 && n.at + n.beats <= end + 1e-6, `${sc.id}: ${layer.name} at ${n.at}`);
      }
      // A melody throughout: its last note reaches the end.
      const melody = sc.layers.find((l) => l.role === "melody")!.notes;
      Assert.true(Math.abs(end - (melody.at(-1)!.at + melody.at(-1)!.beats)) < 1e-6, sc.id);
    }
  });

  test("Each court hears its own theme and march, the moments are shared, and a court without music hears Ugarit's", () => {
    Assert.equal(CourtScores.Egypt.theme, synthPiece("kings", "Egypt"));
    Assert.equal(CourtScores.Egypt.theme, synthPiece("envoys", "Egypt"));
    Assert.equal(CourtScores.Hatti.march, synthPiece("battle", "Hatti"));
    Assert.equal(CourtScores.Hatti.march, synthPiece("siege", "Hatti"));
    Assert.equal(Lament, synthPiece("solemn", "Egypt"));
    Assert.equal(Lament, synthPiece("fallen", "Hatti"));
    Assert.equal(Triumph, synthPiece("triumph", "Mitanni"));
    Assert.equal(Fall, synthPiece("fall", "Assyria"));
    Assert.equal(LastSeasons, synthPiece("last", "Arzawa"));
    Assert.equal(CourtScores.Alashiya.march, synthPiece("chariots", "Alashiya"));
    Assert.equal(8, Object.keys(CourtScores).length);
    Assert.equal(HurrianHymn, synthPiece("hymn", "Egypt"));
    Assert.equal(HurrianHymn, synthPiece("kings", "Ugarit"));
    Assert.equal(HurrianHymn, synthPiece("kings", null));
    Assert.equal(HurrianHymn, synthPiece("kings", "Kaska"));
    Assert.equal(CourtScores.Ugarit.march, synthPiece("chariots", null));
    // The listening page: the hymn, the court's own, then the shared moments.
    Assert.equal(7, scoresFor("Egypt").length);
    Assert.equal(6, scoresFor("Ugarit").length);
    Assert.equal(HurrianHymn, scoresFor("Babylonia")[0]);
  });

  test("The mood changes the layers within a court's score: the heartbeat in unease, the march in war, the gallop in battle", () => {
    const sc = CourtScores.Babylonia.theme;
    const drums = (mood: "calm" | "tension" | "war" | "battle" | "siege"): number =>
      arrange(sc, 0, 8, "isartum", "chip", { mood, shade: mood === "battle" ? -2 : mood === "war" ? -1 : 0 }).filter((p) => p.voice.startsWith("noise-")).length;
    Assert.true(drums("tension") > 0);
    Assert.true(drums("battle") > drums("war"));
    Assert.true(drums("war") > drums("calm"));
    // The sistrum only at a feast.
    const feast = arrange(sc, 0, 8, "isartum", "period", { mood: "calm", shade: 1 });
    const plain = arrange(sc, 0, 8, "isartum", "period", { mood: "calm", shade: 0 });
    Assert.true(feast.some((p) => p.voice === "sistrum"));
    Assert.false(plain.some((p) => p.voice === "sistrum"));
    // Hatti's chords never hold the tonic's fifth, since in its darkest mode, qablītum, that fifth is diminished.
    for (const sc2 of [CourtScores.Hatti.theme, CourtScores.Hatti.march]) {
      const chord = sc2.layers.find((l) => l.role === "chord")!;
      for (const n of chord.notes) Assert.false(n.degrees.some((d) => ((d % 7) + 7) % 7 === 0 && n.degrees.includes(d + 4)), `${sc2.id} ${n.at}`);
    }
  });
});
