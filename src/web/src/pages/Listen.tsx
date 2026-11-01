/**
 * The listening page (item 19+++): every piece and variation, every sound, sting and bed, with the template beside each
 * piece and when the game plays it, so the music can be judged by ear.
 */
import { useEffect, useState } from "react";
import { AudioSwitches } from "../audio/AudioSwitches.tsx";
import { BedInfo, Pieces, Placeholder, SoundInfo, StingInfo } from "../audio/catalogue.ts";
import { Manifest } from "../audio/manifest.ts";
import { player } from "../audio/player.ts";
import type { Mood } from "../audio/situation.ts";
import type { Version } from "../audio/synth/arrange.ts";
import { ModeTest, scoresFor, type Shade, type SynthScore } from "../audio/synth/score.ts";
import { Tunings, homeMode, tuning, type Tuning } from "../audio/tunings.ts";

const Courts = ["Ugarit", "Egypt", "Hatti", "Babylonia", "Mitanni", "Assyria", "Arzawa", "Alashiya"] as const;
const Moods: readonly [Mood, string][] = [["calm", "calm"], ["tension", "tension"], ["war", "war"], ["battle", "battle"], ["siege", "siege"], ["menu", "the menu"], ["last", "the last seasons"]];
const Shades: readonly [Shade, string][] = [[1, "brighter (a feast)"], [0, "its own"], [-1, "darker (war)"], [-2, "darkest (battle, mourning)"]];

type Files = Record<string, readonly { file: string; seconds: number }[]>;
const man = Manifest as unknown as { music: Files; sounds?: Files; stings?: Files; beds?: Files };

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function Listen() {
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => {
    player.setMood("menu");
    return () => player.release();
  }, []);
  const [court, setCourt] = useState<string>("Ugarit");
  const [mode, setMode] = useState<Tuning | "home">("home");
  const [shade, setShade] = useState<Shade>(0);
  const [mood, setMood] = useState<Mood>("calm");
  const synth = (score: SynthScore, version: Version): void => {
    const key = `${score.id}:${version}`;
    if (playing === key) {
      player.release();
      setPlaying(null);
      return;
    }
    setPlaying(key);
    player.release();
    player.setShade(shade, court as never);
    player.listenSynth(score, version, mode === "home" ? null : mode, shade, () => setPlaying((p) => (p === key ? null : p)), mood);
  };
  const play = (file: string): void => {
    if (playing === file) {
      player.release();
      setPlaying(null);
      return;
    }
    setPlaying(file);
    player.listen(file, () => setPlaying(null));
  };
  return (
    <div className="page listen">
      <h1>The music</h1>
      <p>
        Fourteen pieces, one for each of Empire Earth's (its eighteen files are fourteen pieces, four in two versions), each
        taking that piece's role and mood and nothing of its own: the melodies are the Hurrian Hymn of Ugarit's and new themes
        in the Babylonian tunings. Each has three variations; the game picks the piece by the situation, changes at the end of
        a phrase, and never plays the same variation twice running. Rendered from free (CC0) orchestral samples.
      </p>
      {Placeholder && (
        <p className="notice">
          These pieces are placeholders: working pieces that exercise the dynamic music (each piece's role, length, phrase ends and
          variations). The composing itself is still to come, and each will be replaced.
        </p>
      )}
      <div className="listen-switches">
        <AudioSwitches />
      </div>
      <table className="listen-table">
        <thead>
          <tr>
            <th>Piece</th>
            <th>After Empire Earth's</th>
            <th>When it plays</th>
            <th>Listen</th>
          </tr>
        </thead>
        <tbody>
          {Pieces.map((p) => (
            <tr key={p.id}>
              <td>
                <strong>{p.title}</strong>
                <div className="note">{p.made}</div>
              </td>
              <td>
                {p.template}
                <div className="note">{p.role}</div>
              </td>
              <td>{p.when}</td>
              <td className="listen-buttons">
                {(man.music[p.id] ?? []).map((v, i) => (
                  <button key={v.file} className={playing === v.file ? "small primary" : "small"} onClick={() => play(v.file)}>
                    {playing === v.file ? "■" : "▶"} {i + 1} · {mmss(v.seconds)}
                  </button>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Side by side: the three versions</h2>
      <p>
        The same music in the three versions to choose between: the orchestra (the pieces above), and the fallback after the
        original Civilization, one score in the Babylonian lyre tunings played by the browser's own sound engine, in pure
        8-bit or in period timbres (a synthesised lyre, reed pipe, frame drum and sistrum). Ugarit's theme is the Hurrian
        Hymn; every other court has a theme and a march of its own, heard in its home mode, and the great moments are shared.
        Choose the court, and hear each score as the game would play it in that situation: the layers come and go with the
        mood (the drums of war, the heartbeat of unease, the sistrum at a feast) and the tuning turns with the shade.
      </p>
      <div className="listen-switches">
        <label>
          Mood{" "}
          <select value={mood} onChange={(e) => setMood(e.target.value as Mood)}>
            {Moods.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Court{" "}
          <select value={court} onChange={(e) => setCourt(e.target.value)}>
            {Courts.map((c) => (
              <option key={c} value={c}>
                {c} ({tuning(homeMode(c)).name})
              </option>
            ))}
          </select>
        </label>
        <label>
          Tuning{" "}
          <select value={mode} onChange={(e) => setMode(e.target.value as Tuning | "home")}>
            <option value="home">The court's home mode</option>
            {Tunings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.mode})
              </option>
            ))}
          </select>
        </label>
        <label>
          Shade{" "}
          <select value={shade} onChange={(e) => setShade(Number(e.target.value) as Shade)}>
            {Shades.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <table className="listen-table">
        <thead>
          <tr>
            <th>Score</th>
            <th>Orchestra</th>
            <th>8-bit</th>
            <th>Lyre and reed</th>
          </tr>
        </thead>
        <tbody>
          {[...scoresFor(court), ModeTest].map((sc) => (
            <tr key={sc.id}>
              <td>
                <strong>{sc.title}</strong>
                <div className="note">{sc.source}</div>
              </td>
              <td className="listen-buttons">
                {(sc.orchestra ?? []).map((id) =>
                  (man.music[id] ?? []).slice(0, 1).map((v) => (
                    <button key={v.file} className={playing === v.file ? "small primary" : "small"} onClick={() => play(v.file)}>
                      {playing === v.file ? "■" : "▶"} {Pieces.find((p) => p.id === id)?.title ?? id}
                    </button>
                  )),
                )}
              </td>
              {(["chip", "period"] as const).map((ver) => (
                <td key={ver} className="listen-buttons">
                  <button className={playing === `${sc.id}:${ver}` ? "small primary" : "small"} onClick={() => synth(sc, ver)}>
                    {playing === `${sc.id}:${ver}` ? "■" : "▶"} {ver === "chip" ? "8-bit" : "Lyre and reed"}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        The tunings, brightest to darkest: {Tunings.map((t) => `${t.name} (${t.mode})`).join(", ")}; read from the tablets of
        Nippur (CBS 10996) and Ur (UET VII 126) after Kilmer and Crocker. In the game the court's home mode is heard, a step or
        two darker in war, a battle, a siege or mourning, a step brighter at a feast; a change waits for a phrase's end.
      </p>

      <h2>Stings</h2>
      <ul className="listen-list">
        {Object.entries(StingInfo).map(([k, text]) => (
          <li key={k}>
            {(man.stings?.[k] ?? []).map((f) => (
              <button key={f.file} className="small" onClick={() => player.listenBuffer(f.file, "music")}>
                ▶
              </button>
            ))}{" "}
            {text}
          </li>
        ))}
      </ul>

      <h2>Sounds</h2>
      <p className="note">Each in three slight variations; the game varies its pitch and level a little more each time.</p>
      <ul className="listen-list">
        {Object.entries(SoundInfo).map(([k, text]) => (
          <li key={k}>
            {(man.sounds?.[k] ?? []).map((f, i) => (
              <button key={f.file} className="small" onClick={() => player.listenBuffer(f.file, "sound")}>
                ▶ {i + 1}
              </button>
            ))}{" "}
            {text}
          </li>
        ))}
      </ul>

      <h2>The world's beds</h2>
      <p className="note">Under the music, very quiet, following what the map shows; twelve seconds of each here.</p>
      <ul className="listen-list">
        {Object.entries(BedInfo).map(([k, text]) => (
          <li key={k}>
            {(man.beds?.[k] ?? []).map((f) => (
              <button key={f.file} className="small" onClick={() => player.listenBuffer(f.file, "bed")}>
                ▶
              </button>
            ))}{" "}
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
