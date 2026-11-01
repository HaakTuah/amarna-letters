import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { DefaultAudio, StartFade, scheduleStartFade } from "../src/audio/settings.ts";

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
    // The opening fade as the player schedules it on its own gain stage, recorded by a stand-in for the browser's AudioParam.
    const calls: string[] = [];
    let value = 1;
    const ramps: [number, number][] = [];
    scheduleStartFade(
      {
        cancelScheduledValues: (t) => calls.push(`cancel@${t}`),
        setValueAtTime: (v, t) => {
          calls.push(`set ${v}@${t}`);
          value = v;
        },
        linearRampToValueAtTime: (v, t) => {
          calls.push(`ramp ${v}@${t}`);
          ramps.push([v, t]);
        },
      },
      10,
    );
    Assert.true(StartFade >= 3);
    Assert.equal(0, value);
    Assert.equal("cancel@10", calls[0]);
    Assert.equal(1, ramps.length);
    Assert.equal(1, ramps[0][0]);
    Assert.equal(10 + StartFade, ramps[0][1]);
  });
});
