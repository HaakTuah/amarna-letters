/**
 * The listening page (item 19+++): every piece and variation, every sound, sting and bed, with the template beside each
 * piece and when the game plays it, so the music can be judged by ear.
 */
import { useEffect, useState } from "react";
import { AudioSwitches } from "../audio/AudioSwitches.tsx";
import { BedInfo, Pieces, Placeholder, SoundInfo, StingInfo } from "../audio/catalogue.ts";
import { Manifest } from "../audio/manifest.ts";
import { player } from "../audio/player.ts";

type Files = Record<string, readonly { file: string; seconds: number }[]>;
const man = Manifest as unknown as { music: Files; sounds?: Files; stings?: Files; beds?: Files };

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function Listen() {
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => {
    player.setMood("menu");
    return () => player.release();
  }, []);
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
