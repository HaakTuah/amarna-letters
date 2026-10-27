import { jsonSchema, type CallSpec, type JsonAsker, type JsonObject } from "@amarna/llm";

/** Keeps every request a model character makes and answers with the plainest reply its schema allows (shared by the request tests). */
export class Recorder implements JsonAsker {
  calls: CallSpec[] = [];

  askJson(spec: CallSpec): Promise<JsonObject> {
    this.calls.push(spec);
    let reply: JsonObject = {};
    for (const [name, schema] of Object.entries(jsonSchema(spec.schema).properties as JsonObject)) {
      const type = (schema as JsonObject).type;
      reply[name] = type === "string" ? "Words." : type === "integer" ? 0 : type === "boolean" ? false : [];
    }
    return Promise.resolve(reply);
  }

  static fields(spec: CallSpec): string[] {
    return Object.keys(jsonSchema(spec.schema).properties as JsonObject);
  }
}
