/**
 * The template narrator's words for the threads to watch (item 17+++, part F): each thread worded from its own facts
 * alone, naming powers as the eyes it was found for name them, and adding nothing the engine did not release.
 */
import { WorldMap, asSeenBy, findCharacter, land, nameKnownAt, type GameState, type Power } from "@amarna/engine";
import type { Thread } from "../threads.ts";

const place = (id: string): string => WorldMap.default.find(id)?.name ?? id;
/** A capital is on every court's map: naming one gives nothing away. */
const capitalOf = (p: string): string | null => {
  try {
    return WorldMap.default.capital(p).id;
  } catch {
    return null;
  }
};

/** "300 shekels and a tablet to be sealed", "a tablet to be sealed", or "" when he carries neither. */
function carried(t: Thread): string {
  const gold = t.gold > 0 ? `${t.gold} shekels` : "";
  const tablet = t.tablet ? "a tablet to be sealed" : "";
  return [gold, tablet].filter((x) => x !== "").join(" and ");
}

function siege(t: Thread, own: Power | null): string {
  const city = place(t.province);
  const capital = t.to !== "" && capitalOf(t.to) === t.province;
  const held = capital ? `${city}, ${land(t.to)}'s capital` : city;
  if (own !== null && t.to === own)
    return t.soon ? `Your city of ${held} may fall next season: ${land(t.from)}'s siege has worn it nearly through.` : `${land(t.from)}'s army lies before your city of ${held}.`;
  if (own !== null && t.from === own)
    return t.soon ? `${held} may fall to your army next season; its walls are nearly worn through.` : `Your army lies before ${held}${t.to !== "" ? `, a city of ${land(t.to)}` : ""}.`;
  const holder = t.to !== "" && !capital ? ` (${land(t.to)})` : "";
  return t.soon ? `${held}${holder} may fall to ${land(t.from)} next season.` : `${land(t.from)} besieges ${held}${holder}.`;
}

function envoy(t: Thread, who: string, own: Power | null): string {
  const goods = carried(t);
  if (own !== null)
    return `${who} is away with your letter to ${land(t.to)}${goods !== "" ? `, carrying ${goods}` : ""}; no word from him yet.`;
  const road = `${who}, envoy of ${land(t.from)}, is on the road to ${land(t.to)}${goods !== "" ? ` with ${goods}` : ""}.`;
  return t.power !== "" ? `${road} He is in ${land(t.power)}'s pay.` : road;
}

function rising(t: Thread, who: string): string {
  const where = place(t.province);
  return `The people of ${where} would follow ${who} against ${t.to !== "" ? land(t.to) : "their masters"}: a rising may break out next season.`;
}

/** The key a thread's person is named under: each court knows a man by its own name for him, god view by his true one. */
export const nameKey = (t: Pick<Thread, "court" | "person">): string => `${t.court}/${t.person}`;

/** The names the threads' people go by, each as its thread's court knows him (a false name it was given stands), from the season's state. */
export function threadNames(s: GameState, threads: readonly Thread[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of threads) {
    const c = t.person === "" ? null : findCharacter(s, t.person);
    if (c) out[nameKey(t)] = t.court === "" ? c.name : nameKnownAt(c, t.court as Power);
  }
  return out;
}

/** One thread's words; `names` gives the people it follows, keyed by `nameKey`. */
export function threadWords(t: Thread, names: Readonly<Record<string, string>>): string {
  const own = t.court === "" ? null : t.court;
  const who = names[nameKey(t)] || (t.kind === "envoy" ? "An envoy" : "a man");
  return asSeenBy(own, () => (t.kind === "siege" ? siege(t, own) : t.kind === "envoy" ? envoy(t, who, own) : t.kind === "rising" ? rising(t, who) : ""));
}
