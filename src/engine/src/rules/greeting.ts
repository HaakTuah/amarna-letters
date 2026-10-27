/**
 * The letter formula between Great Kings. The engine renders the standard greeting from sender and recipient; a leader
 * may deviate on purpose (omit it, put its own name first, withhold "brother" or "Great King"). Because the greeting
 * travels sealed, the envoy cannot alter it.
 */
import { isBlank, trim, trimEnd } from "../core/text.ts";
import { king, land, type Power } from "../model/power.ts";
import { newGreetingOptions, type GreetingOptions } from "../model/records.ts";

export function renderGreeting(from: Power, to: Power, options: GreetingOptions | null): string {
  const o = options ?? newGreetingOptions();
  if (!isBlank(o.custom)) return cap(trim(o.custom!), 400);
  if (o.omit) return "";

  const recipient = greetingName(to, o.grantGreatKing) + (o.callBrother ? ", my brother" : "");
  const sender = greetingName(from, o.claimGreatKing) + (o.callBrother ? ", your brother" : "");
  const address = o.senderFirst ? `Thus says ${sender}: say to ${recipient}.` : `Say to ${recipient}: thus says ${sender}.`;
  const wellbeing = o.callBrother
    ? "All goes well with me. May all go well with you, your household, your wives, your sons, your chariots, your horses and your country."
    : "All goes well with me. May all go well with you.";
  return `${address} ${wellbeing}`;
}

function greetingName(p: Power, greatKing: boolean): string {
  if (p === "Alashiya") return greatKing ? "the Great King of Alashiya" : "the king of Alashiya";
  return greatKing ? `${king(p)}, Great King, king of ${land(p)}` : `${king(p)}, king of ${land(p)}`;
}

/** A text cut to `max` characters, marked "…" when cut. */
export function cap(s: string, max: number): string {
  return s.length <= max ? s : trimEnd(s.slice(0, max)) + "…";
}

/**
 * A text ending a sentence: with a full stop added unless it already ends with one (or "!", "?" or "…"), so that a
 * mandate written with its own full stop is not remembered with two.
 */
export function stopped(s: string): string {
  const t = trimEnd(s);
  return t.length > 0 && ".!?…".includes(t[t.length - 1]) ? t : t + ".";
}

/** Plain-language list of how a greeting departs from the standard formula. */
export function deviations(options: GreetingOptions | null): string[] {
  const o = options ?? newGreetingOptions();
  const list: string[] = [];
  if (!isBlank(o.custom)) {
    list.push("a greeting of their own wording");
    return list;
  }
  if (o.omit) {
    list.push("no greeting at all");
    return list;
  }
  if (o.senderFirst) list.push("the sender's name first");
  if (!o.callBrother) list.push('no "brother"');
  if (!o.claimGreatKing) list.push("the sender does not claim to be a Great King");
  if (!o.grantGreatKing) list.push("the recipient is not called Great King");
  return list;
}

/** The C# build's static class Greeting. */
export const Greeting = { render: renderGreeting, cap, stopped, deviations };
