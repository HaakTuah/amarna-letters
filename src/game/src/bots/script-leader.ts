// Temporary stand-in until the script kings are ported (conversion gate 2).
import type { AudienceView, HostReply, SeatView, TurnSubmission } from "@amarna/engine";
import type { ISeat } from "../contracts.ts";

export class ScriptLeader implements ISeat {
  readonly label = "Script bot";
  constructor(gameSeed: number) {
    void gameSeed;
  }
  observe(view: SeatView): void {
    void view;
  }
  decide(view: SeatView, signal?: AbortSignal): Promise<TurnSubmission> {
    void view;
    void signal;
    throw new Error("not ported yet");
  }
  hostAudience(view: AudienceView, court: SeatView, signal?: AbortSignal): Promise<HostReply> {
    void court;
    void signal;
    void view;
    throw new Error("not ported yet");
  }
}
