/**
 * What a model envoy carries and reports in clauses: the king's answers as given, the clauses it recites, and the answers
 * it reports home. Split from `character-mind.ts`, which reads them from the model's reply.
 */
import { clause, land, type Clause, type MessageTrail } from "@amarna/engine";
import type { JsonObject } from "./schemas.ts";

/** An envoy's report of an audience as given: the king's answers word for word, and nothing of the envoy's own. */
export function asGiven(t: MessageTrail): string {
  const said = t.exchanges.map((x) => `"${x.host}"`).join(" Then: ");
  // Only the king's words: what happened is told by the engine's own record (the envoy's own deeds, a kept share of the
  // gold or a gift taken, are his to tell or hide, and as given he tells nothing of his own).
  return `I was received at the court of ${land(t.to)}. The king answered: ${said}`;
}

const nums = (o: JsonObject, k: string): Set<number> => new Set(Array.isArray(o[k]) ? (o[k] as unknown[]).filter((x): x is number => typeof x === "number" && Number.isInteger(x)) : []);

/**
 * The clauses a model envoy recites (item 11a+, "Full press": a model envoy may alter a letter's clauses as a script envoy
 * can): those it did not leave out, the gift stated as it chose (never more than written), good wishes added if it chose.
 */
export function recitedBy(clauses: readonly Clause[], json: JsonObject): Clause[] {
  const out = clauses.filter((_, i) => !nums(json, "leave_out").has(i + 1)).map((x) => ({ ...x }));
  // 0 (or nothing) states it as written; to name no gift at all, it leaves the clause out.
  const stated = typeof json.gift_stated === "number" && json.gift_stated > 0 ? Math.trunc(json.gift_stated) : null;
  if (stated !== null) for (const x of out) if (x.kind === "gift" && x.amount !== null) x.amount = Math.min(x.amount, stated);
  if (json.add_courtesy === true && !out.some((x) => x.kind === "wellWishes")) out.unshift(clause("wellWishes"));
  return out;
}

/** The host's answer as a model envoy reports it home (item 11a+): less what it left out, refusals it turned into acceptance. */
export function reportedBy(answers: readonly Clause[], json: JsonObject): Clause[] {
  const turned = nums(json, "refusals_as_accepted");
  return answers
    .map((x, i) => ({ ...x, kind: x.kind === "refuse" && turned.has(i + 1) ? ("accept" as const) : x.kind }))
    .filter((_, i) => !nums(json, "answers_left_out").has(i + 1));
}
