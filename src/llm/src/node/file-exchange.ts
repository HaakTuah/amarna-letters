/**
 * A file seat's channel (Node only). Instead of calling the API, it writes the request a model king would get to
 * <folder>/<key>.request.md and waits for <key>.reply.json. Whoever answers (a person, or an agent allowed to touch only this
 * folder) sees exactly what a model king sees, plus a closing footer on how to finish. File characters use the same channel.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { newGame, trim, trimStart, type Character, type GameConfig } from "@amarna/engine";
import type { ModelCall, ShadowDecision } from "@amarna/game";
import { LlmCharacterMind } from "../character-mind.ts";
import type { CallSpec, JsonAsker } from "../client.ts";
import { CharacterActor, King, converse, requestText } from "../exchange.ts";
import type { JsonObject } from "../schemas.ts";

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((ok, fail) => {
    const t = setTimeout(ok, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      fail(signal.reason);
    });
  });

export class FileExchange implements JsonAsker {
  static readonly PollMs = 400;
  static readonly EmptyGraceMs = 5000;
  readonly folder: string;
  private readonly timeoutMs: number;
  private readonly record: ((call: ModelCall) => void) | null;
  private readonly say: ((line: string) => void) | null;
  private readonly actor: string;

  constructor(folder: string, timeoutMs: number, record: ((call: ModelCall) => void) | null = null, say: ((line: string) => void) | null = null, actor: string = King) {
    this.folder = resolve(folder);
    this.timeoutMs = timeoutMs;
    this.record = record;
    this.say = say;
    this.actor = actor;
  }

  askJson(spec: CallSpec, signal?: AbortSignal): Promise<JsonObject> {
    mkdirSync(this.folder, { recursive: true });
    return converse(spec, "file seat", (stem, error) => this.askOnce(spec, stem, error, signal), this.record);
  }

  private async askOnce(spec: CallSpec, stem: string, error: string, signal?: AbortSignal): Promise<[string, number]> {
    const request = join(this.folder, stem + ".request.md");
    const reply = join(this.folder, stem + ".reply.json");
    if (existsSync(reply)) rmSync(reply);
    const tmp = request + ".tmp";
    const text = requestText(spec, reply, error, this.actor);
    writeFileSync(tmp, text, "utf8");
    renameSync(tmp, request);
    this.say?.(`waiting for ${reply}`);

    const deadline = Date.now() + this.timeoutMs;
    let size = -1;
    let emptySince: number | null = null;
    for (;;) {
      if (signal?.aborted) throw signal.reason;
      if (Date.now() > deadline) throw new Error(`no reply in ${reply} after ${Math.round(this.timeoutMs / 60000)} minutes`);
      await sleep(FileExchange.PollMs, signal);
      let now: number;
      try {
        now = existsSync(reply) ? statSync(reply).size : -1;
      } catch {
        continue;
      }
      if (now < 0) {
        size = -1;
        continue;
      }
      if (now === 0) {
        // A reply that stays empty is read as it stands (and fails), rather than waited on forever.
        emptySince ??= Date.now();
        if (Date.now() - emptySince > FileExchange.EmptyGraceMs) return ["", text.length];
        continue;
      }
      emptySince = null;
      // Read once the file has stopped changing for one poll.
      if (now === size) {
        try {
          return [trimStart(trim(readFileSync(reply, "utf8")), "﻿"), text.length];
        } catch {
          size = -1;
          continue;
        }
      }
      size = now;
    }
  }
}

/**
 * File characters: envoys, spies and candidates answered through files, one folder per character, as file seats are for
 * kings. A character left out of the map is played by the script.
 */
export const FileCharacters = {
  Label: "File characters",
  mind(folders: ReadonlyMap<string, string>, timeoutMs: number, record: ((call: ModelCall) => void) | null, shadow: ((s: ShadowDecision) => void) | null = null, say: ((line: string) => void) | null = null): LlmCharacterMind {
    const exchanges = new Map([...folders].map(([id, folder]) => [id, new FileExchange(folder, timeoutMs, record, say, CharacterActor)] as const));
    const m = new LlmCharacterMind((c) => exchanges.get(c.id) ?? null, "file", FileCharacters.Label);
    m.shadow = shadow;
    return m;
  },
  /** The characters of a seed's game: every character that can ever be hired, sent as an envoy or posted as a spy in it. */
  of(seed: number, config: GameConfig | null = null): Character[] {
    return newGame(seed, config).characters;
  },
  /** How a character starts the game, without its traits or secrets: "serves Egypt" or "free, at Hatti". */
  startsAs(c: Character): string {
    return c.employer !== null ? `serves ${c.employer}` : c.at !== null ? `free, at ${c.at}` : "free";
  },
};
