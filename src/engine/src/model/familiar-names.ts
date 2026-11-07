/**
 * The other names a player may choose to see ("History, search and names" under Interface, "Places by their own names"
 * under World; build order item 17+++b). By default places take their period names and the Great Kings' realms the names
 * people know; two settings in the web app show places by the names a modern reader knows them by, and the realms by the
 * names their own letters used. Every other realm is named by its land or city, a place, so its name follows the places'
 * setting. Presentation only: requests to models, seat views and the engine's logs keep the names as they are.
 */
import type { FixedPower } from "./power.ts";

/**
 * Each place by the name a modern reader knows it by, where that differs from its period name: the classical, biblical
 * or modern name (Byblos for Gubla, Thebes for Waset, Kirkuk for Arrapha), never a description. A place whose period name
 * is the one readers know (Hattusa, Ugarit, Qatna) is not listed. Its fuller modern name, with the site today, stays on the
 * province card's second line (`ModernNames`).
 */
export const FamiliarPlaceNames: ReadonlyMap<string, string> = new Map<string, string>([
  ["apasa", "Ephesus"],
  ["tuwanuwa", "Tyana"],
  ["nesa", "Kanesh"],
  ["kizzuwatna", "Cilicia"],
  ["nineveh", "Nineveh"],
  ["arbela", "Erbil"],
  ["ekallate", "Ekallatum"],
  ["babylon", "Babylon"],
  ["ur", "Ur"],
  ["dilmun", "Bahrain"],
  ["delta", "the Nile Delta"],
  ["sinai", "the north Sinai"],
  ["memphis", "Memphis"],
  ["akhetaten", "Amarna"],
  ["thebes", "Thebes"],
  ["nubia", "Nubia"],
  ["kalavasos", "Kalavasos"],
  ["carchemish", "Carchemish"],
  ["aleppo", "Aleppo"],
  ["qadesh", "Kadesh"],
  ["sumur", "Simyra"],
  ["arwad", "Arwad"],
  ["byblos", "Byblos"],
  ["beirut", "Beirut"],
  ["sidon", "Sidon"],
  ["damascus", "Damascus"],
  ["tyre", "Tyre"],
  ["megiddo", "Megiddo"],
  ["shechem", "Shechem"],
  ["jerusalem", "Jerusalem"],
  ["akko", "Acre"],
  ["hazor", "Hazor"],
  ["gezer", "Gezer"],
  ["ashkelon", "Ashkelon"],
  ["lachish", "Lachish"],
  ["gath", "Gath"],
  ["aijalon", "Aijalon"],
  ["pella", "Pella"],
  ["ashtaroth", "Ashtaroth"],
  ["gaza", "Gaza"],
  ["arrapha", "Kirkuk"],
  ["susa", "Susa"],
  ["lukka", "Lycia"],
  ["steppe", "the Syrian desert"],
  ["libya", "Libya"],
  ["shasu", "Edom"],
  ["westsea", "the Mediterranean"],
  ["gulf", "the Persian Gulf"],
  ["redsea", "the Red Sea"],
]);

/**
 * The Great Kings' realms by the names their own letters used, where those differ from the names people know: each
 * checked against the geography dossier ("The Great Kings' realms by their period names").
 */
export const PeriodRealmNames: ReadonlyMap<FixedPower, { name: string; anchor: string }> = new Map<FixedPower, { name: string; anchor: string }>([
  ["Egypt", { name: "Miṣri", anchor: "02-misri" }],
  ["Babylonia", { name: "Karduniash", anchor: "02-karduniash" }],
  ["Assyria", { name: "Aššur", anchor: "02-assur" }],
]);
