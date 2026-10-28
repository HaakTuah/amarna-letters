/**
 * Heuristic markers for the success criteria, read from the record after the fact: sealed tablets, accusations, forgeries and
 * authentications, broken promises, coalitions against the leader, and pacts with written consequences. None of these is a
 * rule in the game.
 */
import { Dict, WorldMap, cap, cmpNum, cmpStr, desc, isBlank, isSealedAgreement, parsePower, rx, sortBy, type GameState } from "@amarna/engine";
import { TextKit } from "./bots/textkit.ts";

export interface Signal {
  turn: number;
  kind: string;
  text: string;
}

export const SignalKinds: readonly string[] = [
  "tablet-sealed", "accusation", "messenger-blamed", "reputation", "broken-promise", "coalition",
  "forgery", "authentication", "forgery-exposed", "pact-with-consequences", "bribe", "defection",
  "detention", "skim", "debasement-found", "spy-caught", "double-agent", "evidence-shown", "shared-victory",
  "archive-copied", "archive-taken", "inventory-swapped", "storm", "siege-begun", "siege-won", "fortify", "sally", "sally-won", "envoy-out", "envoy-caught", "envoy-stayed",
  "terrain-held", "terrain-beaten", "landing", "blockade", "sea-supplied",
  "roads-closed", "roads-opened", "turned-at-border", "road-caught", "road-outlaws", "road-nature",
  "support-kept", "claim-established",
  "winter-crossed", "winter-loss", "envoy-sealed", "repudiated", "passage-granted", "basing-granted", "grant-revoked",
  "sale", "grain-bought", "feed", "caravan-out", "caravan", "caravan-taken", "caravan-robbed", "caravan-lost", "forage", "hunger", "unpaid", "mutiny", "siege-starved", "siege-thirst",
  "trade-out", "ship-out", "traded", "sale-abroad", "purchase-abroad", "toll-set", "toll-paid", "smuggled", "smuggler-found", "ship-lost", "food-bought", "sack",
  "false-name", "false-envoy", "impostor-exposed", "false-envoy-paid", "gift-to-person", "questioned", "questioned-truth", "questioned-lie",
  "captive-handed", "tablet-stolen",
  "tax-set", "famine", "colonists", "resisted", "drought", "flood",
  "besieged-fed", "captive-arrived", "captive-freed", "captive-taken", "captive-escaped",
  "refugees", "robbed", "welcomed", "deported", "runaways-returned", "mouths-expelled",
  "hire", "fee-paid", "fee-unpaid", "fee-withheld", "quit", "loan", "repaid", "default", "newcomer", "hoard",
  "character-loan", "character-deal", "character-repaid", "collector-hired", "collected", "collector-kept",
  "deportees-freed", "harvest-reaped", "granted-by-order", "spy-watching",
  "band-crowd", "band-mutiny", "band-refugees", "band-successor", "band-split", "band-outlaw", "band-hunted", "band-melted", "band-ship", "way-back",
  "caravan-banded", "ship-pirated", "death", "carrier-own", "carrier-passing", "carrier-hired", "carrier-self", "letter-read", "letter-lost", "news-sold", "secrets-caught",
  "job-done", "hire-abroad", "hoard-seized", "tablet-sold", "purse-taken",
];

const MessengerBlamed = rx(
  String.raw`(messenger|envoy)[^.]{0,60}\b(lie|lied|lies|lying|false|deceiv)|\b(messenger|envoy|scribe|interpreter|tongue)s?('s|s')?\b[^.!?]{0,60}?\b(err(ed|s)?|misspo(ke|ken)|mistook|garbled|twisted|miswr(ote|itten))\b`,
  "i",
);
const PastConduct = rx(String.raw`\b(you (once|before|already) (broke|swore|promised|sent)|as you did before|remember (when|how)|last (year|season) you|you kept your word|you have kept)`, "i");
const Consequence = rx(String.raw`\b(if (one|either|he|you|any)[^.]{0,80}(break|breaks|fails|attacks)|shall pay|must pay|forfeit|penalty|may the gods destroy)`, "i");
const Took = rx(String.raw`^(\w+) took (.+) from (\w+)\.$`);

/**
 * Blame laid on a messenger for the words he carried: his lies, or his errors and his scribe's.
 */
export const blamesMessenger = (text: string): boolean => MessengerBlamed.test(text);

export function detectSignals(s: GameState): Signal[] {
  const list: Signal[] = [];
  for (const e of s.events.filter((e) => e.signal !== null)) {
    const kind = e.signal!.startsWith("foreign-support") ? null : e.signal;
    if (kind !== null && kind !== "assay" && kind !== "debased-gift" && kind !== "catastrophe") list.push({ turn: e.turn, kind, text: e.text });
  }

  for (const t of s.trails.filter((x) => !x.pretended)) {
    // What the kings themselves said (the leader's letter and the host's replies), once per kind per message.
    const texts = [t.leaderLetter, ...t.exchanges.map((x) => x.host)].filter((x) => !isBlank(x));
    const turn = t.audienceTurn ?? t.turn;
    const mark = (kind: string, test: (x: string) => boolean): void => {
      const hit = texts.find(test);
      if (hit !== undefined) list.push({ turn, kind, text: `${t.from}/${t.to}: ${cap(hit, 140)}` });
    };
    mark("accusation", TextKit.isAccusation);
    mark("messenger-blamed", blamesMessenger);
    mark("reputation", (x) => PastConduct.test(x));
  }

  for (const t of s.tablets.filter((t) => isSealedAgreement(t) && Consequence.test(t.text)))
    list.push({ turn: t.sealedTurn ?? t.createdTurn, kind: "pact-with-consequences", text: cap(t.text, 160) });

  // Broken promises: a conquest between two powers that had sealed a tablet before it, or earlier the same season. A king
  // who takes back a province of his own homeland breaks no promise.
  for (const e of s.events.filter((e) => e.kind === "conquest")) {
    const m = Took.exec(e.text);
    if (m === null) continue;
    const taker = parsePower(m[1]);
    const loser = parsePower(m[3]);
    if (taker === null || loser === null) continue;
    if (WorldMap.default.provinces.find((x) => x.name === m[2])?.home === taker) continue;
    if (s.tablets.some((t) => isSealedAgreement(t) && t.sealedTurn !== null && t.sealedTurn <= e.turn && t.seals.includes(taker) && t.seals.includes(loser)))
      list.push({ turn: e.turn, kind: "broken-promise", text: e.text });
  }

  // Coalitions: two other powers supporting each other against whoever leads at the time.
  for (const e of s.events.filter((e) => e.signal !== null && e.signal.startsWith("foreign-support:"))) {
    const target = parsePower(e.signal!.slice("foreign-support:".length));
    if (target === null) continue;
    const leader = sortBy(
      s.scores.filter((x) => x.turn === e.turn - 1),
      [(x) => x.growth, desc(cmpNum)],
    )[0]?.power;
    if (leader === target) list.push({ turn: e.turn, kind: "coalition", text: e.text + ` (${target} was leading)` });
  }

  return sortBy(list, [(x: Signal) => x.turn, cmpNum], [(x: Signal) => x.kind, cmpStr]);
}

export function countSignals(s: GameState): Dict<string, number> {
  const d = new Dict<string, number>();
  for (const x of detectSignals(s)) d.set(x.kind, d.getOrDefault(x.kind, 0) + 1);
  return d;
}

export const SignalDetector = { Kinds: SignalKinds, detect: detectSignals, count: countSignals, blamesMessenger };
