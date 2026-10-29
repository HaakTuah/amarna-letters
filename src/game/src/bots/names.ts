/**
 * Every name a letter may give a king or his land, for the script kings and envoys reading free text: the name the game
 * uses (Babylonia), the land's own name in the letters (Karduniash), the reigning king (Burna-Buriash), his people (the
 * Babylonians) and, for Babylonia, its city; Egypt's king is also Pharaoh, and Alashiya's people are Cypriots. One table
 * for every reader, matched as whole words, ignoring case.
 */
import { AllPowers, adjective, cmpNum, desc, king, land, rx, sortBy, split, type Power } from "@amarna/engine";

function namesOf(p: Power): string[] {
  const k = king(p);
  const all = [p, land(p), k.startsWith("the ") ? k.slice(4) : k, adjective(p), adjective(p) + "s", ...(p === "Egypt" ? ["Pharaoh"] : p === "Babylonia" ? ["Babylon"] : p === "Alashiya" ? ["Cypriot", "Cypriots"] : [])];
  const out: string[] = [];
  for (const n of all) if (!out.some((x) => x.toUpperCase() === n.toUpperCase())) out.push(n);
  return out;
}

/**
 * Built on first use for each power, by its names: a power risen in play (item 13+) is known only once it rises, and the
 * same name may rise under another ruler in another game.
 */
export function cached<T>(make: (p: Power) => T): (p: Power) => T {
  const memo = new Map<string, T>();
  return (p) => {
    const key = `${p}|${king(p)}`;
    let v = memo.get(key);
    if (v === undefined) memo.set(key, (v = make(p)));
    return v;
  };
}

const table = cached(namesOf);

/** A text escaped for a pattern (the syntax characters only, as the u flag requires). */
export function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A name as a pattern: any run of spaces between its words. */
function phrase(name: string): string {
  return split(name, " ", true).map(escapeRx).join("\\s+");
}

function alternatives(p: Power): string {
  return sortBy(table(p), [(n: string) => n.length, desc(cmpNum)])
    .map(phrase)
    .join("|");
}

const named = cached((p) => rx(`(?<![\\w-])(?:${alternatives(p)})(?![\\w-])`, "i"));

// "against Hatti", "Against the Hittites", "against the king of Hatti", "against Babylon".
const against = cached((p) =>
  rx(`\\bagainst\\s+(?:the\\s+)?(?:(?:king|land|house|people|armies|troops)\\s+of\\s+(?:the\\s+)?)?(?:${alternatives(p)})(?![\\w-])`, "i"),
);

export const Names = {
  /** The names a king and his land go by. */
  of(p: Power): readonly string[] {
    return table(p);
  },
  /** His names as alternatives for a pattern (longest first, any run of spaces between words), with no edges of its own. */
  pattern(p: Power): string {
    return alternatives(p);
  },
  /** Whether a text names this king, his land or his people. */
  mentions(text: string, p: Power): boolean {
    return named(p).test(text);
  },
  /** Whether a text stands "against" this king, by any of his names. */
  swornAgainst(text: string, p: Power): boolean {
    return against(p).test(text);
  },
  /** The first king, in the fixed order of the powers and leaving out those given, whom a text stands against. */
  swornAgainstAny(text: string, except: Iterable<Power>): Power | null {
    const skip = new Set(except);
    return AllPowers.find((x) => !skip.has(x) && against(x).test(text)) ?? null;
  },
  /** Whether a text names a place (a province's name), as whole words, ignoring case. */
  mentionsPlace(text: string, name: string): boolean {
    return rx(`(?<![\\w-])${phrase(name)}(?![\\w-])`, "i").test(text);
  },
};
