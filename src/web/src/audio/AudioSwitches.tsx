/** The music and sound switches, with their volumes (item 19+++); remembered in this browser. */
import { setAudioSettings, useAudioSettings, type MusicStyle } from "./settings.ts";

export function AudioSwitches() {
  const a = useAudioSettings();
  return (
    <>
      <label>
        <input type="checkbox" checked={a.music} onChange={(e) => setAudioSettings({ music: e.target.checked })} /> Music
      </label>
      {a.music && (
        <label className="volume">
          <span className="sr">Music volume</span>
          <input type="range" min="0" max="1" step="0.05" value={a.musicVolume} aria-label="Music volume"
            onChange={(e) => setAudioSettings({ musicVolume: Number(e.target.value) })} />
        </label>
      )}
      {a.music && (
        <label>
          <span className="sr">Music version</span>
          <select value={a.style} aria-label="Music version" onChange={(e) => setAudioSettings({ style: e.target.value as MusicStyle })}>
            <option value="orchestra">Orchestra</option>
            <option value="period">Lyre and reed</option>
            <option value="chip">8-bit</option>
          </select>
        </label>
      )}
      <label>
        <input type="checkbox" checked={a.sound} onChange={(e) => setAudioSettings({ sound: e.target.checked })} /> Sound
      </label>
      {a.sound && (
        <label className="volume">
          <span className="sr">Sound volume</span>
          <input type="range" min="0" max="1" step="0.05" value={a.soundVolume} aria-label="Sound volume"
            onChange={(e) => setAudioSettings({ soundVolume: Number(e.target.value) })} />
        </label>
      )}
    </>
  );
}
