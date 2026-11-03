/**
 * The model schemas, defined once in Zod ("One source for model schemas"): the reply types are derived from them, every
 * reply is validated against them, and the same definitions go to the providers as JSON schemas ({@link jsonSchema}). They
 * stay small enough to compile: every field required (the model writes the default instead of leaving one out), one flat
 * shape per reply with a field naming an order's type, and provinces, units and people as plain strings the engine checks.
 * `Replies` builds the Zod objects; `Schemas` gives the JSON schemas sent, for the request text and the tests. The tools they
 * are built with are in schema-tools.ts, the orders reply in schemas-orders.ts, the audience replies in schemas-audience.ts.
 */
import { z } from "zod";
import { type AudienceView, type GameConfig } from "@amarna/engine";
import { jsonSchema, object, type JsonObject } from "./schema-tools.ts";
import { OtherActions, leaderOrders } from "./schemas-orders.ts";
import { ReportText, ReportToSender, asksOf, courtReply, hostReply, phrase, pitch, present, questioned, react, report, text } from "./schemas-audience.ts";

/** The reply schemas in Zod, as calls carry them. */
export const Replies = { leaderOrders, hostReply, courtReply, phrase, present, react, report, pitch, questioned, text };

/** The same schemas as the JSON sent to a provider. */
export const Schemas = {
  object: (...props: [string, z.ZodType][]): JsonObject => jsonSchema(object(...props)),
  leaderOrders: (c: GameConfig | null = null): JsonObject => jsonSchema(leaderOrders(c)),
  hostReply: (c: GameConfig | null = null, a: AudienceView | boolean = false): JsonObject => jsonSchema(hostReply(c, a)),
  courtReply: (c: GameConfig | null = null, ordersStand = false, reopenChosen = false): JsonObject => jsonSchema(courtReply(c, ordersStand, reopenChosen)),
  asksOf,
  present: (carriesGold = true, canForge = true, clauses = 0, gift = false): JsonObject => jsonSchema(present(carriesGold, canForge, clauses, gift)),
  react: (giftOffered = true, serviceOffered = true): JsonObject => jsonSchema(react(giftOffered, serviceOffered)),
  report: (carriesGold = true, canForge = true, toLord = true, received = false, answers = 0): JsonObject => jsonSchema(report(carriesGold, canForge, toLord, received, answers)),
  pitch: (): JsonObject => jsonSchema(pitch()),
  text: (field: string, description: string): JsonObject => jsonSchema(text(field, description)),
  ReportText,
  ReportToSender,
  OtherActions,
};

/** What the orders reply, read back from the model, holds (every field, with a sleeping seat's schedule). */
export type LeaderOrdersReply = z.infer<ReturnType<typeof leaderOrders>>;
