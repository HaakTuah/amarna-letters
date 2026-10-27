import { describe, test } from "vitest";
import { shekels } from "../src/bots/brain.ts";
import { letters } from "../src/bots/statecraft-letters.ts";
import { report } from "../src/character-checks.ts";
import {
  type AudienceView,
  type GameState,
  type SeatView,
  Views,
  dispatch,
  newAudienceView,
  newCharacterView,
  newGame,
  newGameConfig,
  newLetterView,
  newTablet,
  newTabletCopy,
  single,
} from "@amarna/engine";
import { type CallSpec, type JsonAsker, type JsonObject, LlmLeaderSeat, came, leaderRules, situation } from "@amarna/llm";
import { Assert, last } from "../../engine/test/support.ts";

// What a model king reads of what he himself said, sent and sealed, after the second agent simulation (the fix pass after
// item 4, part 2): his audience speeches and the tablets he holds in full, and his own letters in his record.
describe("KingRecordTests", () => {
  // <summary>Answers each request with the JSON the test gives for it, and keeps every request.</summary>
  class Scripted implements JsonAsker {
    readonly #reply: (a0: CallSpec) => string;
    constructor(reply: (a0: CallSpec) => string) {
      this.#reply = reply;
    }
    asked: CallSpec[] = [];

    askJson(spec: CallSpec, ct: AbortSignal): Promise<JsonObject> {
      this.asked.push(spec);
      return Promise.resolve(JSON.parse(this.#reply(spec)) as JsonObject);
    }
  }

  function host(speech: string): string {
    return JSON.stringify({
      ["speech"]: speech,
      ["gift_to_envoy"]: 0,
      ["gift_request"]: "",
      ["offer_service_wage"]: 0,
      ["seal_tablet"]: false,
      ["detain_envoy"]: false,
      ["send_gold_back"]: 0,
      ["gold_back_purity"]: 100,
      ["end_audience"]: true,
    });
  }

  function orders(letters: unknown[] | null = null): string {
    return JSON.stringify({
      ["notes"]: "",
      ["summary"]: "",
      ["ledger"]: [],
      ["units"]: [],
      ["letters"]: letters ?? [],
      ["other_orders"]: [],
    });
  }

  function envoy(turn: number): AudienceView {
    return newAudienceView({
      audienceId: `a${turn}`,
      turn: turn,
      round: 1,
      maxRounds: 2,
      from: "Egypt",
      host: "Hatti",
      envoy: newCharacterView({ id: "c90", name: "Mane" }),
      spoken: "My lord greets you.",
    });
  }

  function view(s: GameState, turn: number): SeatView {
    let v = Views.for(s, "Hatti");
    v.turn = turn;
    return v;
  }

  test("A kings audience speech stays in his record in full", async () => {
    let speech = "I swear to keep my ships out of Cyprus and my armies out of Mira. ".repeat(12).trim(); // about 800 characters
    let s = newGame(5);
    let asker = new Scripted((spec) => (spec.key.includes("/aud/") ? host(speech) : orders()));
    let seat = new LlmLeaderSeat("Hatti", asker, "m", "medium", true, s.config);
    await seat.decide(view(s, 1));
    await seat.hostAudience(envoy(2), view(s, 2));
    // Before it gives orders again, a later audience shows it what it said at this one, in full.
    await seat.hostAudience(envoy(2), view(s, 2));
    Assert.contains(`you said "${speech}"`, last(asker.asked).user);
    await seat.decide(view(s, 2));
    await seat.decide(view(s, 3));
    Assert.contains(`turn 2 audiences: Egypt's envoy Mane: you said "${speech}"`, last(asker.asked).user);
    Assert.doesNotContain(
      "…",
      single(last(asker.asked).user.split("\n"), (l) => l.startsWith("turn 2 audiences")),
    );
  });

  test("A king reads his letters in full and the rulebook says where", () => {
    let v = Views.for(newGame(5), "Egypt");
    v.letters = [
      newLetterView({
        turn: 3,
        envoyId: "c7",
        envoyName: "Mane",
        to: "Babylonia",
        gold: 50,
        message: "Brother, Mari is yours when Ashur falls.",
        mandate: "May name the day; may not seal.",
        tablet: "Mari to Babylonia.",
      }),
      newLetterView({ turn: 2, envoyId: "c8", envoyName: "Paser", to: "Hatti", message: "Peace.", reportedTurn: 5 }),
    ];
    let text = situation(v);
    Assert.contains(
      "YOUR LETTERS (your record of what you sent, as your scribes wrote it: each envoy's letter while he is away on that errand, and once more when his report has come since you last gave orders):",
      text,
    );
    Assert.contains(
      '- turn 3, Mane (c7) to Babylonia, with 50 shekels (still away): message "Brother, Mari is yours when Ashur falls."; mandate "May name the day; may not seal."; tablet to seal "Mari to Babylonia."',
      text,
    );
    Assert.contains('- turn 2, Paser (c8) to Hatti (his report came in turn 5): message "Peace."; mandate none', text);
    Assert.contains(
      "Each set of orders shows the letters you sent (message, mandate, tablet and gold) in full under YOUR LETTERS while their envoys are away, and once more when the report comes.",
      leaderRules(true, newGameConfig()),
    );

    // Letters sent from this season's audiences, before they go out, are read back in full too.
    v.courtLetters = [dispatch("c9", "Mitanni", "Come to terms.", { mandate: "May offer 30 shekels.", gold: 30 })];
    Assert.contains('send c9 to Mitanni with 30 shekels: message "Come to terms."; mandate "May offer 30 shekels."', situation(v));
  });

  test("At an audience a king reads the tablets he holds in full by their names", async () => {
    let text = "Hatti and Egypt shall not cross into each other's homeland, and the free cities between them stay free. ".repeat(5).trim();
    let s = newGame(5);
    s.tablets.push(newTablet({ id: "t900", text: text, proposedBy: "Egypt", partner: "Hatti", seals: ["Egypt", "Hatti"], createdTurn: 1, sealedTurn: 1 }));
    s.copies.push(newTabletCopy({ id: "k901", tabletId: "t900", holder: "Hatti", acquiredTurn: 1, source: "sealed at audience" }));
    let asker = new Scripted((_) => host("Welcome."));
    await new LlmLeaderSeat("Hatti", asker, "m", "medium", true, s.config).hostAudience(envoy(2), view(s, 2));

    Assert.contains(
      `Tablets you hold, in full: the tablet sealed by Egypt and Hatti, dated turn 1 [your copy k901]: "${text}"`,
      Assert.single(asker.asked).user,
    );
  });
});
