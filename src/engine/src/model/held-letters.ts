/**
 * A caught offer is a thing held (#592, the owner's yes, 3 November 2026: "Agreed to all, expertly!"; after #553 and
 * #543). Whoever catches the carrier of a province's offer (a traveller taken captive on the road, or a caravan his troops
 * take) reads it and holds it: he may send it on to its claimant, a favour he can trade on; send it to the land's king,
 * who learns his people's own words; ask either of them a price for it; or keep it back. It stands only while the
 * province's people lean the claimant's way ("No menus": the lever is a thing held, not a button). An asking binds: the
 * letter is kept for that king until he buys it, and nobody learns of anything that befalls it but by word of it.
 */
import { I, type ObjSchema, S, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";

export interface HeldLetter {
  /** The province whose people wrote it, and the power they wrote to. */
  province: string;
  claimant: Power;
  /** Their own words (`offerWords`), as written. */
  words: string;
  /** The court that holds it, and since when. */
  heldBy: Power;
  since: number;
  /** The season its people wrote it (its offer's `departTurn`): sent on, it stands only for the declaration of then. */
  written: number;
  /** The season word of the taking reaches the holder's court: from then he knows he holds it. */
  known: number;
  /** Offered for sale: to whom, for how much, and the season word of the asking reaches him. Null while kept. */
  askedOf: Power | null;
  price: number;
  askKnown: number | null;
  /** The season its buyer paid: the letter goes to him once his gold reaches the holder (a `LetterPrice` journey). */
  bought: number | null;
}

export function newHeldLetter(init: Partial<HeldLetter> = {}): HeldLetter {
  return { province: "", claimant: "Egypt", words: "", heldBy: "Egypt", since: 0, written: 0, known: 0, askedOf: null, price: 0, askKnown: null, bought: null, ...init };
}

export const HeldLetterSchema: ObjSchema<HeldLetter> = obj("HeldLetter", newHeldLetter, { province: S, claimant: S, words: S, heldBy: S, since: I, written: I, known: I, askedOf: opt(S), price: I, askKnown: opt(I), bought: opt(I) });

/** What its holder may do with it: send it on (to the claimant or the land's king), or ask one of them a price. */
export const LetterFateValues = ["Send", "Sell"] as const;
export type LetterFate = (typeof LetterFateValues)[number];
