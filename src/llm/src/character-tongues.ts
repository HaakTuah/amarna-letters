/**
 * Item 12, "Speaking": an envoy nobody understands at the court where he stands chooses each season whether to stay until
 * he is understood, go home, or go home and say his message was delivered. Asked only while it applies, in the words of
 * what each choice means ("Requests are rules too").
 */
import { z } from "zod";
import {
  land,
  newUnheardChoice,
  type BridgeView,
  type Clause,
  type UnheardChoice,
  type UnheardView,
} from "@amarna/engine";
import { object, type JsonObject, type ReplySchema } from "./schemas.ts";
import { Sb } from "./text.ts";

const Choices = {
  stay: "stay",
  home: "go home",
  lie: "go home and say it was delivered",
} as const;

/** The unheard envoy's request: where he stands, how long, and what each choice costs and wins. */
export function unheardText(v: UnheardView): string {
  const sb = new Sb();
  sb.appendLine(
    `It is season ${v.turn}. You are an envoy of ${land(v.lord)} at the court of ${land(v.host)}, and nobody there understands you: neither its king nor any servant of his shares a language with you well enough yet. You have waited ${v.waited} season${v.waited === 1 ? "" : "s"}.`,
  );
  sb.appendLine(
    `You speak: ${v.tongues.length > 0 ? v.tongues.join(", ") : "nothing anyone here speaks"}. The court speaks ${v.courtTongue}.`,
  );
  sb.appendLine(
    v.presented > 0
      ? `You presented the gifts you carried, ${v.presented} shekels: they were all the court could understand.`
      : "You brought no gifts to present.",
  );
  if (v.goBetweens.length > 0)
    sb.appendLine(
      `Go-betweens at this court, each asking a price for a message he carries across (none could carry yours yet; you hold ${v.purse} shekels): ${v.goBetweens.map((g) => `${g.name} (${g.price} shekels)`).join(", ")}. While you stay, one may succeed, and you pay him only when he does.`,
    );
  sb.appendLine(
    "Each season you stay, you are tried again: anyone here who speaks a language with you may come to understand you, and living here you learn the court's tongue yourself, quickly at first. Staying keeps you from home and from any other work.",
  );
  sb.appendLine(
    "Going home, you tell your king the truth. Or you may go home and tell him his message was delivered: it saves you the waiting, and he may not learn otherwise for a year, until word or the consequences come back.",
  );
  return sb.toString();
}

export function unheardSchema(): ReplySchema {
  return object([
    "choice",
    z
      .enum([Choices.stay, Choices.home, Choices.lie])
      .describe("What you do next season."),
  ]);
}

export function unheardOf(o: JsonObject, v: UnheardView): UnheardChoice {
  const choice =
    o.choice === Choices.home
      ? "home"
      : o.choice === Choices.lie
        ? "lie"
        : "stay";
  return newUnheardChoice({ turn: v.turn, choice });
}

export function unheardSummary(ch: UnheardChoice | null): string {
  return ch === null ? "by its traits" : Choices[ch.choice];
}

/**
 * A go-between (or a servant bridging for his king) in someone else's pay, asked only then ("A go-between for hire"): he
 * passes the envoy's words on to the host as he chooses, softening a threat, inflating an offer or dropping a condition, or
 * faithfully. Anyone present who understands both languages may notice a change.
 */
export function bridgeText(v: BridgeView, clauseLines: string[]): string {
  const sb = new Sb();
  sb.appendLine(
    `It is season ${v.turn}. You are carrying the words of ${v.envoy}, envoy of ${land(v.from)}, to the king of ${land(v.host)}: nobody else here understands them, and only you hear both sides. You are also paid by ${v.paidBy.join(" and ")}.`,
  );
  sb.appendLine(
    v.speech.trim() !== ""
      ? `The envoy said: "${v.speech}"`
      : "The envoy spoke only in the terms below.",
  );
  if (clauseLines.length > 0) {
    sb.appendLine("His terms, numbered:");
    clauseLines.forEach((l, i) => sb.appendLine(`${i + 1}. ${l}`));
  }
  sb.appendLine(
    "Pass them on as you choose: word for word, or softened, inflated, or with a condition left out. Anyone at this court who understands both languages may notice a change and tell the king; otherwise the envoy's king learns only when the consequences come back.",
  );
  return sb.toString();
}

export function bridgeSchema(): ReplySchema {
  return object(
    [
      "words",
      z
        .string()
        .describe(
          "The envoy's words as you pass them on to the king (repeat them to pass them on as spoken).",
        ),
    ],
    [
      "leave_out",
      z
        .array(z.int())
        .describe(
          "The numbers of the terms you leave out; empty to pass them all on.",
        ),
    ],
  );
}

export function bridgeOf(
  o: JsonObject,
  v: BridgeView,
): { text: string; clauses: Clause[] } {
  const out = Array.isArray(o.leave_out)
    ? new Set(
        o.leave_out
          .filter((x): x is number => typeof x === "number")
          .map((x) => Math.trunc(x) - 1),
      )
    : new Set<number>();
  return {
    text: typeof o.words === "string" ? o.words : v.speech,
    clauses: v.clauses.filter((_, i) => !out.has(i)).map((x) => ({ ...x })),
  };
}
