/**
 * The fallback's sound engine (item 19+++): the browser's own oscillators and noise, no samples. Plays a score phrase by
 * phrase: at every phrase's end it asks what comes next (the piece, the tuning, the situation), so a change of piece or of
 * mode is heard only there; each pass through a score takes a variation other than the last.
 */
import { Variations, arrange, stretches, type Played, type Situation, type Version, type Voice } from "./arrange.ts";
import type { SynthScore } from "./score.ts";
import type { Tuning } from "../tunings.ts";

export interface NextStretch {
  score: SynthScore;
  mode: Tuning;
  situation: Situation;
}

const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
const Ahead = 0.35; // seconds scheduled ahead of the clock

export class SynthDeck {
  private out: GainNode;
  private room: ConvolverNode;
  private noise: AudioBuffer;
  private waves = new Map<string, PeriodicWave>();
  private timer: number | null = null;
  private score: SynthScore | null = null;
  private stretch = 0;
  /** Context time at which the current stretch began, and its tempo. */
  private startedAt = 0;
  private stretchEnd = 0;
  private queue: Played[] = [];
  private bpm = 90;
  private lastVariation = -1;
  private variation = 0;
  private seed = 1;
  private live = new Set<AudioScheduledSourceNode>();
  version: Version = "chip";

  private ctx: AudioContext;
  /** Asked at each phrase's end what to play next; null stops. */
  private next: () => NextStretch | null;

  constructor(ctx: AudioContext, dest: AudioNode, next: () => NextStretch | null) {
    this.ctx = ctx;
    this.next = next;
    this.out = ctx.createGain();
    this.out.gain.value = 0.5;
    this.out.connect(dest);
    // A small room for the period version (the chip version is dry, as the machines were).
    this.room = ctx.createConvolver();
    const n = Math.floor(ctx.sampleRate * 1.6);
    const ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-4.5 * i) / n) * 0.5;
    }
    this.room.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.room.connect(wet);
    wet.connect(this.out);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    this.score = null;
    this.stretchEnd = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.pump(), 100);
    this.pump();
  }

  stop(fade = 0.4): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.queue = [];
    const t = this.ctx.currentTime;
    for (const s of this.live) {
      try {
        s.stop(t + fade);
      } catch {
        // already stopped
      }
    }
    this.live.clear();
  }

  /** Schedules what falls within the next stretch of the clock, opening the next phrase when the last one ends. */
  private pump(): void {
    const now = this.ctx.currentTime;
    while (this.queue.length === 0 && this.stretchEnd < now + Ahead) {
      if (!this.open()) return;
    }
    const spb = 60 / this.bpm;
    while (this.queue.length > 0) {
      const p = this.queue[0];
      const t = this.startedAt + p.at * spb;
      if (t > now + Ahead) break;
      this.queue.shift();
      if (t >= now - 0.05) this.voice(p, Math.max(t, now), p.beats * spb);
      if (this.queue.length === 0 && this.stretchEnd < now + Ahead) {
        if (!this.open()) return;
      }
    }
  }

  /** Opens the next phrase: asks what to play and arranges it. */
  private open(): boolean {
    const n = this.next();
    if (n === null) {
      this.stop();
      return false;
    }
    if (this.score === null || n.score.id !== this.score.id || this.stretch >= stretches(this.score).length) {
      // A new pass: a new piece, or the same piece again in another variation.
      this.score = n.score;
      this.stretch = 0;
      this.variation = (this.lastVariation + 1 + Math.floor(Math.random() * (Variations - 1))) % Variations;
      this.lastVariation = this.variation;
      this.seed++;
    }
    const [a, b] = stretches(this.score)[this.stretch];
    this.bpm = this.score.bpm;
    this.startedAt = this.stretchEnd;
    this.stretchEnd = this.startedAt + ((b - a) * 60) / this.bpm;
    this.queue = arrange(this.score, a, b, n.mode, this.version, n.situation, this.variation, this.seed);
    this.stretch++;
    return true;
  }

  private wave(name: string, make: () => PeriodicWave): PeriodicWave {
    let w = this.waves.get(name);
    if (w === undefined) {
      w = make();
      this.waves.set(name, w);
    }
    return w;
  }

  /** A pulse wave of a given duty cycle, from its Fourier series. */
  private pulse(duty: number): PeriodicWave {
    return this.wave(`pulse${duty}`, () => {
      const n = 32;
      const re = new Float32Array(n);
      const im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      return this.ctx.createPeriodicWave(re, im);
    });
  }

  /** The lyre's string: a bright pluck whose overtones die first. */
  private lyreWave(): PeriodicWave {
    return this.wave("lyre", () => {
      const n = 16;
      const re = new Float32Array(n);
      const im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = Math.sin((k * Math.PI) / 7) / k ** 1.2;
      return this.ctx.createPeriodicWave(re, im);
    });
  }

  private track<T extends AudioScheduledSourceNode>(s: T, stopAt: number): T {
    this.live.add(s);
    s.onended = () => this.live.delete(s);
    s.stop(stopAt);
    return s;
  }

  private voice(p: Played, t: number, dur: number): void {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const wet = this.version === "period";
    g.connect(this.out);
    if (wet) g.connect(this.room);
    const v = p.vel;
    const env = (attack: number, peak: number, release: number, hold: number): void => {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      g.gain.setValueAtTime(peak, t + Math.max(attack, hold));
      g.gain.exponentialRampToValueAtTime(0.0005, t + Math.max(attack, hold) + release);
    };
    const osc = (type: OscillatorType | PeriodicWave, f: number, end: number): OscillatorNode => {
      const o = ctx.createOscillator();
      if (typeof type === "string") o.type = type as OscillatorType;
      else o.setPeriodicWave(type);
      o.frequency.setValueAtTime(f, t);
      o.start(t);
      return this.track(o, end);
    };
    const noise = (end: number): AudioBufferSourceNode => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      s.start(t, Math.random() * 0.5);
      return this.track(s, end);
    };
    const filter = (type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.setValueAtTime(f, t);
      b.Q.value = q;
      b.connect(g);
      return b;
    };
    const kind: Voice = p.voice;
    switch (kind) {
      case "square":
      case "square-thin": {
        env(0.005, 0.16 * v, 0.06, dur);
        osc(this.pulse(kind === "square" ? 0.5 : 0.25), hz(p.midi), t + dur + 0.1).connect(g);
        return;
      }
      case "triangle":
        env(0.005, 0.32 * v, 0.05, dur);
        osc("triangle", hz(p.midi), t + dur + 0.1).connect(g);
        return;
      case "noise-deep":
      case "noise-rim":
      case "noise-jingle": {
        const f = kind === "noise-deep" ? filter("lowpass", 900) : kind === "noise-rim" ? filter("bandpass", 3000, 1.2) : filter("highpass", 7000);
        env(0.001, (kind === "noise-deep" ? 0.5 : 0.25) * v, kind === "noise-jingle" ? 0.12 : 0.07, 0.01);
        noise(t + 0.3).connect(f);
        return;
      }
      case "reed": {
        // A double reed: a bright buzz through a nasal formant, a breath of vibrato after the onset.
        env(0.05, 0.11 * v, 0.18, dur);
        const f = filter("bandpass", 1300, 1.4);
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 3200;
        lp.connect(f);
        const o = osc("sawtooth", hz(p.midi), t + dur + 0.3);
        // A slight scoop into the note.
        o.frequency.setValueAtTime(hz(p.midi - 0.3), t);
        o.frequency.linearRampToValueAtTime(hz(p.midi), t + 0.06);
        const lfo = osc("sine", 5.2, t + dur + 0.3);
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(hz(p.midi) * 0.004, t + 0.4);
        lfo.connect(depth);
        depth.connect(o.frequency);
        o.connect(lp);
        return;
      }
      case "lyre": {
        // Plucked and let ring: a quick attack, a long fall, the overtones dying first.
        const ring = Math.min(3.5, 1.2 + dur);
        env(0.003, 0.2 * v, ring, 0.005);
        const lp = filter("lowpass", 5000);
        lp.frequency.exponentialRampToValueAtTime(900, t + ring * 0.6);
        osc(this.lyreWave(), hz(p.midi), t + ring + 0.1).connect(lp);
        return;
      }
      case "drum-deep":
      case "drum-rim": {
        // The frame drum: a falling skin tone and its slap.
        const deep = kind === "drum-deep";
        env(0.002, (deep ? 0.6 : 0.3) * v, deep ? 0.35 : 0.12, 0.005);
        const o = osc("sine", deep ? 120 : 330, t + 0.6);
        o.frequency.exponentialRampToValueAtTime(deep ? 62 : 220, t + 0.15);
        o.connect(g);
        noise(t + 0.08).connect(filter(deep ? "lowpass" : "bandpass", deep ? 800 : 2400, 1));
        return;
      }
      case "sistrum": {
        // The sistrum: the metal discs' jingle, three quick shakes that die away.
        const f = filter("highpass", 5500);
        g.gain.setValueAtTime(0, t);
        for (let k = 0; k < 3; k++) {
          const at = t + k * 0.07;
          g.gain.linearRampToValueAtTime(0.18 * v * (1 - 0.25 * k), at + 0.004);
          g.gain.exponentialRampToValueAtTime(0.002, at + 0.06);
        }
        noise(t + 0.4).connect(f);
        return;
      }
    }
  }
}
