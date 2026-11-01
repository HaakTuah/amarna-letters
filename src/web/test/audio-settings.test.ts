import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { DefaultAudio, StartFade, startLevel } from "../src/audio/settings.ts";

// Item 19+++, Haakon's answer (1 November 2026): music and sound on by default at a regular volume, the first music
// fading in so it never blasts at start-up.
describe("AudioSettingsTests", () => {
  test("Music and sound are on by default at a regular volume", () => {
    Assert.true(DefaultAudio.music);
    Assert.true(DefaultAudio.sound);
    Assert.true(DefaultAudio.musicVolume >= 0.6 && DefaultAudio.musicVolume < 1);
    Assert.true(DefaultAudio.soundVolume >= 0.6 && DefaultAudio.soundVolume < 1);
  });

  test("The first music rises from silence over the opening seconds, never at full at once", () => {
    Assert.true(StartFade >= 3);
    Assert.equal(0, startLevel(0, 0.7));
    Assert.true(startLevel(1, 0.7) < 0.7 / 2);
    Assert.equal(0.7, startLevel(StartFade, 0.7), 1e-9);
    Assert.equal(0.7, startLevel(StartFade + 10, 0.7), 1e-9);
  });
});
