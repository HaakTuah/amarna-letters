/**
 * The letter formula between Great Kings. The engine renders the standard greeting from sender and recipient; a leader
 * may deviate on purpose (omit it, put its own name first, withhold "brother" or "Great King"). Because the greeting
 * travels sealed, the envoy cannot alter it.
 */
import { isBlank, trim, trimEnd } from "../core/text.ts";
import { claimantsOf, claimedName, house, isGreatKing, king, kingFor, knownName, ownLand, type Power } from "../model/power.ts";
import { newGreetingOptions, type GreetingOptions } from "../model/records.ts";

export function renderGreeting(from: Power, to: Power, options: GreetingOptions | null): string {
  const o = options ?? newGreetingOptions();
  if (!isBlank(o.custom)) return cap(trim(o.custom!), 400);
  if (o.omit) return "";

  // Item 17+: the recipient by the name he claims, or by his house where the sender withholds a contested name; the sender
  // by the name he claims.
  // The recipient as the sender knows his claim, from the greetings the sender's court has read.
  const known = knownName(from, to);
  const recipient = greetingName(to, from, o.grantGreatKing, o.byHouse === true && claimantsOf(known, from).length > 1 ? house(to) : known) + (o.callBrother ? ", my brother" : "");
  const sender = greetingName(from, null, o.claimGreatKing, claimedName(from)) + (o.callBrother ? ", your brother" : "");
  const address = o.senderFirst ? `Thus says ${sender}: say to ${recipient}.` : `Say to ${recipient}: thus says ${sender}.`;
  const wellbeing = o.callBrother
    ? "All goes well with me. May all go well with you, your household, your wives, your sons, your chariots, your horses and your country."
    : "All goes well with me. May all go well with you.";
  return `${address} ${wellbeing}`;
}

/** `viewer`: the court naming him, which knows the king it last heard of (item 17b); null for a sender naming himself. */
function greetingName(p: Power, viewer: Power | null, greatKing: boolean, name: string): string {
  const k = viewer === null ? king(p) : kingFor(viewer, p);
  // A ruler the sources do not name (Alashiya's king, the city-states' and chiefs' of item 11+) is greeted by his title.
  if (k.toLowerCase().startsWith("the ")) return greatKing ? `the Great King of ${name}` : name === ownLand(p) ? k.replace(/^the King/, "the king") : `the king of ${name}`;
  return greatKing ? `${k}, Great King, king of ${name}` : `${k}, king of ${name}`;
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

/**
 * Plain-language list of how a greeting departs from the standard formula. A sender who is not a Great King keeps the
 * custom without "brother" and without the title, so neither is listed for him.
 */
export function deviations(options: GreetingOptions | null, sender: Power | null = null): string[] {
  const great = sender === null || isGreatKing(sender);
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
  if (!o.callBrother && great) list.push('no "brother"');
  if (!o.claimGreatKing && great) list.push("the sender does not claim to be a Great King");
  if (!o.grantGreatKing) list.push("the recipient is not called Great King");
  if (o.byHouse === true) list.push("the recipient is called by his house, not the name he claims");
  return list;
}

/** The C# build's static class Greeting. */
export const Greeting = { render: renderGreeting, cap, stopped, deviations };
