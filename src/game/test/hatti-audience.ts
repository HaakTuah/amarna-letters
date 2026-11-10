import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { Statecraft } from "../src/bots/statecraft.ts";
import { type HostReply, Rng, Views, newAudienceView, newGame, newTabletView } from "@amarna/engine";

// <summary>Hatti's script king hears Arzawa's envoy, who carries a tablet with this text, in season 1; returns its reply and the mind that gave it.</summary>
export function hear(text: string): { reply: HostReply; brain: Brain; board: Board } {
  let s = newGame(5);
  let court = Views.for(s, "Hatti");
  let brain = new Brain("Hatti", 5);
  brain.learn(court, new Board(court));
  let board = new Board(court, undefined, brain.treasury);
  let audience = newAudienceView({
    audienceId: "a1",
    turn: 1,
    round: 1,
    maxRounds: 2,
    from: "Arzawa",
    host: "Hatti",
    proposal: newTabletView({ text: text, proposedBy: "Arzawa", partner: "Hatti" }),
  });
  let reply = Statecraft.host(audience, board, brain, Rng.for(5, 1, "test", "host"));
  return { reply: reply, brain: brain, board: board };
}
