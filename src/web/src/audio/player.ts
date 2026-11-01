/**
 * The music and the sounds as they play (item 19+++). The music is dynamic in Empire Earth's way: the situation picks a
 * mood, the mood its pieces; a change waits for the end of the phrase playing, then the pieces cross; each piece plays
 * one of its variations, never the same one twice running; a great moment brings a sting, then its piece, then the
 * mood's music again. Music streams from compressed files, loaded only when played; sounds and the world's beds are
 * small files fetched on first use. Nothing loads or sounds until the reader first touches the page, and nothing here
 * touches the game.
 */
import type { Power } from "@amarna/engine";
import { Manifest } from "./manifest.ts";
import { SynthDeck, type NextStretch } from "./synth/engine.ts";
import type { Version } from "./synth/arrange.ts";
import { synthPiece, type Shade, type SynthScore } from "./synth/score.ts";
import { homeMode, shift, type Tuning } from "./tunings.ts";
import { StartFade, audioSettings, onAudioSettings, scheduleStartFade, type MusicStyle } from "./settings.ts";
import { Attack, Level, Mixer, type Layer } from "./mix.ts";
import { MomentPieces, MoodPieces, type Bed, type Hearing, type Moment, type Mood, type SoundName, type Sting } from "./situation.ts";

interface Variation {
  readonly file: string;
  readonly seconds: number;
  readonly phrases: readonly number[];
  /** A variation in a darker (negative) or brighter (positive) tuning than the piece's own; absent, its own. */
  readonly shade?: number;
}

const music = Manifest.music as unknown as Record<string, readonly Variation[]>;
const sounds = (Manifest as unknown as { sounds: Record<string, readonly { file: string; seconds: number }[]> }).sounds ?? {};
const stings = (Manifest as unknown as { stings: Record<string, readonly { file: string; seconds: number }[]> }).stings ?? {};
const beds = (Manifest as unknown as { beds: Record<string, readonly { file: string; seconds: number }[]> }).beds ?? {};

/** Every file of the manifest by its name, with its content's hash: asked for with it, so a re-rendered file is fetched anew. */
const hashes = new Map<string, string>();
for (const group of Object.values(Manifest as unknown as Record<string, Record<string, readonly { file: string; hash?: string }[]>>))
  for (const list of Object.values(group)) for (const f of list) if (f.hash !== undefined) hashes.set(f.file, f.hash);

const url = (file: string): string => new URL(`audio/${file}${hashes.has(file) ? `?v=${hashes.get(file)}` : ""}`, document.baseURI).href;

const Cross = 3.0; // seconds a change of piece takes
const Lead = 0.4; // seconds before a phrase ends that the change starts
const MaxWait = 20; // seconds the music waits for a phrase to end before it crosses anyway
const LoadWait = 12000; // ms an orchestra file may take to start before Lyre and reed plays instead
const Return = 3; // seconds the game's music takes to come back after the Music page

interface Deck {
  el: HTMLAudioElement;
  gain: GainNode;
  piece: string | null;
  file: string | null;
  phrases: readonly number[];
  /** The pending pause of a deck crossed away from, cancelled when the deck is used again. */
  pauseTimer: number | null;
}

class Player {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private soundBus: GainNode | null = null;
  /** The world's sounds placed on the map, under the event sounds. */
  private worldBus: GainNode | null = null;
  private mixer = new Mixer();
  /** How loud the bed is at the view's zoom (0 zoomed out, 1 close in). */
  private bedGain = 0;
  private bedBus: GainNode | null = null;
  private decks: Deck[] = [];
  private live = 0;
  private mood: Mood = "menu";
  private moment: Moment | null = null;
  private playingMoment = false;
  /** A change asked for, waiting for its phrase end (seconds into the live deck). */
  private switchAt: number | null = null;
  /** The latest page time the change waits to (a stalled stream still changes). */
  private askedAt: number | null = null;
  private retried = 0;
  private restUntil = 0;
  private lastFile = new Map<string, string>();
  private lastAny: string | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private bed: Bed = null;
  private bedSource: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private timer: number | null = null;
  private stingUntil = 0;
  private lastSting = -1e9;
  /** The listening page plays one file at a time and the director stands aside. */
  private solo = false;
  /**
   * The opening fade: a stage of its own between the music and the speakers, silent until the first music of the visit is
   * actually heard, then rising to whole over `StartFade` (Haakon: "don't blast someone when they start up"). Kept apart
   * from the switches' volume so neither undoes the other.
   */
  private opening: GainNode | null = null;
  private opened = false;
  /** How the situation colours the music (darker as it worsens, brighter at a feast), and whose court is heard. */
  private shade: Shade = 0;
  private court: Power | null = null;
  /** The fallback's engine, when its versions play; and the listening page's own. */
  private synth: SynthDeck | null = null;
  private soloSynth: SynthDeck | null = null;
  /** The Music page is open: the game's own music is faded out and stays out, so only what is pressed plays. */
  private hushed = false;
  /**
   * The orchestra's files could not load (offline, a failed or stalled stream): Lyre and reed, which needs no download,
   * plays instead of silence until the browser is back online or the version is chosen again.
   */
  private orchestraDown = false;
  /** When the live deck was asked to play and has not yet been heard (page time), for the stall watch. */
  private askedPlay: number | null = null;
  /** Leaving the Music page: the next music heard fades in from silence. */
  private returning = false;

  constructor() {
    if (typeof document === "undefined") return;
    // The events that count as a user's gesture everywhere (a touch's pointerdown does not): every one of them starts or
    // resumes the audio until the music is actually playing, so a play refused once is tried again on the next touch.
    const gestures = ["pointerup", "touchend", "click", "keydown"];
    const unlock = (): void => {
      this.start();
      const d = this.decks[this.live];
      const playing = d !== undefined && d.file !== null && !d.el.paused;
      if (this.ctx !== null && this.ctx.state === "running" && (playing || !audioSettings().music)) {
        for (const ev of gestures) removeEventListener(ev, unlock, true);
      }
    };
    for (const ev of gestures) addEventListener(ev, unlock, true);
    let chosen = audioSettings().style;
    onAudioSettings(() => {
      // Choosing a version again tries the orchestra afresh.
      if (audioSettings().style !== chosen) this.orchestraDown = false;
      chosen = audioSettings().style;
      this.apply();
    });
    document.addEventListener("visibilitychange", () => this.visibility());
    addEventListener("online", () => {
      if (!this.orchestraDown) return;
      this.orchestraDown = false;
      this.apply();
    });
  }

  /** Creates the audio graph on the reader's first touch, as browsers require. */
  private start(): void {
    if (this.ctx !== null) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      if (!this.solo && !this.hushed && !document.hidden) this.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx === undefined) return;
    this.ctx = new Ctx();
    this.musicBus = this.ctx.createGain();
    this.soundBus = this.ctx.createGain();
    this.worldBus = this.ctx.createGain();
    this.bedBus = this.ctx.createGain();
    this.opening = this.ctx.createGain();
    this.opening.gain.value = 0;
    this.opening.connect(this.ctx.destination);
    this.musicBus.connect(this.opening);
    for (const b of [this.soundBus, this.worldBus, this.bedBus]) b.connect(this.ctx.destination);
    for (let i = 0; i < 2; i++) {
      const el = new Audio();
      el.preload = "none";
      el.crossOrigin = "anonymous";
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      this.ctx.createMediaElementSource(el).connect(gain);
      gain.connect(this.musicBus);
      el.addEventListener("ended", () => this.ended(i));
      // The first moment music is really heard (its stream playing, not merely asked for) starts the opening fade.
      el.addEventListener("playing", () => {
        if (i === this.live) this.askedPlay = null;
        this.open(false);
        this.comeBack();
      });
      // A file that cannot load: the game's music turns to Lyre and reed rather than fall silent.
      el.addEventListener("error", () => {
        if (!this.solo && i === this.live && this.decks[i].file !== null) this.fallBack();
      });
      this.decks.push({ el, gain, piece: null, file: null, phrases: [], pauseTimer: null });
    }
    this.apply();
    this.timer = window.setInterval(() => this.tick(), 250);
  }

  private apply(): void {
    if (this.ctx === null) return;
    const s = audioSettings();
    const t = this.ctx.currentTime;
    // The listening page's piece is heard whatever the switches say.
    if (!this.solo) this.musicBus!.gain.setTargetAtTime(s.music ? Level.music * s.musicVolume : 0, t, 0.3);
    this.soundBus!.gain.setTargetAtTime(s.sound ? Level.event * s.soundVolume : 0, t, 0.1);
    this.worldBus!.gain.setTargetAtTime(s.sound ? Level.world * s.soundVolume : 0, t, 0.1);
    this.bedBus!.gain.setTargetAtTime(s.sound ? Level.bed * s.soundVolume : 0, t, 0.5);
    if ((!s.music || this.style() === "orchestra") && !this.solo) this.synth?.stop();
    if (!s.music && !this.solo) for (const d of this.decks) d.el.pause();
    else if (s.music && !this.solo) this.resume();
    if (!s.sound) this.stopBed();
    else this.setBed(this.bed, true);
  }

  private visibility(): void {
    if (this.ctx === null) return;
    if (document.hidden) {
      for (const d of this.decks) d.el.pause();
      this.synth?.stop();
      void this.ctx.suspend();
    } else {
      void this.ctx.resume();
      this.resume();
    }
  }

  /** The version heard: the one chosen, or Lyre and reed while the orchestra's files cannot load. */
  private style(): MusicStyle {
    const s = audioSettings().style;
    return s === "orchestra" && this.orchestraDown ? "period" : s;
  }

  private fallBack(): void {
    if (audioSettings().style !== "orchestra" || this.orchestraDown) return;
    this.orchestraDown = true;
    this.askedPlay = null;
  }

  private resume(): void {
    // The fallback's versions are started by the director's tick.
    if (this.style() !== "orchestra" || this.hushed) return;
    const d = this.decks[this.live];
    if (d === undefined) return;
    if (d.file !== null && d.el.paused && !d.el.ended && audioSettings().music) {
      // A stream not yet heard is given its full wait again from now (the tab was hidden, or the music off, meanwhile).
      if (this.askedPlay !== null) this.askedPlay = performance.now();
      void d.el.play().catch(() => undefined);
    } else if (d.file === null) this.next(false);
  }

  /** After the Music page: the music's return fades in from silence once it is actually heard. */
  private comeBack(): void {
    if (!this.returning || this.ctx === null || this.opening === null) return;
    this.returning = false;
    const t = this.ctx.currentTime;
    this.opening.gain.cancelScheduledValues(t);
    this.opening.gain.setValueAtTime(0, t);
    this.opening.gain.linearRampToValueAtTime(1, t + Return);
  }

  /** Picks the file to play for a piece: any variation but the one it played last time, and never the file just played. */
  private pick(piece: string): Variation | null {
    const vars = music[piece];
    if (vars === undefined || vars.length === 0) return null;
    const last = this.lastFile.get(piece);
    const choices = vars.filter((v) => v.file !== last && v.file !== this.lastAny);
    const fresh = choices.length > 0 ? choices : vars;
    // The variation in the shade the situation asks for, where the piece has one; else any of its own.
    const want = this.shadeFile(fresh);
    const list = want.length > 0 ? want : fresh;
    return list[Math.floor(Math.random() * list.length)];
  }

  /** Of a piece's variations, those in the shade the situation asks for (its own tuning for no shade). */
  private shadeFile(vars: readonly Variation[]): Variation[] {
    const want = Math.sign(this.shade);
    return vars.filter((v) => Math.sign(v.shade ?? 0) === want);
  }

  /** What should play next: a moment's piece once, else one of the mood's pieces (another than the one just heard). */
  private target(): string {
    if (this.moment !== null) return MomentPieces[this.moment];
    const pieces = MoodPieces[this.mood];
    const now = this.decks[this.live]?.piece ?? null;
    // A change of shade alone stays in the piece, in its variation of that shade.
    if (now !== null && pieces.includes(now) && !this.playingMoment && this.decks[this.live].file !== null) return now;
    const others = pieces.filter((p) => p !== now);
    const list = others.length > 0 && pieces.length > 1 ? others : pieces;
    return list[Math.floor(Math.random() * list.length)];
  }

  /** Starts the next piece on the idle deck and crosses to it; `fade` false starts it at once. */
  private next(fade: boolean): void {
    if (this.ctx === null || this.solo || this.hushed) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.fallBack();
      return;
    }
    const piece = this.target();
    const v = this.pick(piece);
    if (v === null) return;
    this.playingMoment = this.moment !== null;
    this.moment = null;
    const t = this.ctx.currentTime;
    const old = this.decks[this.live];
    const idx = old.file === null ? this.live : 1 - this.live;
    const d = this.decks[idx];
    if (old !== d && old.file !== null) {
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + (fade ? Cross : 0.3));
      this.pauseLater(old, (fade ? Cross : 0.3) * 1000 + 100);
      old.file = null;
      old.piece = null;
    }
    this.cancelPause(d);
    d.el.src = url(v.file);
    d.piece = piece;
    d.file = v.file;
    d.phrases = v.phrases;
    d.gain.gain.cancelScheduledValues(t);
    d.gain.gain.setValueAtTime(0, t);
    d.gain.gain.linearRampToValueAtTime(1, t + (fade ? Cross * 0.6 : 0.05));
    this.lastFile.set(piece, v.file);
    this.lastAny = v.file;
    this.live = idx;
    this.switchAt = null;
    this.askedAt = null;
    this.askedPlay = audioSettings().music ? performance.now() : null;
    if (audioSettings().music) void d.el.play().catch(() => undefined);
  }

  /** Starts the opening fade once, when music is first heard; `whole` (the listening page) skips it. */
  private open(whole: boolean): void {
    if (this.ctx === null || this.opening === null) return;
    // The listening page plays at once, even where a fade was under way.
    if (whole) {
      this.opened = true;
      this.opening.gain.cancelScheduledValues(this.ctx.currentTime);
      this.opening.gain.setValueAtTime(1, this.ctx.currentTime);
      return;
    }
    if (this.opened) return;
    this.opened = true;
    scheduleStartFade(this.opening.gain, this.ctx.currentTime);
  }

  private pauseLater(d: Deck, ms: number): void {
    this.cancelPause(d);
    d.pauseTimer = window.setTimeout(() => {
      d.pauseTimer = null;
      d.el.pause();
    }, ms);
  }

  private cancelPause(d: Deck): void {
    if (d.pauseTimer !== null) window.clearTimeout(d.pauseTimer);
    d.pauseTimer = null;
  }

  private ended(i: number): void {
    if (i !== this.live || this.solo) return;
    const d = this.decks[i];
    d.file = null;
    d.piece = null;
    // A rest between pieces where the music is quiet, as Empire Earth left room between its pieces; none in a fight.
    const quiet = this.mood === "calm" || this.mood === "menu" || this.mood === "tension" || this.mood === "last";
    this.restUntil = quiet && this.moment === null && !this.playingMoment ? performance.now() + 4000 + Math.random() * 8000 : 0;
    this.playingMoment = false;
  }

  private tick(): void {
    if (this.ctx === null || this.solo || this.hushed || !audioSettings().music || document.hidden) return;
    if (performance.now() < this.stingUntil) return;
    // A stream asked for and still not heard after a long wait, with the audio running: Lyre and reed instead.
    if (this.askedPlay !== null && this.ctx.state === "running" && performance.now() - this.askedPlay > LoadWait) this.fallBack();
    if (this.style() !== "orchestra") {
      this.synthTick();
      return;
    }
    const d = this.decks[this.live];
    if (d.file === null) {
      if (performance.now() >= this.restUntil) this.next(false);
      return;
    }
    const want = this.moment !== null ? MomentPieces[this.moment] : null;
    // The piece fits the mood, and its variation the shade wherever the piece has one in that shade.
    const vars = music[d.piece ?? ""] ?? [];
    const shaded = vars.find((v) => v.file === d.file);
    const shadeFits = shaded === undefined || this.shadeFile(vars).length === 0 || Math.sign(shaded.shade ?? 0) === Math.sign(this.shade);
    const fits = want === null ? MoodPieces[this.mood].includes(d.piece ?? "") && !this.playingMoment && shadeFits : d.piece === want;
    // A stream the browser refused or stalled is asked again, at most every two seconds.
    if (d.el.paused && !d.el.ended && d.pauseTimer === null && performance.now() - this.retried > 2000) {
      this.retried = performance.now();
      void d.el.play().catch(() => undefined);
    }
    if (fits) {
      this.switchAt = null;
      this.askedAt = null;
      // The moment asked for is the piece already playing: nothing more to wait for.
      if (want !== null) this.moment = null;
      return;
    }
    // A moment piece plays to its end unless a newer moment comes.
    if (this.playingMoment && want === null) return;
    const now = d.el.currentTime;
    if (this.switchAt === null) {
      // The next phrase end, waited for up to MaxWait; a longer phrase is crossed out of at once, over the long cross.
      const end = d.phrases.find((p) => p > now + Lead + 0.2);
      this.switchAt = end !== undefined && end - now <= MaxWait ? end - Lead : now;
      // By the page's clock too, so a stream that stalls still changes.
      this.askedAt = performance.now() + (this.switchAt - now) * 1000 + 2000;
    }
    if (now >= this.switchAt || performance.now() >= (this.askedAt ?? Infinity)) this.next(true);
  }

  // What the game and the pages ask for.

  /** The situation's mood (Play) or the menu's (the first screen). */
  setMood(m: Mood): void {
    this.mood = m;
  }

  /** The situation's shade, and the court whose home mode the fallback plays in (null in god view and the menus). */
  setShade(s: Shade, court: Power | null = this.court): void {
    this.shade = s;
    this.court = court;
  }

  // The fallback's versions: one score, played by the synth engine phrase by phrase.

  private synthTick(): void {
    for (const d of this.decks) if (d.file !== null) {
      this.pauseLater(d, 400);
      d.gain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.1);
      d.file = null;
      d.piece = null;
    }
    if (this.synth === null) this.synth = new SynthDeck(this.ctx!, this.musicBus!, () => this.synthNext());
    this.synth.version = this.style() as Version;
    if (!this.synth.playing) {
      this.synth.start();
      this.open(false);
      this.comeBack();
    }
  }

  /** The tuning a score plays in: its own, or the court's home mode, darker or brighter by the shade. */
  private modeFor(score: SynthScore, by: number): Tuning {
    return score.mode ?? shift(homeMode(this.court), by);
  }

  private synthNext(): NextStretch | null {
    if (!audioSettings().music || this.solo || this.hushed || this.style() === "orchestra") return null;
    let shade: number = this.shade;
    let piece: string;
    if (this.moment !== null) {
      piece = MomentPieces[this.moment];
      shade = this.moment === "triumph" ? 1 : this.moment === "ended" ? 0 : -2;
      this.moment = null;
    } else piece = MoodPieces[this.mood][0];
    const score = synthPiece(piece, this.court);
    return { score, mode: this.modeFor(score, shade), situation: { mood: this.mood, shade: shade as Shade } };
  }

  /** The listening page: one score once through, in a version and a tuning (null: the court's home mode). */
  listenSynth(score: SynthScore, version: Version, mode: Tuning | null, shade: Shade, onEnd: () => void, mood: Mood = "calm"): void {
    this.solo = true;
    this.start();
    if (this.ctx === null) return;
    this.stopSolo();
    for (const d of this.decks) d.el.pause();
    this.synth?.stop();
    this.open(true);
    this.musicBus!.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus!.gain.setValueAtTime(Level.music * Math.max(0.5, audioSettings().musicVolume), this.ctx.currentTime);
    let stretches = score.phrases.length;
    const deck = new SynthDeck(this.ctx, this.musicBus!, () => {
      if (stretches-- <= 0) {
        window.setTimeout(onEnd, 1500);
        return null;
      }
      return { score, mode: mode ?? this.modeFor(score, shade), situation: { mood, shade } };
    });
    deck.version = version;
    this.soloSynth = deck;
    deck.start();
  }

  private stopSolo(): void {
    this.soloSynth?.stop();
    this.soloSynth = null;
  }

  /** A great moment: its sting, if it has one, then its piece. */
  cue(moment: Moment | null, sting: Sting | null): void {
    if (moment !== null) this.moment = moment;
    if (sting !== null) this.sting(sting);
  }

  private sting(name: Sting): void {
    const files = stings[name];
    if (this.ctx === null || files === undefined || files.length === 0 || !audioSettings().music) return;
    // Great moments are rare: watching at speed, a sting within twenty seconds of the last is let pass (its piece still plays).
    if (performance.now() - this.lastSting < 20000) return;
    this.lastSting = performance.now();
    const t = this.ctx.currentTime;
    // The music gives way to the sting, then the moment's piece takes it up.
    for (const d of this.decks) {
      d.gain.gain.cancelScheduledValues(t);
      d.gain.gain.setValueAtTime(d.gain.gain.value, t);
      d.gain.gain.linearRampToValueAtTime(0, t + 0.5);
      this.pauseLater(d, 600);
      d.file = null;
      d.piece = null;
    }
    this.synth?.stop();
    this.askedPlay = null;
    const f = files[0];
    this.stingUntil = performance.now() + Math.max(1500, (f.seconds - 1.2) * 1000);
    void this.buffer(f.file).then((b) => {
      if (b === null || this.ctx === null) return;
      this.open(false);
      this.comeBack();
      this.playBuffer(b, this.musicBus!, 1, 1);
    });
  }

  /**
   * A short sound, in its layer: an event sound (one seat's clicks and what happens to its realm) or a world sound (placed
   * on the map, heard near the view). A variation chosen at random, a little varied in pitch and level so it never tires;
   * let through only within the layer's caps (`Mixer`: at most three at once, the same not again within a few seconds),
   * judged by the moment it is to be heard, not when it was asked; and rising in over a few hundredths, never sudden.
   */
  play(name: SoundName, delay = 0, heard: Hearing = { gain: 1, pan: 0 }, layer: Layer = "event"): void {
    if (this.ctx === null || !audioSettings().sound) return;
    const files = sounds[name];
    if (files === undefined || files.length === 0) return;
    const f = files[Math.floor(Math.random() * files.length)];
    const now = performance.now();
    if (!this.mixer.admit(name, layer, now + delay * 1000, f.seconds, now)) return;
    const bus = layer === "world" ? this.worldBus! : this.soundBus!;
    void this.buffer(f.file).then((b) => {
      if (b === null || this.ctx === null) return;
      this.playBuffer(b, bus, (0.85 + Math.random() * 0.15) * heard.gain, 0.97 + Math.random() * 0.06, delay, heard.pan, Attack);
    });
  }

  private playBuffer(b: AudioBuffer, bus: GainNode, level: number, rate: number, delay = 0, pan = 0, attack = 0): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    if (attack > 0) {
      const at = ctx.currentTime + delay;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(level, at + attack);
    } else g.gain.value = level;
    src.connect(g);
    if (pan !== 0 && typeof ctx.createStereoPanner === "function") {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(bus);
    } else g.connect(bus);
    src.start(ctx.currentTime + delay);
  }

  private buffer(file: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(file);
    if (p === undefined) {
      p = fetch(url(file))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((a) => this.ctx!.decodeAudioData(a))
        .catch(() => {
          this.buffers.delete(file);
          return null;
        });
      this.buffers.set(file, p);
    }
    return p;
  }

  /**
   * The world's bed under the music, crossing slowly from one to the next; null for none. `level` (0 to 1) follows the
   * view's zoom: the bed is a world sound, heard only zoomed in (`bedLevel`).
   */
  setBed(bed: Bed, force = false, level: number = this.bedGain): void {
    if (level !== this.bedGain) {
      this.bedGain = level;
      if (this.bedSource !== null && this.ctx !== null) {
        // Over any fade still under way (a bed just begun), or its end would undo the zoom's level.
        const g = this.bedSource.gain.gain;
        const t = this.ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.setTargetAtTime(level, t, 0.8);
      }
    }
    if (bed === this.bed && !force) return;
    this.bed = bed;
    if (this.ctx === null || !audioSettings().sound) return;
    if (force && this.bedSource !== null) return;
    this.stopBed();
    if (bed === null) return;
    const f = beds[bed]?.[0];
    if (f === undefined) return;
    void this.buffer(f.file).then((b) => {
      if (b === null || this.ctx === null || this.bed !== bed || this.bedSource !== null) return;
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(this.bedGain, t + 4);
      src.connect(gain);
      gain.connect(this.bedBus!);
      src.start(t, Math.random() * Math.max(0, b.duration - 1));
      this.bedSource = { src, gain };
    });
  }

  private stopBed(): void {
    if (this.bedSource === null || this.ctx === null) return;
    const { src, gain } = this.bedSource;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + 3);
    src.stop(t + 3.1);
    this.bedSource = null;
  }

  // The listening page.

  /** Plays one file of the music or a sting alone, the director standing aside until `release`. */
  listen(file: string, onEnd: () => void): void {
    this.solo = true;
    this.start();
    if (this.ctx === null) return;
    this.stopSolo();
    this.synth?.stop();
    const t = this.ctx.currentTime;
    for (const d of this.decks) {
      this.cancelPause(d);
      d.el.pause();
      d.gain.gain.cancelScheduledValues(t);
      d.gain.gain.setValueAtTime(0, t);
      d.file = null;
      d.piece = null;
    }
    this.open(true);
    this.musicBus!.gain.cancelScheduledValues(t);
    this.musicBus!.gain.setValueAtTime(Level.music * Math.max(0.5, audioSettings().musicVolume), t);
    const d = this.decks[0];
    this.live = 0;
    d.el.src = url(file);
    d.el.onended = () => onEnd();
    d.gain.gain.setValueAtTime(1, t);
    d.file = file;
    void d.el.play().catch(() => undefined);
  }

  /** A sound, sting or bed heard alone on the listening page, whatever the switches say. */
  listenBuffer(file: string, bus: "sound" | "music" | "bed"): void {
    this.start();
    if (this.ctx === null) return;
    void this.buffer(file).then((b) => {
      if (b === null || this.ctx === null) return;
      const g = this.ctx.createGain();
      g.gain.value = bus === "music" ? Level.music * 0.6 : bus === "bed" ? Level.bed * 1.2 : Level.event * 0.9;
      g.connect(this.ctx.destination);
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.connect(g);
      src.start();
      if (bus === "bed") src.stop(this.ctx.currentTime + 12);
    });
  }

  /**
   * The Music page: `true` fades the game's music out and keeps it out while the page is open; `false` (leaving it) lets
   * the music come back, fading in.
   */
  hush(on: boolean): void {
    if (on === this.hushed) return;
    this.hushed = on;
    if (this.ctx === null) return;
    const t = this.ctx.currentTime;
    if (on) {
      // The fallback's versions fade out on the music's own stage, then stop (the listening page sets it again to play).
      const synth = this.synth;
      if (synth?.playing === true) {
        this.musicBus!.gain.cancelScheduledValues(t);
        this.musicBus!.gain.setValueAtTime(this.musicBus!.gain.value, t);
        this.musicBus!.gain.linearRampToValueAtTime(0, t + 1.5);
        window.setTimeout(() => {
          if (this.hushed && !this.solo) synth.stop();
        }, 1500);
      }
      for (const d of this.decks) {
        if (d.file === null) continue;
        d.gain.gain.cancelScheduledValues(t);
        d.gain.gain.setValueAtTime(d.gain.gain.value, t);
        d.gain.gain.linearRampToValueAtTime(0, t + 1.5);
        this.pauseLater(d, 1600);
        d.file = null;
        d.piece = null;
      }
      this.askedPlay = null;
      return;
    }
    this.restUntil = 0;
    // Held silent until the music is heard again, then faded in (`comeBack`), however long the stream takes to load.
    if (this.opening !== null && this.opened) {
      this.opening.gain.cancelScheduledValues(t);
      this.opening.gain.setValueAtTime(0, t);
      this.returning = true;
      // Left before the fallback's version had stopped: it is still playing, so it fades in at once.
      if (this.synth?.playing === true) this.comeBack();
    }
  }

  /** Ends the listening page's solo: the director takes the music back. */
  release(): void {
    this.solo = false;
    this.stopSolo();
    const d = this.decks[0];
    if (d !== undefined) {
      d.el.onended = null;
      d.el.pause();
      d.file = null;
      d.piece = null;
    }
    this.apply();
  }

  /** What plays now, for the smoke test and the curious: the mood, the piece and file, the bed. */
  status(): { mood: Mood; shade: Shade; style: string; synth: boolean; opening: number; stingLeft: number; piece: string | null; file: string | null; bed: Bed; running: boolean } {
    const d = this.decks[this.live];
    return { mood: this.mood, shade: this.shade, style: this.style(), synth: this.synth?.playing ?? false, opening: Math.round((this.opening?.gain.value ?? 0) * 100) / 100, stingLeft: Math.max(0, Math.round(this.stingUntil - performance.now())), piece: d?.piece ?? null, file: d?.file ?? null, bed: this.bed, running: this.ctx?.state === "running" };
  }
}

/** The one player of the page. */
export const player = new Player();
if (typeof window !== "undefined") (window as unknown as { amarnaAudio: { status: () => unknown } }).amarnaAudio = { status: () => player.status() };
