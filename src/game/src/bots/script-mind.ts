// Temporary stand-in until the script characters are ported (conversion gate 2).
import type { EnvoyReaction, MindReply } from "@amarna/engine";
import type { ICharacterMind, PresentResult } from "../contracts.ts";

export class ScriptMind implements ICharacterMind {
  readonly label = "Script characters";
  present(ctx?: unknown, signal?: AbortSignal): Promise<PresentResult> {
    void ctx;
    void signal;
    throw new Error("not ported yet");
  }
  react(ctx?: unknown, host?: unknown, signal?: AbortSignal): Promise<EnvoyReaction> {
    void ctx;
    void host;
    void signal;
    throw new Error("not ported yet");
  }
  write(ctx?: unknown, signal?: AbortSignal): Promise<MindReply> {
    void ctx;
    void signal;
    throw new Error("not ported yet");
  }
}
