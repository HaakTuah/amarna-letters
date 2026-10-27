/**
 * Local play on a Claude subscription: the way from the game to the local bridge (sim/bridge.js), a small program on this
 * computer that keeps the king agents' folders. A web page cannot write files, so a local agent king hands each request to
 * the bridge, which writes it into that king's own folder exactly as a file seat would, and hands back the reply file's
 * contents once the king's agent has written it. The folders stay with the bridge: the page names a king, never a path.
 */
import { parsePower, trim, trimStart, type Power } from "@amarna/engine";
import type { ModelCall } from "@amarna/game";
import type { CallSpec, JsonAsker } from "./client.ts";
import { King, converse, requestText } from "./exchange.ts";
import type { JsonObject } from "./schemas.ts";

export const DefaultAddress = "http://localhost:5190";

/** What the bridge said when asked whether it runs, and which kings it keeps folders for. */
export interface BridgeStatus {
  running: boolean;
  seats: Power[];
  /** The seed whose characters the bridge keeps folders for (started with --seed), or null; and their ids. */
  seed: number | null;
  characters: string[];
  problem: string;
}

export const bridgeReady = (s: BridgeStatus): boolean => s.running && s.problem.length === 0;

function normalize(address: string): URL {
  let text = trim(address ?? "") === "" ? DefaultAddress : trim(address);
  if (!text.includes("://")) text = "http://" + text;
  return new URL(text.replace(/\/+$/, "") + "/");
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

export class LocalBridge {
  /** How often the page asks the bridge whether a reply has come. */
  static pollMs = 1000;
  /** The bridge's address, ending in a slash. */
  readonly address: URL;
  /** How long one decision may wait for its agent before the script king stands in for it. */
  readonly timeoutMs: number;

  constructor(address: string, timeoutMs: number) {
    this.address = normalize(address);
    this.timeoutMs = timeoutMs;
  }

  /** Asks the bridge whether it runs and which kings it has folders for, and says what is wrong if it does not serve them all. */
  static async check(address: string, kings: Iterable<Power>, charactersOf: number | null = null): Promise<BridgeStatus> {
    let at: URL;
    try {
      at = normalize(address);
    } catch {
      return { running: false, seats: [], seed: null, characters: [], problem: `"${address}" is not an address: the bridge listens at ${DefaultAddress} unless it was started with another --port.` };
    }
    let body: JsonObject | null;
    try {
      const r = await fetch(new URL("status", at), { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(String(r.status));
      body = JSON.parse(await r.text()) as JsonObject;
    } catch {
      return {
        running: false,
        seats: [],
        seed: null,
        characters: [],
        problem: `No local bridge answers at ${at}. Kings played by local agents need it: start it with node sim/bridge.js (see "Local play" in sim/README.md). It works only when the game runs on this computer, not on the published site.`,
      };
    }
    if (body?.bridge !== "amarna-letters") return { running: false, seats: [], seed: null, characters: [], problem: `Something answers at ${at}, but it is not the Amarna Letters bridge.` };
    const seats = (Array.isArray(body.seats) ? body.seats : []).map((x) => (typeof x === "string" ? parsePower(x) : null)).filter((p): p is Power => p !== null);
    const seed = typeof body.seed === "number" ? body.seed : null;
    const characters = (Array.isArray(body.characters) ? body.characters : []).filter((x): x is string => typeof x === "string");
    const missing = [...kings].filter((k) => !seats.includes(k));
    if (missing.length > 0) return { running: true, seats, seed, characters, problem: `The bridge has no folder for ${missing.join(", ")}: run node sim/setup.js, then restart the bridge.` };
    // Characters as local agents (item 8): the bridge must keep this game's seed's, since ids differ from seed to seed.
    if (charactersOf !== null && (seed !== charactersOf || characters.length === 0))
      return {
        running: true,
        seats,
        seed,
        characters,
        problem: `The bridge keeps no character folders for seed ${charactersOf}: run node sim/setup.js --seeds ${charactersOf}, then start the bridge with --seed ${charactersOf}.`,
      };
    return { running: true, seats, seed, characters, problem: "" };
  }

  /**
   * One request to one king: the bridge writes it into his folder and the page asks every poll for the reply until it comes
   * or the timeout passes. A request that times out, or whose game is stopped, is taken back.
   */
  async askOnce(seat: string, spec: CallSpec, stem: string, error: string, signal?: AbortSignal, actor: string = King): Promise<[string, number]> {
    const mark = `<reply path ${crypto.randomUUID().replaceAll("-", "")}>`;
    const text = requestText(spec, mark, error, actor);
    const sent = await this.post("ask", { seat, name: stem, text, mark }, signal);
    const chars = typeof sent?.chars === "number" && Number.isInteger(sent.chars) ? sent.chars : text.length;
    const deadline = Date.now() + this.timeoutMs;
    try {
      for (;;) {
        if (Date.now() > deadline) throw new Error(`no reply from the agent of ${seat} after ${Math.round(this.timeoutMs / 60000)} minutes`);
        await sleep(LocalBridge.pollMs, signal);
        let response: Response;
        // The bridge may be restarted while an agent works: the request stays in the folder, so keep asking.
        try {
          response = await fetch(new URL(`reply?seat=${seat}&name=${encodeURIComponent(stem)}`, this.address), { signal });
        } catch (e) {
          if (signal?.aborted) throw e;
          continue;
        }
        if (response.status === 204) continue;
        if (response.status === 404) throw new Error(`the bridge no longer holds the request ${stem} for ${seat}`);
        if (!response.ok) throw new Error(`the bridge answered ${response.status}: ${await response.text()}`);
        return [trimStart(trim(await response.text()), "﻿"), chars];
      }
    } catch (e) {
      void this.withdraw(seat, stem);
      throw e;
    }
  }

  private async post(path: string, body: JsonObject, signal?: AbortSignal): Promise<JsonObject | null> {
    // A bridge that is being restarted gets a few seconds; one that is not running fails the call, and the script stands in.
    for (let attempt = 1; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(new URL(path, this.address), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
      } catch (e) {
        if (signal?.aborted) throw e;
        if (attempt < 4) {
          await sleep(2000, signal);
          continue;
        }
        throw new Error(`no local bridge answers at ${this.address}: ${e instanceof Error ? e.message : String(e)}`);
      }
      const answer = await response.text();
      if (!response.ok) throw new Error(`the bridge refused the request: ${answer}`);
      return answer.length === 0 ? null : (JSON.parse(answer) as JsonObject);
    }
  }

  private async withdraw(seat: string, stem: string): Promise<void> {
    try {
      await this.post("cancel", { seat, name: stem });
    } catch {
      /* best effort: the bridge moves stale requests aside when it starts */
    }
  }
}

/**
 * A local agent king's channel: a file seat whose files are written by the local bridge instead of by this program. Each
 * exchange is logged as a call with no tokens, so a game replays exactly.
 */
export class BridgeExchange implements JsonAsker {
  static readonly Model = "local agent";
  private readonly bridge: LocalBridge;
  /** A king's name, or a character's id (item 8: characters played by local agents). */
  private readonly seat: string;
  private readonly record: ((call: ModelCall) => void) | null;
  private readonly actor: string;

  constructor(bridge: LocalBridge, seat: string, record: ((call: ModelCall) => void) | null = null, actor: string = King) {
    this.bridge = bridge;
    this.seat = seat;
    this.record = record;
    this.actor = actor;
  }

  askJson(spec: CallSpec, signal?: AbortSignal): Promise<JsonObject> {
    return converse(spec, BridgeExchange.Model, (stem, error) => this.bridge.askOnce(this.seat, spec, stem, error, signal, this.actor), this.record);
  }
}
