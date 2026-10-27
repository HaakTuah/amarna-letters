// Temporary stand-in until the narrator is ported (conversion gate 2).
import type { Character } from "@amarna/engine";
import type { CheckContext, ChronicleContext, INarrator } from "../contracts.ts";

export class TemplateNarrator implements INarrator {
  readonly label = "Template narrator";
  persona(c: Character): Promise<string> {
    return Promise.resolve(c.persona);
  }
  checkReport(ctx: CheckContext, signal?: AbortSignal): Promise<string> {
    void signal;
    void ctx;
    throw new Error("not ported yet");
  }
  chronicle(ctx: ChronicleContext, signal?: AbortSignal): Promise<string> {
    void signal;
    void ctx;
    throw new Error("not ported yet");
  }
}
