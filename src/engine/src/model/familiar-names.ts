/**
 * The other names a player may choose to see ("History, search and names" under Interface, "Places by their own names"
 * under World; build order item 17+++b). By default places take their period names and the Great Kings' realms the names
 * people know; two settings in the web app show places by the names a modern reader knows them by, and the realms by the
 * names their own letters used. Every other realm is named by its land or city, a place, so its name follows the places'
 * setting. Presentation only: requests to models, seat views and the engine's logs keep the names as they are.
 */
import { ModernNames, WorldMap } from "./map.ts";
import type { FixedPower } from "./power.ts";

/**
 * Where the name a modern reader knows a place by is not its modern name's first words ({@link ModernNames}, before any
 * parenthesis): a name readers know better than the site's (Kanesh, not Kültepe; Kadesh, not Tell Nebi Mend), or null
 * where the period name is the one readers know (Hattusa, not Boğazkale; Ugarit, not Ras Shamra) or the modern one is a
 * description (the Gediz valley) or a village chosen for a site (Kalavasos, for Tamassos).
 */
const Familiar: ReadonlyMap<string, string | null> = new Map<string, string | null>([
  ["seha", null],
  ["mira", null],
  ["hattusa", null],
  ["sapinuwa", null],
  ["samuha", null],
  ["harran", null],
  ["washukanni", null],
  ["taidu", null],
  ["terqa", null],
  ["ashur", null],
  ["sippar", null],
  ["durkurigalzu", null],
  ["nippur", null],
  ["isuwa", null],
  ["azzi", null],
  ["alalakh", null],
  ["ugarit", null],
  ["nuhashshe", null],
  ["niya", null],
  ["tunip", null],
  ["qatna", null],
  ["amurru", null],
  ["suhu", null],
  ["kaska", null],
  ["kalavasos", null],
  ["nesa", "Kanesh"],
  ["ekallate", "Ekallatum"],
  ["qadesh", "Kadesh"],
  ["sumur", "Simyra"],
  ["aijalon", "Aijalon"],
  ["ashtaroth", "Ashtaroth"],
  ["shasu", "Edom"],
  ["westsea", "the Mediterranean"],
  ["gulf", "the Persian Gulf"],
  ["redsea", "the Red Sea"],
]);

/**
 * Each place by the name a modern reader knows it by, where that differs from its period name: the classical, biblical
 * or modern name (Byblos for Gubla, Thebes for Waset, Kirkuk for Arrapha), never a description. Its fuller modern name,
 * with the site today, stays on the province card's second line ({@link ModernNames}).
 */
export const FamiliarPlaceNames: ReadonlyMap<string, string> = new Map(
  WorldMap.default.provinces.flatMap((p): [string, string][] => {
    const name = Familiar.has(p.id) ? Familiar.get(p.id)! : (ModernNames.get(p.id)?.split(" (")[0] ?? null);
    return name !== null && name !== p.name ? [[p.id, name]] : [];
  }),
);

/**
 * The Great Kings' realms by the names their own letters used, where those differ from the names people know: each
 * checked against the geography dossier ("The Great Kings' realms by their period names").
 */
export const PeriodRealmNames: ReadonlyMap<FixedPower, { name: string; anchor: string }> = new Map<FixedPower, { name: string; anchor: string }>([
  ["Egypt", { name: "Miṣri", anchor: "02-misri" }],
  ["Babylonia", { name: "Karduniash", anchor: "02-karduniash" }],
  ["Assyria", { name: "Aššur", anchor: "02-assur" }],
]);
