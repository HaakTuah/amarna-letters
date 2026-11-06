import type { CallSpec, JsonAsker, JsonObject } from "@amarna/llm";

// <summary>Answers each request with the JSON the test gives for it, and keeps every request.</summary>
export class ScriptedAsker implements JsonAsker {
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
