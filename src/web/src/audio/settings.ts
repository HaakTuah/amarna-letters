/** The music and sound switches (item 19+++): kept in this browser between visits; on by default at a regular volume. */
import { useSyncExternalStore } from "react";

export interface AudioSettings {
  music: boolean;
  sound: boolean;
  /** 0 to 1. */
  musicVolume: number;
  soundVolume: number;
  /** Which version of the music plays: the Empire Earth-style pieces, or the fallback in 8-bit or in period timbres. */
  style: MusicStyle;
}

export type MusicStyle = "orchestra" | "chip" | "period";
const Styles: readonly MusicStyle[] = ["orchestra", "chip", "period"];

const Key = "amarna-audio";

/**
 * On by default at a regular volume (Haakon, 1 November 2026: "Keep them on, regular volume, but don't blast someone when
 * they start up"): the first music fades in over the opening seconds (player.ts), and nothing sounds before the reader's
 * first touch (the browser's own rule).
 */
export const DefaultAudio: AudioSettings = { music: true, sound: true, musicVolume: 0.7, soundVolume: 0.7, style: "orchestra" };

function read(): AudioSettings {
  try {
    const raw = localStorage.getItem(Key);
    if (raw === null) return DefaultAudio;
    const v = JSON.parse(raw) as Partial<AudioSettings>;
    const vol = (x: unknown, d: number): number => (typeof x === "number" && x >= 0 && x <= 1 ? x : d);
    return {
      music: typeof v.music === "boolean" ? v.music : DefaultAudio.music,
      sound: typeof v.sound === "boolean" ? v.sound : DefaultAudio.sound,
      musicVolume: vol(v.musicVolume, DefaultAudio.musicVolume),
      soundVolume: vol(v.soundVolume, DefaultAudio.soundVolume),
      style: Styles.includes(v.style as MusicStyle) ? (v.style as MusicStyle) : DefaultAudio.style,
    };
  } catch {
    return DefaultAudio;
  }
}

let current = read();
const listeners = new Set<() => void>();

export const audioSettings = (): AudioSettings => current;

export function setAudioSettings(change: Partial<AudioSettings>): void {
  current = { ...current, ...change };
  try {
    localStorage.setItem(Key, JSON.stringify(current));
  } catch {
    // private window or blocked storage: the switches last this page only
  }
  listeners.forEach((f) => f());
}

export function onAudioSettings(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(onAudioSettings, audioSettings);
}
